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
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';

type Props = AppScreenProps<'QRScanner'>;

function QRScannerScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params;
  const [hasPermission, setHasPermission] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'إذن الكاميرا',
            message: 'تحتاج التطبيق إذن الكاميرا لمسح رمز QR من الإيصال',
            buttonPositive: 'موافق',
            buttonNegative: 'إلغاء',
          },
        );
        setHasPermission(result === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setHasPermission(true);
      }
    })();
  }, []);

  const loadDummy = useCallback(() => {
    const dummy = JSON.stringify({
      storeName: 'مطعم التجريبي',
      items: [
        { id: '1', name: 'برغر كلاسيك', price: 35, qty: 2 },
        { id: '2', name: 'بيتزا مارغريتا', price: 55, qty: 1 },
        { id: '3', name: 'عصير برتقال', price: 15, qty: 3 },
        { id: '4', name: 'سلطة سيزر', price: 28, qty: 1 },
        { id: '5', name: 'آيس كريم', price: 18, qty: 2 },
      ],
    });
    navigation.replace('ReceiptSplit', { groupId, groupName, receiptJson: dummy });
  }, [groupId, groupName, navigation]);

  const handleReadCode = useCallback(
    (event: any) => {
      if (scannedRef.current) return;
      scannedRef.current = true;

      const code: string = event.nativeEvent.codeStringValue;

      try {
        const parsed = JSON.parse(code);
        if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
          throw new Error('missing items');
        }
        navigation.replace('ReceiptSplit', { groupId, groupName, receiptJson: code });
      } catch {
        Alert.alert(
          'رمز QR غير صالح',
          'هذا الرمز لا يحتوي على بيانات إيصال صحيحة',
          [{ text: 'حاول مرة أخرى', onPress: () => { scannedRef.current = false; } }],
        );
      }
    },
    [groupId, groupName, navigation],
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>يلزم إذن الكاميرا</Text>
        <Text style={styles.permSub}>اسمح للتطبيق باستخدام الكاميرا لمسح الإيصالات</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>رجوع</Text>
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

      {/* Dark overlay corners */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.hint}>وجّه الكاميرا نحو رمز QR الموجود على الإيصال</Text>
          <TouchableOpacity style={styles.dummyBtn} onPress={loadDummy}>
            <Text style={styles.dummyText}>Load Dummy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>إلغاء</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12, padding: 32 },
  permIcon: { fontSize: 52 },
  permTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  permSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  backBtn: { marginTop: 12, paddingHorizontal: 32, paddingVertical: 14, backgroundColor: Colors.primary, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { height: WINDOW, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 28, gap: 20 },

  scanWindow: { width: WINDOW, height: WINDOW },

  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: Colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS },

  hint: { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, opacity: 0.9 },
  dummyBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.primary },
  dummyText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 40, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
