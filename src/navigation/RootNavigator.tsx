import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppDispatch';
import { SecureStorage } from '../utils/storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';
import { View, ActivityIndicator, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import { Colors } from '../constants/colors';
import { useGetMeQuery, useSaveFcmTokenMutation } from '../store/api/usersApi';
import {
  requestNotificationPermission,
  getFcmToken,
  onNotificationOpenedApp,
  getInitialNotification,
  onForegroundMessage,
} from '../services/notifications';
import { consumePendingSharedText, consumePendingSharedImage } from '../services/shareIntent';
import { extractInstaPayIdentifierFromSharedText } from '../utils/instapay';
import { TabParamList } from '../types/navigation';

export default function RootNavigator() {
  const { t } = useTranslation('navigation');
  const dispatch = useAppDispatch();
  const { isAuthenticated, isProfileComplete } = useAppSelector((s) => s.auth);
  const [tokensRestored, setTokensRestored] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [saveFcmToken] = useSaveFcmTokenMutation();
  const navRef = useRef<NavigationContainerRef<TabParamList>>(null);

  useEffect(() => {
    (async () => {
      const tokens = await SecureStorage.getTokens();
      if (tokens) {
        dispatch(setTokens(tokens));
        dispatch(setProfileComplete(tokens.isProfileComplete));
      }
      setTokensRestored(true);
    })();
  }, [dispatch]);

  // Stored tokens only prove a session existed at some point — the access token is
  // short-lived, so re-verify it against the backend on every app open. If it's expired
  // and the refresh (handled inside baseApi's reauth wrapper) fails, clearAuth() flips
  // isAuthenticated to false and this redirects to the login stack below.
  const { isFetching: verifyingSession } = useGetMeQuery(undefined, {
    skip: !tokensRestored || !isAuthenticated,
  });

  const loading = !tokensRestored || (isAuthenticated && verifyingSession);
  const showApp = isAuthenticated && isProfileComplete;

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

  // When the user shares InstaPay's "Click the link to send money to..." text into
  // PlusOne (from the InstaPay app's own Share sheet), route straight to Edit Profile
  // with the parsed identifier pre-filled instead of making them type it in by hand.
  useEffect(() => {
    if (!showApp || !navReady) return;
    const checkForSharedText = () => {
      consumePendingSharedText().then((text) => {
        if (!text) return;
        const identifier = extractInstaPayIdentifierFromSharedText(text);
        if (!identifier) return;
        const nav = navRef.current as any;
        nav?.navigate('SettingsTab', { screen: 'EditProfile', params: { prefillInstaPayAlias: identifier } });
      });
    };
    checkForSharedText();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkForSharedText();
    });
    return () => subscription.remove();
  }, [showApp, navReady]);

  // Same idea, for a photo shared into PlusOne from another app (e.g. the Photos
  // app's share sheet) — send the user straight to "pick a group" so the photo can
  // be posted into that group's chat.
  useEffect(() => {
    if (!showApp || !navReady) return;
    const checkForSharedImage = () => {
      consumePendingSharedImage().then((uri) => {
        if (!uri) return;
        const nav = navRef.current as any;
        nav?.navigate('Groups', { screen: 'SelectGroupToShare', params: { imageUri: uri } });
      });
    };
    checkForSharedImage();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkForSharedImage();
    });
    return () => subscription.remove();
  }, [showApp, navReady]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} onReady={() => setNavReady(true)}>
      {showApp ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
