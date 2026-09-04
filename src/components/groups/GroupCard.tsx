import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Group } from '../../types/models';
import Avatar from '../common/Avatar';
import { PeopleIcon } from '../icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { resolveAssetUrl } from '../../utils/format';
import { downsampledSource } from '../../utils/remoteImage';

const VISIBLE_AVATARS = 4;

interface Props {
  group: Group;
  onPress: () => void;
}

function GroupCard({ group, onPress }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const activeMembers = useMemo(() => group.members?.filter((m) => m.status === 'active') ?? [], [group.members]);

  const visibleMembers = activeMembers.slice(0, VISIBLE_AVATARS);
  const overflowCount = activeMembers.length - visibleMembers.length;
  const avatarUrl = resolveAssetUrl(group.avatarUrl);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Layout: group icon (left) → name → members */}
      <View style={styles.row}>
        <View style={styles.groupIconWrap}>
          {avatarUrl ? (
            <Image source={downsampledSource(avatarUrl, 48)} resizeMethod="resize" style={styles.groupIconImage} />
          ) : (
            <PeopleIcon size={22} color={Colors.primary} />
          )}
        </View>

        <View style={styles.mainCol}>
          <Text style={[typography.labelLarge, styles.cardName]} numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.membersRow}>
            <View style={styles.avatarStack}>
              {visibleMembers.map((m, i) => (
                <Avatar
                  key={m.id}
                  uri={resolveAssetUrl(m.user?.photoUrl)}
                  name={m.user?.displayName ?? m.pendingPhone ?? t('groupDetail.defaultUserName')}
                  seed={m.userId ?? m.id}
                  size={24}
                  ghost={!m.userId}
                  style={[styles.avatarStackItem, i > 0 && { marginLeft: -6 }]}
                />
              ))}
              {overflowCount > 0 && (
                <View style={[styles.avatarStackItem, styles.overflowBadge, { marginLeft: -6 }]}>
                  <Text style={[typography.labelSmall, styles.overflowText]}>+{overflowCount}</Text>
                </View>
              )}
            </View>
            <Text style={[typography.bodySmall, styles.membersCount]}>
              {t('home.cardMembersOnly', { count: activeMembers.length, defaultValue: `${activeMembers.length} members` })}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(GroupCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  groupIconImage: {
    width: 48,
    height: 48,
  },
  mainCol: {
    flex: 1,
    gap: 6,
  },
  cardName: { color: Colors.text },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarStackItem: { borderWidth: 2, borderColor: Colors.surface },
  overflowBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.neutral200,
    justifyContent: 'center', alignItems: 'center',
  },
  overflowText: { color: Colors.textSecondary },
  membersCount: { color: Colors.textMuted },
});
