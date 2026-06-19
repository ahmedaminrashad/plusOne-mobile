import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GroupMember } from '../../types/models';
import Avatar from '../common/Avatar';
import { Colors } from '../../constants/colors';

interface Props {
  invitations: GroupMember[];
  onAccept: (membershipId: string) => Promise<void>;
  onDecline: (membershipId: string) => Promise<void>;
  onDismiss: () => void;
}

function InvitationPromptModal({ invitations, onAccept, onDecline, onDismiss }: Props) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);

  const inv = invitations[index];
  const total = invitations.length;

  const advance = useCallback(() => {
    if (index < total - 1) setIndex((i) => i + 1);
    else onDismiss();
  }, [index, total, onDismiss]);

  const handleAccept = useCallback(async () => {
    setLoading('accept');
    try {
      await onAccept(inv.id);
    } finally {
      setLoading(null);
      advance();
    }
  }, [inv, onAccept, advance]);

  const handleDecline = useCallback(async () => {
    setLoading('decline');
    try {
      await onDecline(inv.id);
    } finally {
      setLoading(null);
      advance();
    }
  }, [inv, onDecline, advance]);

  if (!inv) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {total > 1 && (
            <Text style={styles.counter}>
              {index + 1} / {total} دعوات
            </Text>
          )}

          <View style={styles.body}>
            <Avatar uri={inv.group?.avatarUrl} name={inv.group?.name} size={80} />
            <Text style={styles.label}>دعوة للانضمام</Text>
            <Text style={styles.groupName} numberOfLines={2}>
              {inv.group?.name}
            </Text>
            <Text style={styles.subtitle}>
              تمت دعوتك للانضمام إلى هذه المجموعة، هل تقبل؟
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              onPress={handleDecline}
              disabled={loading !== null}
              activeOpacity={0.8}>
              {loading === 'decline' ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <Text style={styles.declineTxt}>رفض</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={handleAccept}
              disabled={loading !== null}
              activeOpacity={0.8}>
              {loading === 'accept' ? (
                <ActivityIndicator size="small" color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.acceptTxt}>قبول الدعوة</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onDismiss} style={styles.later}>
            <Text style={styles.laterTxt}>لاحقاً</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default memo(InvitationPromptModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  counter: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: Colors.primary },
  acceptTxt: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  declineBtn: { backgroundColor: Colors.borderLight, borderWidth: 1, borderColor: Colors.border },
  declineTxt: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  later: { paddingVertical: 4, paddingHorizontal: 16 },
  laterTxt: { color: Colors.textMuted, fontSize: 14 },
});
