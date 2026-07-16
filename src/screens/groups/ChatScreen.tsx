import React from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import GroupChatPane from './GroupChatPane';

type Props = AppScreenProps<'Chat'>;

function ChatScreen({ route, navigation }: Props) {
  const { groupId, groupName, sharedImageUri } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <GroupChatPane
          groupId={groupId}
          groupName={groupName}
          navigation={navigation}
          sharedImageUri={sharedImageUri}
          onSharedImageConsumed={() => navigation.setParams({ sharedImageUri: undefined })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
});
