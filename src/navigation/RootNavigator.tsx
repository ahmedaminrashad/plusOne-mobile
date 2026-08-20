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
import { isChatGroupActive } from '../services/activeChat';
import { extractInstaPayIdentifierFromSharedText } from '../utils/instapay';
import { TabParamList } from '../types/navigation';
import { baseApi } from '../store/api/baseApi';

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

  // Only block on the first session restore / first getMe — never on later
  // isFetching, which remounts NavigationContainer and looks like an app reload
  // (and resets Auth back to PhoneEntry after OTP).
  const { isLoading: verifyingSession, isUninitialized: meUninitialized } = useGetMeQuery(undefined, {
    skip: !tokensRestored || !isAuthenticated,
  });

  const loading =
    !tokensRestored ||
    (isAuthenticated && (meUninitialized || verifyingSession));
  const showApp = isAuthenticated && isProfileComplete;
  const pendingNotificationRef = useRef<Record<string, string> | null>(null);

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
    if (!nav) {
      pendingNotificationRef.current = data;
      return;
    }
    if (data.type === 'invitation') {
      nav.navigate('Home', { screen: 'Invitations' });
    } else if (data.type === 'member_joined' && data.groupId) {
      nav.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: data.groupId, groupName: data.groupName ?? '' },
      });
    } else if (data.type === 'chat_message' && data.groupId) {
      nav.navigate('Home', {
        screen: 'GroupDetail',
        params: { groupId: data.groupId, groupName: data.groupName ?? '' },
      });
    } else if (
      (data.type === 'share_assigned' ||
        data.type === 'share_reminder' ||
        data.type === 'share_initiated') &&
      data.groupId &&
      data.billId
    ) {
      nav.navigate('Home', {
        screen: 'PayShare',
        params: { groupId: data.groupId, groupName: data.groupName ?? '', billId: data.billId },
      });
    } else if (data.type === 'share_settled' && data.groupId && data.billId) {
      nav.navigate('Home', {
        screen: 'BillStatus',
        params: { groupId: data.groupId, groupName: data.groupName ?? '', billId: data.billId },
      });
    }
  }, []);

  useEffect(() => {
    if (!navReady || !showApp || !pendingNotificationRef.current) return;
    const data = pendingNotificationRef.current;
    pendingNotificationRef.current = null;
    navigateFromNotification(data);
  }, [navReady, showApp, navigateFromNotification]);

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
      // Keep group/member caches fresh across devices without requiring an app restart.
      if (
        data.type === 'member_joined' ||
        data.type === 'invitation' ||
        data.type === 'chat_message' ||
        data.type === 'share_assigned' ||
        data.type === 'share_initiated' ||
        data.type === 'share_settled' ||
        data.type === 'share_reminder'
      ) {
        dispatch(
          baseApi.util.invalidateTags([
            'Group',
            'GroupMember',
            'Invitation',
            'Message',
            'Bill',
            'Share',
            'Ledger',
          ]),
        );
      }

      // The chat itself already reflects new messages via polling — don't also
      // pop an alert over the same conversation the user is currently looking at.
      if (data.type === 'chat_message' && data.groupId && isChatGroupActive(data.groupId)) return;

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
  }, [dispatch, navigateFromNotification, t]);

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
        nav?.navigate('Home', { screen: 'SelectGroupToShare', params: { imageUri: uri } });
      });
    };
    checkForSharedImage();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkForSharedImage();
    });
    return () => subscription.remove();
  }, [showApp, navReady]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      dispatch(
        baseApi.util.invalidateTags([
          'Group',
          'GroupMember',
          'Invitation',
          'Share',
          'Bill',
          'Ledger',
          'Message',
        ]),
      );
    });
    return () => subscription.remove();
  }, [dispatch, isAuthenticated]);

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
