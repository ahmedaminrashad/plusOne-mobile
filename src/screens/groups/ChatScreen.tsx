import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import Avatar from '../../components/common/Avatar';
import { resolveAssetUrl } from '../../utils/format';
import GroupChatPane from './GroupChatPane';
import { ChevronLeftIcon } from '../../components/icons';

type Props = AppScreenProps<'Chat'>;

const VISIBLE_AVATARS = 3;

// Header chrome (back button, group name + member names, avatar stack) matches
// Figma's "Section - CHAT" frame — rendered here rather than in GroupChatPane
// since that component is also embedded (headerless) inside GroupDetailScreen's
// own tab chrome. The native stack header is turned off for this route (see
// AppStack.tsx) so this custom header can take its place.
function ChatScreen({ route, navigation }: Props) {
  const { groupId, groupName, sharedImageUri } = route.params;
  const typography = useTypography();
  const { data: members } = useGetGroupMembersQuery(groupId);

  const activeMembers = members?.filter((m) => m.status === 'active') ?? [];
  const visibleMembers = activeMembers.slice(0, VISIBLE_AVATARS);
  const overflowCount = activeMembers.length - visibleMembers.length;
  const memberNames = visibleMembers
    .map((m) => m.user?.displayName?.split(' ')[0] ?? m.pendingPhone)
    .filter(Boolean)
    .join(', ');
  const subtitle = overflowCount > 0 ? `${memberNames} +${overflowCount}` : memberNames;

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10} activeOpacity={0.7}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[typography.labelLarge, styles.headerTitle]} numberOfLines={1}>{groupName}</Text>
          {!!subtitle && (
            <Text style={[typography.bodySmall, styles.headerSubtitle]} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
        <View style={styles.headerAvatars}>
          {visibleMembers.map((m, i) => (
            <Avatar
              key={m.id}
              uri={resolveAssetUrl(m.user?.photoUrl)}
              name={m.user?.displayName ?? m.pendingPhone}
              seed={m.userId ?? m.id}
              size={28}
              ghost={!m.userId}
              style={[styles.headerAvatar, i > 0 && { marginLeft: -8 }]}
            />
          ))}
        </View>
      </View>

      <GroupChatPane
          groupId={groupId}
          groupName={groupName}
          navigation={navigation}
          sharedImageUri={sharedImageUri}
          onSharedImageConsumed={() => navigation.setParams({ sharedImageUri: undefined })}
        />
    </SafeScreen>
  );
}

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: Colors.text },
  headerSubtitle: { color: Colors.textSecondary, marginTop: 1 },
  headerAvatars: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { borderWidth: 2, borderColor: Colors.surface },
});
