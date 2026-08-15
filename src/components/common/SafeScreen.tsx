import React from 'react';
import { View, StyleSheet, StatusBar, Platform, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  /** Fill the status-bar inset (use the header color on dark-header screens). */
  statusBarColor?: string;
}

export function useAppSafeInsets() {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  return { top, bottom: insets.bottom, left: insets.left, right: insets.right };
}

/**
 * Drop-in for React Native's SafeAreaView. RN's version is a no-op on Android
 * edge-to-edge, so headers/buttons sit under the system status bar.
 */
export default function SafeScreen({ children, style, edges = ['top'], statusBarColor }: Props) {
  const { top, bottom } = useAppSafeInsets();
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const insetBg = statusBarColor ?? (typeof flat?.backgroundColor === 'string' ? flat.backgroundColor : undefined);

  return (
    <View style={[styles.root, style]}>
      {edges.includes('top') ? <View style={{ height: top, backgroundColor: insetBg }} /> : null}
      {children}
      {edges.includes('bottom') ? <View style={{ height: bottom }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
