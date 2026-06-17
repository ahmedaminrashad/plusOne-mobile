import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';

type Props = AuthScreenProps<'Welcome'>;

function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image source={require('../../../assets/PlusOne.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>+one</Text>
          <Text style={styles.tagline}>اقسّم، تتبّع، وسوّى مع صحابك</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="ابدأ الآن"
            onPress={() => navigation.navigate('PhoneEntry')}
            style={styles.primaryBtn}
          />
          <Text style={styles.terms}>
            بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default memo(WelcomeScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 48 },
  logoSection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  logo: { width: 100, height: 100, marginBottom: 8 },
  appName: { fontSize: 40, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  tagline: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  actions: { gap: 16 },
  primaryBtn: { width: '100%' },
  terms: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
