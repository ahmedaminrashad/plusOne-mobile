import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useParseReceiptBillMutation } from '../../store/api/billsApi';
import { PrefilledBillData } from '../../types/models';
import { requestCameraPermission } from '../../utils/cameraPermission';

type Props = AppScreenProps<'OCRCapture'>;

type CapturedImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

function OCRCaptureScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName } = route.params;
  const [captured, setCaptured] = useState<CapturedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [parseReceipt] = useParseReceiptBillMutation();

  const applyAsset = useCallback((asset?: Asset) => {
    if (!asset?.uri) return;
    setCaptured({
      uri: asset.uri,
      fileName: asset.fileName ?? 'receipt.jpg',
      mimeType: asset.type ?? 'image/jpeg',
    });
  }, []);

  const requestCameraPermissionLocal = useCallback(async (): Promise<boolean> => {
    return requestCameraPermission({
      title: t('ocrCapture.permissionTitle'),
      message: t('ocrCapture.permissionMessage'),
      ok: t('common:ok'),
      cancel: t('common:cancel'),
      deniedTitle: t('ocrCapture.permissionDeniedTitle'),
      deniedMessage: t('ocrCapture.permissionDeniedMessage'),
      manualEntryLabel: t('ocrCapture.manualEntryButton'),
      onManualEntry: () => navigation.replace('AddBill', { groupId, groupName }),
    });
  }, [navigation, groupId, groupName, t]);

  const handleCapture = useCallback(async () => {
    const ok = await requestCameraPermissionLocal();
    if (!ok) return;

    launchCamera(
      { mediaType: 'photo', quality: 1.0, includeBase64: false },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('common:error'), t('ocrCapture.cameraOpenFailed'));
          return;
        }
        applyAsset(response.assets?.[0]);
      },
    );
  }, [requestCameraPermission, applyAsset, t]);

  const handlePickGallery = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 1.0, selectionLimit: 1, includeBase64: false },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('common:error'), t('ocrCapture.galleryOpenFailed'));
          return;
        }
        applyAsset(response.assets?.[0]);
      },
    );
  }, [applyAsset, t]);

  const handleProcess = useCallback(async () => {
    if (!captured) return;
    setProcessing(true);

    try {
      const result = await parseReceipt({
        groupId,
        uri: captured.uri,
        fileName: captured.fileName ?? 'receipt.jpg',
        mimeType: captured.mimeType ?? 'image/jpeg',
      }).unwrap();

      if (result.success && result.bill) {
        const prefilledData: PrefilledBillData = {
          venueName: result.bill.venueName,
          lineItems: result.bill.lineItems,
          tax: result.bill.tax,
          taxType: result.bill.taxType,
          delivery: result.bill.delivery,
          deliveryType: result.bill.deliveryType,
          captureMethod: 'ocr',
          sourceRef: result.bill.sourceRef,
        };
        navigation.replace('AddBill', { groupId, groupName, prefilledData });
        return;
      }

      const message =
        result.reason?.toLowerCase().includes('not configured')
          ? t('ocrCapture.ocrNotConfiguredMessage')
          : t('ocrCapture.ocrReadFailedMessage');

      Alert.alert(t('ocrCapture.processFailedTitle'), message, [
        { text: t('ocrCapture.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
        { text: t('common:retry'), onPress: () => { setCaptured(null); } },
      ]);
    } catch {
      Alert.alert(
        t('ocrCapture.connectionFailedTitle'),
        t('ocrCapture.connectionFailedMessage'),
        [
          { text: t('ocrCapture.manualEntryButton'), onPress: () => navigation.replace('AddBill', { groupId, groupName }) },
          { text: t('common:retry'), onPress: () => { setCaptured(null); } },
        ],
      );
    } finally {
      setProcessing(false);
    }
  }, [captured, groupId, groupName, navigation, parseReceipt, t]);

  return (
    <SafeScreen style={styles.container}>
      {captured ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: captured.uri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.previewActions}>
            {processing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[typography.bodyLarge, styles.processingText]}>
                  {t('ocrCapture.processingText')}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleProcess}>
                  <Text style={[typography.labelLarge, styles.primaryBtnText]}>{t('ocrCapture.processButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCaptured(null)}>
                  <Text style={[typography.labelLarge, styles.secondaryBtnText]}>{t('ocrCapture.chooseAnotherButton')}</Text>
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
            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickGallery}>
              <Text style={[typography.labelLarge, styles.secondaryBtnText]}>{t('ocrCapture.galleryButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.replace('AddBill', { groupId, groupName })}>
              <Text style={[typography.labelLarge, styles.linkBtnText]}>{t('ocrCapture.manualEntryButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeScreen>
  );
}

export default memo(OCRCaptureScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  captureContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  guideFrame: {
    width: 168,
    height: 250,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(224,162,62,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideHint: { color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 12 },
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
    width: '100%',
  },
  secondaryBtnText: { color: Colors.text },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkBtnText: { color: Colors.primary },
});
