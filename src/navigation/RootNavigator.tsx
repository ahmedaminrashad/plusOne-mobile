import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppDispatch';
import { SecureStorage } from '../utils/storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';
import { View, ActivityIndicator, StyleSheet, Alert, AppState, AppStateStatus, InteractionManager, Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { useGetMeQuery, useSaveFcmTokenMutation } from '../store/api/usersApi';
import {
  requestNotificationPermission,
  getFcmToken,
  onFcmTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotificationWithRetry,
  onForegroundMessage,
} from '../services/notifications';
import { consumePendingSharedText, consumePendingSharedImage } from '../services/shareIntent';
import { isChatGroupActive } from '../services/activeChat';
import { extractInstaPayIdentifierFromSharedText } from '../utils/instapay';
import { TabParamList } from '../types/navigation';
import { baseApi } from '../store/api/baseApi';

function asDataRecord(data: Record<string, unknown> | undefined | null): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return out;
}

export default function RootNavigator() {
  const { t } = useTranslation('navigation');
  const dispatch = useAppDispatch();
  const { isAuthenticated, isProfileComplete } = useAppSelector((s) => s.auth);
  const [tokensRestored, setTokensRestored] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [saveFcmToken] = useSaveFcmTokenMutation();
  const navRef = useRef<NavigationContainerRef<TabParamList>>(null);
  const pendingNotificationRef = useRef<Record<string, string> | null>(null);
  const handledInitialRef = useRef(false);
  const navReadyRef = useRef(false);
  const showAppRef = useRef(false);

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
  showAppRef.current = showApp;

  // Register FCM token when authenticated. iOS often vends the token after
  // APNs arrives, so also persist refreshes.
  useEffect(() => {
    if (!isAuthenticated) return;
    let unsub: (() => void) | undefined;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const token = await getFcmToken();
      if (token) await saveFcmToken(token);
      unsub = onFcmTokenRefresh((next) => {
        saveFcmToken(next);
      });
    })();
    return () => unsub?.();
  }, [isAuthenticated, saveFcmToken]);

  // Reset the Home stack onto the target screen so cold-start taps can't land
  // on the group list when nested navigate races the AppStack mount.
  const openNestedHomeScreen = useCallback((screen: string, params?: Record<string, unknown>) => {
    const nav = navRef.current;
    if (!nav?.isReady()) return false;

    nav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
            state: {
              index: 1,
              routes: [
                { name: 'Home' },
                { name: screen, params },
              ],
            },
          },
          { name: 'QuickAdd' },
          { name: 'SettingsTab' },
        ],
      }),
    );
    return true;
  }, []);

  // Handle notification taps — same logic for both a background-tap (onNotificationOpenedApp)
  // and a cold-start tap (getInitialNotification), so the two paths can't drift apart.
  // Always wait until the app shell is ready; navigating earlier silently drops nested routes.
  const navigateFromNotification = useCallback((raw: Record<string, string>) => {
    const data = asDataRecord(raw);
    if (!navReadyRef.current || !showAppRef.current || !navRef.current) {
      pendingNotificationRef.current = data;
      return;
    }

    const run = () => {
      if (!navReadyRef.current || !showAppRef.current || !navRef.current) {
        pendingNotificationRef.current = data;
        return;
      }

      if (data.type === 'invitation') {
        openNestedHomeScreen('Invitations');
      } else if (data.type === 'chat_message' && data.groupId) {
        // Dedicated Chat screen — more reliable than GroupDetail + initialTab.
        openNestedHomeScreen('Chat', {
          groupId: data.groupId,
          groupName: data.groupName ?? '',
        });
      } else if (data.type === 'member_joined' && data.groupId) {
        openNestedHomeScreen('GroupDetail', {
          groupId: data.groupId,
          groupName: data.groupName ?? '',
          initialTab: 'chat',
        });
      } else if (
        (data.type === 'share_assigned' ||
          data.type === 'share_reminder' ||
          data.type === 'share_initiated') &&
        data.groupId &&
        data.billId
      ) {
        openNestedHomeScreen('PayShare', {
          groupId: data.groupId,
          groupName: data.groupName ?? '',
          billId: data.billId,
        });
      } else if (data.type === 'share_settled' && data.groupId && data.billId) {
        openNestedHomeScreen('BillStatus', {
          groupId: data.groupId,
          groupName: data.groupName ?? '',
          billId: data.billId,
        });
      } else if (data.groupId && !data.type) {
        // Defensive: some Android OEMs drop `type` but keep groupId on tray taps.
        openNestedHomeScreen('Chat', {
          groupId: data.groupId,
          groupName: data.groupName ?? '',
        });
      }
    };

    InteractionManager.runAfterInteractions(() => {
      // Retries cover Tab → AppStack mount races on cold start.
      run();
      setTimeout(run, 200);
      setTimeout(run, 700);
    });
  }, [openNestedHomeScreen]);

  useEffect(() => {
    if (!navReady || !showApp || !pendingNotificationRef.current) return;
    const data = pendingNotificationRef.current;
    pendingNotificationRef.current = null;
    navigateFromNotification(data);
  }, [navReady, showApp, navigateFromNotification]);

  useEffect(() => {
    const unsub = onNotificationOpenedApp(navigateFromNotification);
    if (!handledInitialRef.current) {
      handledInitialRef.current = true;
      getInitialNotificationWithRetry().then((data) => {
        if (data) navigateFromNotification(asDataRecord(data));
      });
    }
    return unsub;
  }, [navigateFromNotification]);

  // FCM doesn't auto-show a tray notification while the app is in the foreground —
  // surface it ourselves via an alert with a "View" action that reuses the same navigation.
  useEffect(() => {
    const unsub = onForegroundMessage((notification, data) => {
      const payload = asDataRecord(data);
      // Keep group/member caches fresh across devices without requiring an app restart.
      if (
        payload.type === 'member_joined' ||
        payload.type === 'invitation' ||
        payload.type === 'chat_message' ||
        payload.type === 'share_assigned' ||
        payload.type === 'share_initiated' ||
        payload.type === 'share_settled' ||
        payload.type === 'share_reminder'
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
      if (payload.type === 'chat_message' && payload.groupId && isChatGroupActive(payload.groupId)) return;

      // iOS shows a system banner via firebase.json. Don't also pop an Alert.
      if (Platform.OS === 'ios') return;

      Alert.alert(
        notification.title ?? t('rootNavigator.newNotificationTitle'),
        notification.body ?? '',
        [
          { text: t('common:close'), style: 'cancel' },
          { text: t('rootNavigator.viewAction'), onPress: () => navigateFromNotification(payload) },
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
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        navReadyRef.current = true;
        setNavReady(true);
      }}>
      {showApp ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
