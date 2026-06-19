import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppDispatch';
import { SecureStorage } from '../utils/storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { useSaveFcmTokenMutation } from '../store/api/usersApi';
import {
  requestNotificationPermission,
  getFcmToken,
  onNotificationOpenedApp,
  getInitialNotification,
} from '../services/notifications';
import { AppStackParamList } from '../types/navigation';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isProfileComplete } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const [saveFcmToken] = useSaveFcmTokenMutation();
  const navRef = useRef<NavigationContainerRef<AppStackParamList>>(null);

  useEffect(() => {
    (async () => {
      const tokens = await SecureStorage.getTokens();
      if (tokens) {
        dispatch(setTokens(tokens));
        dispatch(setProfileComplete(tokens.isProfileComplete));
      }
      setLoading(false);
    })();
  }, [dispatch]);

  // Register FCM token when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const token = await getFcmToken();
      if (token) await saveFcmToken(token);
    })();
  }, [isAuthenticated, saveFcmToken]);

  // Handle notification taps (app in background)
  useEffect(() => {
    const unsub = onNotificationOpenedApp((data) => {
      if (data.type === 'invitation') navRef.current?.navigate('Invitations');
      if (data.type === 'member_joined' && data.groupId)
        navRef.current?.navigate('GroupDetail', { groupId: data.groupId, groupName: '' });
    });
    getInitialNotification().then((data) => {
      if (!data) return;
      if (data.type === 'invitation') navRef.current?.navigate('Invitations');
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const showApp = isAuthenticated && isProfileComplete;

  return (
    <NavigationContainer ref={navRef}>
      {showApp ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
