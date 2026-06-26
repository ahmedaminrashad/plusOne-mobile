import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import AppStack from './AppStack';
import SettingsStack from './SettingsStack';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder for the FAB middle tab - never rendered
function EmptyScreen() {
  return <View />;
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const handleGroupsPress = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const handleFabPress = useCallback(() => {
    // Navigate to CreateGroup inside the Groups stack
    navigation.navigate('Groups', { screen: 'CreateGroup' } as any);
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('SettingsTab');
  }, [navigation]);

  const groupsActive = state.index === 0;
  const settingsActive = state.index === 2;

  return (
    <View style={styles.tabBar}>
      {/* Groups tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={handleGroupsPress}
        activeOpacity={0.7}>
        <View style={[styles.tabIconWrap, groupsActive && styles.tabIconWrapActive]}>
          <Text style={[styles.tabIconText, groupsActive && styles.tabIconTextActive]}>
            {groupsActive ? '⊞' : '⊟'}
          </Text>
        </View>
        <Text style={[styles.tabLabel, groupsActive && styles.tabLabelActive]}>مجموعاتي</Text>
      </TouchableOpacity>

      {/* FAB middle */}
      <View style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Settings tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={handleSettingsPress}
        activeOpacity={0.7}>
        <View style={[styles.tabIconWrap, settingsActive && styles.tabIconWrapActive]}>
          <Text style={[styles.tabIconText, settingsActive && styles.tabIconTextActive]}>
            {settingsActive ? '⚙' : '⚙'}
          </Text>
        </View>
        <Text style={[styles.tabLabel, settingsActive && styles.tabLabelActive]}>الإعدادات</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Groups" component={AppStack} />
      <Tab.Screen name="NewGroup" component={EmptyScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}

const TAB_HEIGHT = Platform.OS === 'ios' ? 82 : 64;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navBackground,
    height: TAB_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.navActive + '22',
  },
  tabIconText: { fontSize: 20, color: Colors.navInactive },
  tabIconTextActive: { color: Colors.navActive },
  tabLabel: { fontSize: 10, fontWeight: '600', color: Colors.navInactive },
  tabLabelActive: { color: Colors.navActive },

  // FAB
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -24,
  },
  fab: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.navBackground,
  },
  fabIcon: { fontSize: 26, color: '#fff', lineHeight: 30 },
});
