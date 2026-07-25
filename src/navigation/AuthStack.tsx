import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/profile/ProfileSetupScreen';
import { Colors } from '../constants/colors';
import { AppStorage } from '../utils/storage';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const [initialRouteName, setInitialRouteName] = useState<keyof AuthStackParamList | null>(null);

  useEffect(() => {
    AppStorage.hasSeenOnboarding().then((seen) => {
      setInitialRouteName(seen ? 'PhoneEntry' : 'Onboarding');
    });
  }, []);

  if (!initialRouteName) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
