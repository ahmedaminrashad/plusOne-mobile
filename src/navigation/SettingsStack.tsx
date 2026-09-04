import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../types/navigation';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import PaymentMethodsScreen from '../screens/settings/PaymentMethodsScreen';
import { Colors } from '../constants/colors';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        freezeOnBlur: false,
      }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    </Stack.Navigator>
  );
}
