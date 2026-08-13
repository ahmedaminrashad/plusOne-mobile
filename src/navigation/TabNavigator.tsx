import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/navigation';
import AppStack from './AppStack';
import SettingsStack from './SettingsStack';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/radius';
import { useTypography } from '../hooks/useTypography';
import { HomeIcon, PersonIcon, PeopleIcon, AddPersonIcon } from '../components/icons';

const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder for the FAB middle tab - never rendered
function EmptyScreen() {
  return <View />;
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation('navigation');
  const typography = useTypography();
  const [menuOpen, setMenuOpen] = useState(false);
  const fabRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fabRotate, {
      toValue: menuOpen ? 1 : 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [menuOpen, fabRotate]);

  const handleHomePress = useCallback(() => {
    navigation.navigate('Home', { screen: 'Home' } as any);
  }, [navigation]);

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

  const fabSpin = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Indices after removing Bills/Activity: Home=0, QuickAdd=1, SettingsTab=2
  const homeActive = state.index === 0;
  const profileActive = state.index === 2;

  return (
    <>
      {menuOpen && (
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuCard} onPress={handleNewGroup} activeOpacity={0.75}>
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.tint }]}>
                <PeopleIcon size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuCardText}>
                <Text style={[typography.labelLarge, styles.menuItemTitle]}>{t('quickAdd.newGroup')}</Text>
                <Text style={[typography.bodySmall, styles.menuItemSubtitle]}>{t('quickAdd.newGroupSubtitle')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuCard, styles.menuCardSecond]} onPress={handleAddPlusOne} activeOpacity={0.75}>
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.warningTint }]}>
                <AddPersonIcon size={20} color={Colors.warningDark} />
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
            <View style={styles.tabItemInner}>
              <HomeIcon size={20} color={homeActive ? Colors.navActive : Colors.navInactive} />
              <Text style={[typography.labelSmall, styles.tabLabel, homeActive && styles.tabLabelActive]}>{t('tabBar.homeLabel')}</Text>
              {homeActive && <View style={styles.tabActiveDot} />}
            </View>
          </TouchableOpacity>

          {/* Spacer under the raised FAB */}
          <View style={styles.fabSpacer} />

          <TouchableOpacity style={styles.tabItem} onPress={handleProfilePress} activeOpacity={0.7}>
            <View style={styles.tabItemInner}>
              <PersonIcon size={20} color={profileActive ? Colors.navActive : Colors.navInactive} />
              <Text style={[typography.labelSmall, styles.tabLabel, profileActive && styles.tabLabelActive]}>{t('tabBar.profileLabel')}</Text>
              {profileActive && <View style={styles.tabActiveDot} />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.fabRing} pointerEvents="box-none">
          <TouchableOpacity style={styles.fabTouchable} onPress={handleFabPress} activeOpacity={0.85} hitSlop={8}>
            <Animated.Image
              source={require('../../assets/PlusOne.png')}
              tintColor={Colors.navActive}
              resizeMode="contain"
              style={[styles.fabMark, { transform: [{ rotate: fabSpin }] }]}
            />
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
      <Tab.Screen name="QuickAdd" component={EmptyScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_MARGIN = 23;
const TAB_BAR_BOTTOM = Platform.OS === 'ios' ? 22 : 14;
const FAB_SIZE = 54;
const FAB_INNER_SIZE = 28;
const FAB_OVERLAP = 12;
const TAB_BAR_WRAP_HEIGHT = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + FAB_OVERLAP;

const styles = StyleSheet.create({
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
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActiveDot: {
    position: 'absolute',
    bottom: -8,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: Colors.navActive,
  },
  tabLabel: { color: Colors.navInactive },
  tabLabelActive: { color: Colors.navActive },
  fabSpacer: { width: FAB_SIZE + 10 },
  fabRing: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.navFabRing,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabTouchable: {
    width: FAB_INNER_SIZE, height: FAB_INNER_SIZE,
    justifyContent: 'center', alignItems: 'center',
  },
  fabMark: { width: FAB_INNER_SIZE, height: FAB_INNER_SIZE },
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
  menuCardText: { flex: 1 },
  menuItemTitle: { color: Colors.text },
  menuItemSubtitle: { color: Colors.textSecondary, marginTop: 1 },
});
