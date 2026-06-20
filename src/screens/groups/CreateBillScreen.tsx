import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Button from '../../components/common/Button';
import { useCreateBillMutation } from '../../store/api/billsApi';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { GroupMember } from '../../types/models';

type Props = AppScreenProps<'AddBill'>;

function CreateBillScreen({ route, navigation }: Props) {
  const { groupId, receiptPhotoUri: initialPhoto } = route.params;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(initialPhoto);
  const [paidByUserId, setPaidByUserId] = useState('');
  const [payerPickerVisible, setPayerPickerVisible] = useState(false);

  const { data: members } = useGetGroupMembersQuery(groupId);
  const { data: me } = useGetMeQuery();
  const [createBill, { isLoading }] = useCreateBillMutation();

  const activeMembers = (members ?? []).filter((m) => m.status === 'active' && m.userId);

  useEffect(() => {
    if (me && !paidByUserId) setPaidByUserId(me.id);
  }, [me, paidByUserId]);

  const payerName =
    activeMembers.find((m) => m.userId === paidByUserId)?.user?.displayName ??
    me?.displayName ??
    'أنا';

  const handlePickPhoto = useCallback(() => {
    Alert.alert('إضافة صورة الإيصال', '', [
      {
        text: '📷 الكاميرا',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
          }),
      },
      {
        text: '🖼 من المعرض',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (res) => {
            if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
          }),
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان الإيصال');
      return;
    }
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!paidByUserId) {
      Alert.alert('خطأ', 'يرجى تحديد من دفع');
      return;
    }
    try {
      await createBill({
        groupId,
        title: title.trim(),
        amount: parsed,
        paidByUserId,
        notes: notes.trim() || undefined,
        receiptPhotoUrl: photoUri,
      }).unwrap();
      navigation.goBack();
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الإيصال، حاول مرة أخرى');
    }
  }, [title, amount, paidByUserId, notes, photoUri, groupId, createBill, navigation]);

  const renderPayer = useCallback(
    ({ item }: { item: GroupMember }) => {
      const name = item.user?.displayName ?? item.pendingPhone ?? 'مستخدم';
      const isSelected = item.userId === paidByUserId;
      return (
        <TouchableOpacity
          style={[styles.payerRow, isSelected && styles.payerRowSelected]}
          onPress={() => { setPaidByUserId(item.userId!); setPayerPickerVisible(false); }}>
          <Text style={[styles.payerName, isSelected && styles.payerNameSelected]}>{name}</Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [paidByUserId],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Receipt photo */}
        <TouchableOpacity
          style={[styles.photoBox, photoUri && styles.photoBoxFilled]}
          onPress={handlePickPhoto}
          activeOpacity={0.8}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickPhoto}>
                <Text style={styles.changePhotoText}>تغيير الصورة</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoLabel}>أضف صورة الإيصال</Text>
              <Text style={styles.photoSub}>اضغط للتصوير أو الاختيار من المعرض</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>عنوان الإيصال *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: عشاء، بنزين، سوبر ماركت..."
          placeholderTextColor={Colors.textMuted}
          textAlign="right"
          returnKeyType="next"
        />

        <Text style={styles.label}>المبلغ (ج.م) *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          textAlign="right"
        />

        <Text style={styles.label}>من دفع؟ *</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setPayerPickerVisible(true)}>
          <Text style={styles.pickerArrow}>▼</Text>
          <Text style={styles.pickerText}>{payerName}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>ملاحظات</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="أي تفاصيل إضافية..."
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlign="right"
        />

        <Button
          title="حفظ الإيصال"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitBtn}
        />
      </ScrollView>

      <Modal
        visible={payerPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayerPickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPayerPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>من دفع؟</Text>
            <FlatList
              data={activeMembers}
              keyExtractor={(m) => m.id}
              renderItem={renderPayer}
              scrollEnabled={activeMembers.length > 6}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(CreateBillScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  photoBox: {
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: Colors.primary },
  photo: { width: '100%', height: '100%' },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  changePhotoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  photoIcon: { fontSize: 36, marginBottom: 8 },
  photoLabel: { fontSize: 15, color: Colors.text, fontWeight: '600' },
  photoSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickerText: { flex: 1, fontSize: 15, color: Colors.text, textAlign: 'right' },
  pickerArrow: { fontSize: 12, color: Colors.textMuted },

  submitBtn: { marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  payerRowSelected: { backgroundColor: Colors.primary + '10' },
  payerName: { flex: 1, fontSize: 16, color: Colors.text, textAlign: 'right' },
  payerNameSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 18, color: Colors.primary, marginLeft: 8 },
});
