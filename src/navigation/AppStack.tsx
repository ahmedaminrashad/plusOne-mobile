import React from 'react';
import { useTranslation } from 'react-i18next';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import HomeScreen from '../screens/groups/HomeScreen';
import InvitationsScreen from '../screens/groups/InvitationsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import InviteMembersScreen from '../screens/groups/InviteMembersScreen';
import ChatScreen from '../screens/groups/ChatScreen';
import CreateBillScreen from '../screens/groups/CreateBillScreen';
import QRScannerScreen from '../screens/groups/QRScannerScreen';
import OCRCaptureScreen from '../screens/groups/OCRCaptureScreen';
import ReceiptSplitScreen from '../screens/groups/ReceiptSplitScreen';
import ViewReceiptScreen from '../screens/groups/ViewReceiptScreen';
import EditBillItemsScreen from '../screens/groups/EditBillItemsScreen';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const { t } = useTranslation('navigation');
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.accent,
        headerTitleStyle: { fontWeight: '700', color: Colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: t('appStack.invitationsTitle') }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: t('appStack.createGroupTitle') }} />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: t('appStack.inviteMembersTitle') }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen
        name="AddBill"
        component={CreateBillScreen}
        options={{ title: t('appStack.addBillTitle') }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: t('appStack.qrScannerTitle'), headerTransparent: true, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="OCRCapture"
        component={OCRCaptureScreen}
        options={{ title: t('appStack.ocrCaptureTitle') }}
      />
      <Stack.Screen
        name="ReceiptSplit"
        component={ReceiptSplitScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen
        name="ViewReceipt"
        component={ViewReceiptScreen}
        options={{ title: t('appStack.viewReceiptTitle') }}
      />
      <Stack.Screen
        name="EditBillItems"
        component={EditBillItemsScreen}
        options={{ title: t('appStack.editBillItemsTitle') }}
      />
    </Stack.Navigator>
  );
}
