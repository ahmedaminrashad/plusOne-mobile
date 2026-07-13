import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera } from 'react-native-camera-kit';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { useParseQrBillMutation } from '../../store/api/billsApi';
import { PrefilledBillData } from '../../types/models';

type Props = AppScreenProps<'QRScanner'>;

function QRScannerScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const { groupId, groupName } = route.params;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [parsing, setParsing] = useState(false);
  const scannedRef = useRef(false);
  const [parseQr] = useParseQrBillMutation();

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: t('qrScanner.permissionTitle'),
            message: t('qrScanner.permissionMessage'),
            buttonPositive: t('common:ok'),
            buttonNegative: t('common:cancel'),
          },
        );
        const granted = result === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(granted);
        if (!granted) handlePermissionDenied();
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  const handlePermissionDenied = useCallback(() => {
    Alert.alert(
      t('qrScanner.permissionDeniedTitle'),
      t('qrScanner.permissionDeniedMessage'),
      [
        { text: t('qrScanner.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
        { text: t('common:cancel'), onPress: () => navigation.goBack() },
      ],
    );
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
            service: result.bill.service,
            serviceType: result.bill.serviceType,
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

  const handleTestEta = useCallback(
    () => handlePayload(
      'https://invoicing.eta.gov.eg/receipts/search/ff700ca9ac9eeb3f4d2e19b4726bceb23eb1761ae861a8546fdc2a3481437aa9/share/2026-07-11T00:01:42Z',
    ),
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
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>{t('qrScanner.permissionRequiredTitle')}</Text>
        <Text style={styles.permSub}>{t('qrScanner.permissionRequiredSub')}</Text>
        <TouchableOpacity style={styles.manualBtn} onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
          <Text style={styles.manualBtnText}>{t('qrScanner.manualEntryButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('common:back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        scanBarcode
        onReadCode={handleReadCode}
        showFrame
        laserColor="transparent"
        frameColor={Colors.primary}
      />

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {parsing ? (
            <>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.parsingText}>{t('qrScanner.analyzingText')}</Text>
            </>
          ) : (
            <Text style={styles.hint}>{t('qrScanner.scanHint')}</Text>
          )}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestEta}
            disabled={parsing}
            activeOpacity={0.75}>
            <Text style={styles.testBtnText}>{t('qrScanner.testEtaButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
            <Text style={styles.manualEntryText}>{t('qrScanner.manualEntryButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>{t('common:cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default memo(QRScannerScreen);

const WINDOW = 240;
const CORNER = 24;
const THICKNESS = 3;

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
  permIcon: { fontSize: 52 },
  permTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  permSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  manualBtn: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  manualBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  backBtn: { paddingHorizontal: 32, paddingVertical: 12 },
  backBtnText: { color: Colors.textSecondary, fontSize: 15 },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { height: WINDOW, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 28, gap: 16 },
  scanWindow: { width: WINDOW, height: WINDOW },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: Colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS },
  hint: { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, opacity: 0.9 },
  parsingText: { color: '#fff', fontSize: 14, opacity: 0.9 },
  testBtn: {
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.75)',
  },
  testBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  manualEntryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  manualEntryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
