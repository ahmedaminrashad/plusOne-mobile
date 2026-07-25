import React, { useState, useCallback, useRef, memo } from 'react';
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
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchCamera } from 'react-native-image-picker';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { API_BASE_URL } from '../../config';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { PrefilledBillData } from '../../types/models';

type Props = AppScreenProps<'OCRCapture'>;

function OCRCaptureScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName } = route.params;
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: t('ocrCapture.permissionTitle'),
        message: t('ocrCapture.permissionMessage'),
        buttonPositive: t('common:ok'),
        buttonNegative: t('common:cancel'),
      },
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        t('ocrCapture.permissionDeniedTitle'),
        t('ocrCapture.permissionDeniedMessage'),
        [
          { text: t('ocrCapture.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
          { text: t('common:cancel'), onPress: () => navigation.goBack() },
        ],
      );
      return false;
    }
    return true;
  }, [navigation, groupId, groupName, t]);

  const handleCapture = useCallback(async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;

    launchCamera(
      { mediaType: 'photo', quality: 1.0, includeBase64: false },
      (response) => {
        if (response.errorCode) {
          Alert.alert(t('common:error'), t('ocrCapture.cameraOpenFailed'));
          return;
        }
        if (response.assets?.[0]?.uri) {
          setCapturedUri(response.assets[0].uri);
        }
      },
    );
  }, [requestCameraPermission]);

  const handleProcess = useCallback(async () => {
    if (!capturedUri) return;
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: capturedUri,
        type: 'image/jpeg',
        name: 'receipt.jpg',
      } as any);

      const res = await fetch(`${API_BASE_URL}/bills/group/${groupId}/parse-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.bill) {
        const prefilledData: PrefilledBillData = {
          venueName: data.bill.venueName,
          lineItems: data.bill.lineItems,
          tax: data.bill.tax,
          taxType: data.bill.taxType,
          service: data.bill.service,
          serviceType: data.bill.serviceType,
          captureMethod: 'ocr',
          sourceRef: data.bill.sourceRef,
        };
        navigation.replace('AddBill', { groupId, groupName, prefilledData });
        return;
      }

      // OCR service not configured or failed — go to manual
      Alert.alert(
        t('ocrCapture.processFailedTitle'),
        data.reason === 'OCR service not configured'
          ? t('ocrCapture.ocrNotConfiguredMessage')
          : t('ocrCapture.ocrReadFailedMessage'),
        [
          { text: t('ocrCapture.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
          { text: t('common:retry'), onPress: () => { setCapturedUri(null); } },
        ],
      );
    } catch {
      Alert.alert(
        t('ocrCapture.connectionFailedTitle'),
        t('ocrCapture.connectionFailedMessage'),
        [
          { text: t('ocrCapture.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
          { text: t('common:retry'), onPress: () => { setCapturedUri(null); } },
        ],
      );
    } finally {
      setProcessing(false);
    }
  }, [capturedUri, groupId, groupName, accessToken, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      {capturedUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewActions}>
            {processing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[typography.bodyLarge, styles.processingText]}>{t('ocrCapture.processingText')}</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleProcess}>
                  <Text style={[typography.labelLarge, styles.primaryBtnText]}>{t('ocrCapture.processButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCapturedUri(null)}>
                  <Text style={[typography.labelLarge, styles.secondaryBtnText]}>{t('ocrCapture.retakePhotoButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
                  <Text style={[typography.labelLarge, styles.linkBtnText]}>{t('ocrCapture.manualEntryButton')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.captureContainer}>
          <View style={styles.guideFrame}>
            <View style={[styles.guideCorner, styles.guideTL]} />
            <View style={[styles.guideCorner, styles.guideTR]} />
            <View style={[styles.guideCorner, styles.guideBL]} />
            <View style={[styles.guideCorner, styles.guideBR]} />
            <Text style={[typography.bodySmall, styles.guideHint]}>{t('ocrCapture.guideHint')}</Text>
          </View>
          <View style={styles.captureActions}>
            <Text style={[typography.headingLarge, styles.captureTitle]}>{t('ocrCapture.captureTitle')}</Text>
            <Text style={[typography.bodyLarge, styles.captureSub]}>
              {t('ocrCapture.captureSubtitle')}
            </Text>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
              <Text style={[typography.labelLarge, styles.captureBtnText]}>{t('ocrCapture.captureButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
              <Text style={[typography.labelLarge, styles.linkBtnText]}>{t('ocrCapture.manualEntryButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(OCRCaptureScreen);

const CORNER_SIZE = 24;
const CORNER_W = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  captureContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  guideFrame: {
    width: 280,
    height: 380,
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCorner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Colors.accent },
  guideTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  guideTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  guideBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  guideBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  guideHint: { color: Colors.textMuted, textAlign: 'center' },

  captureActions: { alignItems: 'center', gap: 12, width: '100%' },
  captureTitle: { color: Colors.text },
  captureSub: { color: Colors.textSecondary, textAlign: 'center' },
  captureBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureBtnText: { color: '#fff' },

  previewContainer: { flex: 1 },
  previewImage: { flex: 1, backgroundColor: '#000' },
  previewActions: {
    backgroundColor: Colors.surface,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  processingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 12 },
  processingText: { color: Colors.textSecondary },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff' },
  secondaryBtn: {
    borderRadius: Radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryBtnText: { color: Colors.text },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkBtnText: { color: Colors.primary },
});
