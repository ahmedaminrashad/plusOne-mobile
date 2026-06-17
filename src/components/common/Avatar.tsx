import React, { memo } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

function Avatar({ uri, name, size = 44, style, imageStyle }: Props) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 } as ImageStyle, imageStyle]}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
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
  initials: { color: Colors.textOnPrimary, fontWeight: '600' },
});
