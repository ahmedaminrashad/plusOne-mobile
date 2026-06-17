import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const showButtonTimer = setTimeout(() => setCanContinue(true), 400);
    const autoTimer = setTimeout(onFinish, 3200);
    return () => {
      clearTimeout(showButtonTimer);
      clearTimeout(autoTimer);
    };
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.logoCard}>
        <Image
          source={require('../../assets/PlusOne.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.appName}>+1 App</Text>
      <Text style={styles.tagline}>
        Simplifying payments, empowering connections
      </Text>

      {canContinue && (
        <TouchableOpacity style={styles.button} onPress={onFinish} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continue to App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: '600',
    marginTop: 24,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 24,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
