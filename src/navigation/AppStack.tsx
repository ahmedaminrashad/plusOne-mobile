import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import HomeScreen from '../screens/groups/HomeScreen';
import InvitationsScreen from '../screens/groups/InvitationsScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import InviteMembersScreen from '../screens/groups/InviteMembersScreen';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.text },
        headerShadowVisible: false,
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
    </Stack.Navigator>
  );
}
