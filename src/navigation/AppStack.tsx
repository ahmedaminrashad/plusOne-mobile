import React from 'react';
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
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
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
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: 'الدعوات' }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'مجموعة جديدة' }} />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: 'دعوة أعضاء' }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
      <Stack.Screen
        name="AddBill"
        component={CreateBillScreen}
        options={{ title: 'إضافة إيصال' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: 'مسح QR', headerTransparent: true, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="OCRCapture"
        component={OCRCaptureScreen}
        options={{ title: 'مسح إيصال ورقي' }}
      />
      <Stack.Screen
        name="ReceiptSplit"
        component={ReceiptSplitScreen}
        options={({ route }) => ({ title: route.params.groupName })}
      />
    </Stack.Navigator>
  );
}
