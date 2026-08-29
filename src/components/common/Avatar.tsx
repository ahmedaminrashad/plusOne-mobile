import React, { memo } from 'react';
import { View, Image, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle, Platform } from 'react-native';
import { Colors, getAvatarColor } from '../../constants/colors';
import { useTypography } from '../../hooks/useTypography';

interface Props {
  uri?: string | null;
  name?: string | null;
  seed?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: ImageStyle;
  /** Saffron +one mark for a ghost / +1 (not on the app yet). */
  ghost?: boolean;
}

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'md']);

function initialFromName(name?: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const word = words.find((w) => !HONORIFICS.has(w.replace(/[.]/g, '').toLowerCase())) ?? words[0];
  const letter = word?.[0];
  return letter ? letter.toUpperCase() : '?';
}

function Avatar({ uri, name, seed, size = 44, style, imageStyle, ghost }: Props) {
  const initials = initialFromName(name);

  const typography = useTypography();
  const fontSize = size * 0.38;
  const containerStyle = [
    styles.placeholder,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: ghost ? Colors.surface : getAvatarColor(seed ?? name),
    },
    ghost && styles.ghost,
    style,
  ];

  if (ghost) {
    const mark = Math.max(12, size * 0.55);
    return (
      <View style={containerStyle}>
        <Image
          source={require('../../../assets/PlusOne.png')}
          tintColor={Colors.accent}
          resizeMode="contain"
          style={{ width: mark, height: mark }}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 } as ImageStyle, imageStyle]}
        />
      ) : (
        <Text
          style={[
            typography.labelLarge,
            styles.initials,
            {
              fontSize,
              lineHeight: fontSize,
              includeFontPadding: false,
              ...(Platform.OS === 'ios' ? { paddingTop: 1 } : null),
            },
          ]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

export default memo(Avatar);

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.borderLight },
  placeholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: Colors.textOnPrimary, textAlign: 'center' },
  ghost: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
});
