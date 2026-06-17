import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useInviteMembersMutation } from '../../store/api/groupsApi';

type Props = AppScreenProps<'InviteMembers'>;

function InviteMembersScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const [inviteMembers, { isLoading }] = useInviteMembersMutation();

  const handleAddPhone = useCallback(() => {
    const formatted = formatPhone(phone.trim());
    if (!isValidPhone(formatted)) {
      setPhoneError('لا يمكن إضافة الأعضاء بدون رقم هاتف صحيح');
      return;
    }
    if (selected.includes(formatted)) {
      setPhoneError('تم إضافة هذا الرقم مسبقاً');
      return;
    }
    setSelected((prev) => [...prev, formatted]);
    setPhone('');
    setPhoneError('');
  }, [phone, selected]);

  const handleRemovePhone = useCallback((p: string) => {
    setSelected((prev) => prev.filter((s) => s !== p));
  }, []);

  const handleSendInvites = useCallback(async () => {
    if (selected.length === 0) return;
    try {
      const result = await inviteMembers({ groupId, phones: selected }).unwrap();
      Alert.alert(
        'تم الإرسال',
        `تم إرسال ${result.sent} دعوة بنجاح${result.failed > 0 ? `، فشل ${result.failed}` : ''}${result.alreadyMembers > 0 ? `، ${result.alreadyMembers} موجودون مسبقاً` : ''}.`,
        [{ text: 'حسناً', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('خطأ', 'تعذر إرسال الدعوات، حاول مرة أخرى لاحقاً');
    }
  }, [selected, groupId, inviteMembers, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>أدخل أرقام الهواتف</Text>
        <Text style={styles.subtitle}>
          سيتم إضافة المستخدمين المسجّلين فوراً، وسيتلقى الباقون رابط دعوة عبر SMS
        </Text>

        <View style={styles.inputRow}>
          <Input
            value={phone}
            onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
            placeholder="+20 10 XXXX XXXX"
            keyboardType="phone-pad"
            error={phoneError}
            containerStyle={styles.phoneInput}
          />
          <Button
            title="إضافة"
            onPress={handleAddPhone}
            variant="outline"
            disabled={!phone.trim()}
            style={styles.addBtn}
          />
        </View>

        {selected.length > 0 && (
          <FlatList
            data={selected}
            keyExtractor={(p) => p}
            renderItem={({ item }) => (
              <View style={styles.phoneTag}>
                <Text style={styles.phoneTagText}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemovePhone(item)}>
                  <Text style={styles.removeTag}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tags}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title={`إرسال ${selected.length > 0 ? `(${selected.length})` : ''} دعوة`}
          onPress={handleSendInvites}
          loading={isLoading}
          disabled={selected.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(InviteMembersScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  phoneInput: { flex: 1, marginBottom: 0 },
  addBtn: { height: 52, paddingHorizontal: 16, marginTop: 0 },
  tags: { paddingVertical: 8, gap: 8 },
  phoneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  phoneTagText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  removeTag: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  footer: { padding: 24, paddingTop: 0 },
});
