import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { CloseIcon, SearchIcon, CheckIcon, PeopleIcon } from '../icons';
import { DeviceContact, loadDeviceContacts } from '../../utils/contacts';

interface Props {
  visible: boolean;
  alreadySelected?: string[];
  onClose: () => void;
  onConfirm: (contacts: DeviceContact[]) => void;
  title?: string;
  confirmLabel?: string;
  multiSelect?: boolean;
}

function ContactPickerModal({
  visible,
  alreadySelected = [],
  onClose,
  onConfirm,
  title,
  confirmLabel,
  multiSelect = true,
}: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Record<string, DeviceContact>>({});

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setPicked({});
    setLoading(true);
    loadDeviceContacts()
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [contacts, query]);

  const toggle = useCallback(
    (contact: DeviceContact) => {
      if (alreadySelected.includes(contact.phone)) return;
      setPicked((prev) => {
        if (!multiSelect) return { [contact.phone]: contact };
        if (prev[contact.phone]) {
          const next = { ...prev };
          delete next[contact.phone];
          return next;
        }
        return { ...prev, [contact.phone]: contact };
      });
    },
    [alreadySelected, multiSelect],
  );

  const selectedList = Object.values(picked);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={[typography.headingMedium, styles.title]}>
            {title ?? t('contacts.pickerTitle', { defaultValue: 'Choose from contacts' })}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <CloseIcon size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <SearchIcon size={16} color={Colors.textMuted} />
          <TextInput
            style={[typography.bodyMedium, styles.searchInput]}
            placeholder={t('contacts.searchPlaceholder', { defaultValue: 'Search contacts…' })}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <PeopleIcon size={40} color={Colors.textMuted} />
            <Text style={[typography.bodyLarge, styles.emptyText]}>
              {t('contacts.empty', { defaultValue: 'No contacts with phone numbers found' })}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id + c.phone}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isAlready = alreadySelected.includes(item.phone);
              const isPicked = !!picked[item.phone];
              return (
                <TouchableOpacity
                  style={[styles.row, (isAlready || isPicked) && styles.rowSelected]}
                  onPress={() => toggle(item)}
                  disabled={isAlready}
                  activeOpacity={0.7}>
                  <View style={styles.rowInfo}>
                    <Text style={[typography.labelLarge, styles.rowName]}>{item.name}</Text>
                    <Text style={[typography.bodySmall, styles.rowPhone]}>{item.phone}</Text>
                  </View>
                  {(isAlready || isPicked) && <CheckIcon size={18} color={Colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, selectedList.length === 0 && styles.confirmBtnDisabled]}
            disabled={selectedList.length === 0}
            onPress={() => onConfirm(selectedList)}
            activeOpacity={0.85}>
            <Text style={[typography.labelLarge, styles.confirmText]}>
              {confirmLabel ??
                t('contacts.confirm', {
                  count: selectedList.length,
                  defaultValue: `Add ${selectedList.length || ''}`.trim(),
                })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default memo(ContactPickerModal);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { color: Colors.text, flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.text, padding: 0 },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  rowSelected: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.tint,
  },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowPhone: { color: Colors.textMuted, marginTop: 2 },
  footer: { padding: 16, paddingBottom: 24 },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff' },
});
