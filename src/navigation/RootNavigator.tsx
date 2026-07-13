import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppDispatch';
import { SecureStorage } from '../utils/storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { useSaveFcmTokenMutation } from '../store/api/usersApi';
import {
  requestNotificationPermission,
  getFcmToken,
  onNotificationOpenedApp,
  getInitialNotification,
  onForegroundMessage,
} from '../services/notifications';
import { TabParamList } from '../types/navigation';

export default function RootNavigator() {
  const { t } = useTranslation('navigation');
  const dispatch = useAppDispatch();
  const { isAuthenticated, isProfileComplete } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const [saveFcmToken] = useSaveFcmTokenMutation();
  const navRef = useRef<NavigationContainerRef<TabParamList>>(null);

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

  // Handle notification taps — same logic for both a background-tap (onNotificationOpenedApp)
  // and a cold-start tap (getInitialNotification), so the two paths can't drift apart.
  const navigateFromNotification = useCallback((data: Record<string, string>) => {
    const nav = navRef.current as any;
    if (!nav) return;
    if (data.type === 'invitation') {
      nav.navigate('Groups', { screen: 'Invitations' });
    } else if (data.type === 'member_joined' && data.groupId) {
      nav.navigate('Groups', { screen: 'GroupDetail', params: { groupId: data.groupId, groupName: '' } });
    } else if (data.type === 'share_assigned' && data.groupId && data.billId) {
      nav.navigate('Groups', {
        screen: 'ViewReceipt',
        params: { groupId: data.groupId, groupName: data.groupName ?? '', billId: data.billId },
      });
    }
  }, []);

  useEffect(() => {
    const unsub = onNotificationOpenedApp(navigateFromNotification);
    getInitialNotification().then((data) => {
      if (data) navigateFromNotification(data);
    });
    return unsub;
  }, [navigateFromNotification]);

  // FCM doesn't auto-show a tray notification while the app is in the foreground —
  // surface it ourselves via an alert with a "View" action that reuses the same navigation.
  useEffect(() => {
    const unsub = onForegroundMessage((notification, data) => {
      Alert.alert(
        notification.title ?? t('rootNavigator.newNotificationTitle'),
        notification.body ?? '',
        [
          { text: t('common:close'), style: 'cancel' },
          { text: t('rootNavigator.viewAction'), onPress: () => navigateFromNotification(data) },
        ],
      );
    });
    return unsub;
  }, [navigateFromNotification]);

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
      {showApp ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
