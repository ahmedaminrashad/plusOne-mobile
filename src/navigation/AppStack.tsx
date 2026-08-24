import React from 'react';
import { useTranslation } from 'react-i18next';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import HomeScreen from '../screens/groups/HomeScreen';
import NotificationsScreen from '../screens/groups/NotificationsScreen';
import InvitationsScreen from '../screens/groups/InvitationsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import InviteMembersScreen from '../screens/groups/InviteMembersScreen';
import ChatScreen from '../screens/groups/ChatScreen';
import AddBillChooserScreen from '../screens/groups/AddBillChooserScreen';
import CreateBillScreen from '../screens/groups/CreateBillScreen';
import QRScannerScreen from '../screens/groups/QRScannerScreen';
import OCRCaptureScreen from '../screens/groups/OCRCaptureScreen';
import AssignItemsScreen from '../screens/groups/AssignItemsScreen';
import BillStatusScreen from '../screens/groups/BillStatusScreen';
import PayShareScreen from '../screens/groups/PayShareScreen';
import EditBillItemsScreen from '../screens/groups/EditBillItemsScreen';
import SelectGroupToShareScreen from '../screens/groups/SelectGroupToShareScreen';
import AllGroupsScreen from '../screens/groups/AllGroupsScreen';
import SettleUpScreen from '../screens/groups/SettleUpScreen';
import MyCircleScreen from '../screens/groups/MyCircleScreen';
import RemindScreen from '../screens/groups/RemindScreen';
import MyLedgerScreen from '../screens/groups/MyLedgerScreen';
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
        headerBackTitle: '',
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: t('appStack.invitationsTitle') }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: t('appStack.inviteMembersTitle') }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddBillChooser" component={AddBillChooserScreen} options={{ headerShown: false }} />
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
        name="AssignItems"
        component={AssignItemsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="BillStatus" component={BillStatusScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PayShare" component={PayShareScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="EditBillItems"
        component={EditBillItemsScreen}
        options={{ title: t('appStack.editBillItemsTitle') }}
      />
      <Stack.Screen
        name="SelectGroupToShare"
        component={SelectGroupToShareScreen}
        options={{ title: t('appStack.selectGroupToShareTitle') }}
      />
      <Stack.Screen name="AllGroups" component={AllGroupsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyCircle" component={MyCircleScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Remind" component={RemindScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyLedger" component={MyLedgerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
