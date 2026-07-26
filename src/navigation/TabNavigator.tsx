import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import AppStack from './AppStack';
import SettingsStack from './SettingsStack';
import BillsTabScreen from '../screens/groups/BillsTabScreen';
import ActivityScreen from '../screens/groups/ActivityScreen';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/radius';
import { useTypography } from '../hooks/useTypography';

const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder for the FAB middle tab - never rendered
function EmptyScreen() {
  return <View />;
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation('navigation');
  const typography = useTypography();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHomePress = useCallback(() => {
    navigation.navigate('Home', { screen: 'Home' } as any);
  }, [navigation]);

  const handleBillsPress = useCallback(() => navigation.navigate('Bills'), [navigation]);
  const handleActivityPress = useCallback(() => navigation.navigate('Activity'), [navigation]);
  const handleProfilePress = useCallback(() => navigation.navigate('SettingsTab'), [navigation]);
  const handleFabPress = useCallback(() => setMenuOpen((v) => !v), []);

  const handleNewGroup = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate('Home', { screen: 'CreateGroup' } as any);
  }, [navigation]);

  const handleAddPlusOne = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate('Home', { screen: 'MyCircle' } as any);
  }, [navigation]);

  const homeActive = state.index === 0;
  const billsActive = state.index === 1;
  const activityActive = state.index === 3;
  const profileActive = state.index === 4;

  return (
    <>
      {menuOpen && (
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuCard} onPress={handleNewGroup} activeOpacity={0.75}>
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.tint }]}>
                <Text style={styles.menuIconText}>👥</Text>
              </View>
              <View style={styles.menuCardText}>
                <Text style={[typography.labelLarge, styles.menuItemTitle]}>{t('quickAdd.newGroup')}</Text>
                <Text style={[typography.bodySmall, styles.menuItemSubtitle]}>{t('quickAdd.newGroupSubtitle')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuCard, styles.menuCardSecond]} onPress={handleAddPlusOne} activeOpacity={0.75}>
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.warningTint }]}>
                <Text style={styles.menuIconText}>👤</Text>
              </View>
              <View style={styles.menuCardText}>
                <Text style={[typography.labelLarge, styles.menuItemTitle]}>{t('quickAdd.addPlusOne')}</Text>
                <Text style={[typography.bodySmall, styles.menuItemSubtitle]}>{t('quickAdd.addPlusOneSubtitle')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={handleHomePress} activeOpacity={0.7}>
            <Text style={[styles.tabIconText, homeActive && styles.tabIconTextActive]}>⌂</Text>
            <Text style={[typography.labelSmall, styles.tabLabel, homeActive && styles.tabLabelActive]}>{t('tabBar.homeLabel')}</Text>
            {homeActive && <View style={styles.tabDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={handleBillsPress} activeOpacity={0.7}>
            <Text style={[styles.tabIconText, billsActive && styles.tabIconTextActive]}>▤</Text>
            <Text style={[typography.labelSmall, styles.tabLabel, billsActive && styles.tabLabelActive]}>{t('tabBar.billsLabel')}</Text>
            {billsActive && <View style={styles.tabDot} />}
          </TouchableOpacity>

          {/* Spacer under the raised FAB */}
          <View style={styles.fabSpacer} />

          <TouchableOpacity style={styles.tabItem} onPress={handleActivityPress} activeOpacity={0.7}>
            <Text style={[styles.tabIconText, activityActive && styles.tabIconTextActive]}>◔</Text>
            <Text style={[typography.labelSmall, styles.tabLabel, activityActive && styles.tabLabelActive]}>{t('tabBar.activityLabel')}</Text>
            {activityActive && <View style={styles.tabDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.tabItem} onPress={handleProfilePress} activeOpacity={0.7}>
            <Text style={[styles.tabIconText, profileActive && styles.tabIconTextActive]}>☺</Text>
            <Text style={[typography.labelSmall, styles.tabLabel, profileActive && styles.tabLabelActive]}>{t('tabBar.profileLabel')}</Text>
            {profileActive && <View style={styles.tabDot} />}
          </TouchableOpacity>
        </View>

        {/* FAB — raised, punched through the bar's top edge */}
        <View style={styles.fabRing} pointerEvents="box-none">
          <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.85}>
            <Text style={styles.fabIcon}>{menuOpen ? '×' : '+'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={AppStack} />
      <Tab.Screen name="Bills" component={BillsTabScreen} />
      <Tab.Screen name="QuickAdd" component={EmptyScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_MARGIN = 23;
const TAB_BAR_BOTTOM = Platform.OS === 'ios' ? 22 : 14;
const FAB_SIZE = 54;
const FAB_INNER_SIZE = 44;
const FAB_OVERLAP = 12; // how far the FAB pokes above the bar's top edge
const TAB_BAR_WRAP_HEIGHT = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + FAB_OVERLAP;

const styles = StyleSheet.create({
  // Stays in normal flow so React Navigation reserves real height for it;
  // the pill bar and FAB float inside via absolute positioning.
  tabBarWrap: {
    height: TAB_BAR_WRAP_HEIGHT,
    backgroundColor: 'transparent',
  },
  tabBar: {
    position: 'absolute',
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    bottom: TAB_BAR_BOTTOM,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navBackground,
    borderRadius: 26,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconText: { fontSize: 18, color: Colors.navInactive },
  tabIconTextActive: { color: Colors.navActive },
  tabLabel: { color: Colors.navInactive },
  tabLabelActive: { color: Colors.navActive },
  tabDot: {
    position: 'absolute',
    bottom: 6,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: Colors.navActive,
  },

  // FAB spacer — keeps the two flanking tab items from crowding the raised FAB
  fabSpacer: { width: FAB_SIZE + 10 },

  // FAB — raised above the bar's top edge, punched through with a canvas-colored ring
  fabRing: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.navFabRing,
    justifyContent: 'center', alignItems: 'center',
  },
  fab: {
    width: FAB_INNER_SIZE, height: FAB_INNER_SIZE, borderRadius: FAB_INNER_SIZE / 2,
    backgroundColor: Colors.navActive,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.navActive,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: { fontSize: 24, color: '#fff', lineHeight: 28 },

  // Quick-add floating menu — two separate cards (Figma: "New group" + "Add a +1"),
  // not one box with an internal divider.
  menuBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.menuScrim,
  },
  menu: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20,
    alignSelf: 'center',
    width: 220,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  menuCardSecond: { marginTop: 10 },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  menuIconText: { fontSize: 18 },
  menuCardText: { flex: 1 },
  menuItemTitle: { color: Colors.text },
  menuItemSubtitle: { color: Colors.textSecondary, marginTop: 1 },
});
