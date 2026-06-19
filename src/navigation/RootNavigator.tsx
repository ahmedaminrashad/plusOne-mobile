import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useAppDispatch';
import { SecureStorage } from '../utils/storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/useAppDispatch';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isProfileComplete } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const showApp = isAuthenticated && isProfileComplete;

  return (
    <NavigationContainer>
      {showApp ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
