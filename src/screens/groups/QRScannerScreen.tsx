import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { Camera } from 'react-native-camera-kit';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useParseQrBillMutation } from '../../store/api/billsApi';
import { PrefilledBillData } from '../../types/models';
import { CameraIcon, ChevronLeftIcon } from '../../components/icons';
import { requestCameraPermission } from '../../utils/cameraPermission';

type Props = AppScreenProps<'QRScanner'>;

function QRScannerScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [parsing, setParsing] = useState(false);
  const [cameraActive, setCameraActive] = useState(AppState.currentState === 'active');
  const scannedRef = useRef(false);
  const [parseQr] = useParseQrBillMutation();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      // Tear down only after we are fully backgrounded. Unmounting the camera
      // on `inactive` (app switcher / opening another app) freezes the phone.
      setCameraActive(state !== 'background');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const granted = await requestCameraPermission({
        title: t('qrScanner.permissionTitle'),
        message: t('qrScanner.permissionMessage'),
        ok: t('common:ok'),
        cancel: t('common:cancel'),
        deniedTitle: t('qrScanner.permissionDeniedTitle'),
        deniedMessage: t('qrScanner.permissionDeniedMessage'),
        manualEntryLabel: t('qrScanner.manualEntryButton'),
        onManualEntry: () => navigation.replace('AddBill', { groupId, groupName }),
      });
      setHasPermission(granted);
    })();
  }, [navigation, groupId, groupName, t]);

  const handlePayload = useCallback(
    async (payload: string) => {
      if (scannedRef.current || parsing) return;
      scannedRef.current = true;
      setParsing(true);

      try {
        const result = await parseQr({ groupId, payload }).unwrap();

        if (result.success && result.bill) {
          const prefilledData: PrefilledBillData = {
            venueName: result.bill.venueName,
            lineItems: result.bill.lineItems,
            tax: result.bill.tax,
            taxType: result.bill.taxType,
            vat: result.bill.vat,
            vatType: result.bill.vatType,
            delivery: result.bill.delivery,
            deliveryType: result.bill.deliveryType,
            grandTotal: result.bill.grandTotal,
            captureMethod: 'qr',
            sourceRef: result.bill.sourceRef,
          };
          navigation.replace('AddBill', { groupId, groupName, prefilledData });
          return;
        }

        if (result.fallback === 'webview' && result.url) {
          Alert.alert(
            t('qrScanner.qrNotRecognizedTitle'),
            t('qrScanner.webviewFallbackMessage'),
            [
              { text: t('qrScanner.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
              { text: t('common:cancel'), onPress: () => { scannedRef.current = false; setParsing(false); } },
            ],
          );
          return;
        }

        // fallback: manual
        Alert.alert(
          t('qrScanner.qrNotRecognizedTitle'),
          result.reason ?? t('qrScanner.invalidQrMessage'),
          [
            { text: t('qrScanner.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
            { text: t('common:retry'), onPress: () => { scannedRef.current = false; setParsing(false); } },
          ],
        );
      } catch {
        Alert.alert(
          t('qrScanner.loadFailedTitle'),
          t('qrScanner.processErrorMessage'),
          [
            { text: t('qrScanner.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
            { text: t('common:retry'), onPress: () => { scannedRef.current = false; setParsing(false); } },
          ],
        );
      }
    },
    [parsing, groupId, groupName, parseQr, navigation, t],
  );

  const handleReadCode = useCallback(
    (event: any) => handlePayload(event.nativeEvent.codeStringValue),
    [handlePayload],
  );

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <SafeScreen style={styles.permissionScreen}>
        <CameraIcon size={50} color={Colors.textMuted} />
        <Text style={[typography.headingMedium, styles.permTitle]}>{t('qrScanner.permissionRequiredTitle')}</Text>
        <Text style={[typography.bodyMedium, styles.permSub]}>{t('qrScanner.permissionRequiredSub')}</Text>
        <TouchableOpacity style={styles.manualBtn} onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
          <Text style={[typography.labelLarge, styles.manualBtnText]}>{t('qrScanner.manualEntryButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[typography.bodyMedium, styles.backBtnText]}>{t('common:back')}</Text>
        </TouchableOpacity>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={styles.container} edges={[]}>
      {cameraActive ? (
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={handleReadCode}
          showFrame={false}
          laserColor="transparent"
          frameColor={Colors.accent}
        />
      ) : null}

      <TouchableOpacity
        style={styles.overlayBackBtn}
        onPress={() => navigation.goBack()}
        hitSlop={12}
        activeOpacity={0.8}>
        <ChevronLeftIcon size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.scanGlowLine} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {parsing ? (
            <>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={[typography.bodyMedium, styles.parsingText]}>{t('qrScanner.analyzingText')}</Text>
            </>
          ) : (
            <Text style={[typography.bodyMedium, styles.hint]}>{t('qrScanner.scanHint')}</Text>
          )}
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={() => navigation.replace('OCRCapture', { groupId, groupName })}>
              <Text style={[typography.labelMedium, styles.pillBtnText]}>{t('qrScanner.photoInsteadButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
              <Text style={[typography.labelMedium, styles.pillBtnText]}>{t('qrScanner.manualEntryButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

export default memo(QRScannerScreen);

const WINDOW = 180;
const CORNER = 34;
const THICKNESS = 3;
const CORNER_RADIUS = 10;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 12,
    padding: 32,
  },
  permTitle: { color: Colors.text },
  permSub: { color: Colors.textSecondary, textAlign: 'center' },
  manualBtn: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  manualBtnText: { color: '#fff' },
  backBtn: { paddingHorizontal: 32, paddingVertical: 12 },
  backBtnText: { color: Colors.textSecondary },
  overlayBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Figma shows a bright, minimal overlay (a subtle white radial highlight, not a
  // darkened mask) — no dimming bars behind the corner brackets/hint/buttons.
  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'column' },
  overlayTop: { flex: 1 },
  overlayMiddle: { height: WINDOW, flexDirection: 'row' },
  overlaySide: { flex: 1 },
  overlayBottom: { flex: 1, alignItems: 'center', paddingTop: 28, gap: 16 },
  scanWindow: { width: WINDOW, height: WINDOW },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: Colors.accent },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS, borderTopLeftRadius: CORNER_RADIUS },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius: CORNER_RADIUS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS, borderBottomLeftRadius: CORNER_RADIUS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: CORNER_RADIUS },
  scanGlowLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: WINDOW / 2 - 1.5,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  hint: { color: Colors.textOnDarkMuted, textAlign: 'center', paddingHorizontal: 32 },
  parsingText: { color: '#fff', opacity: 0.9 },
  testBtn: {
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(224,162,62,0.85)',
  },
  testBtnText: { color: '#fff' },
  pillRow: { flexDirection: 'row', gap: 12 },
  pillBtn: {
    width: 160,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  pillBtnText: { color: '#fff' },
});
