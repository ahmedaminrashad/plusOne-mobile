import React, { memo } from 'react';
import { View, Image, Text, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Colors, getAvatarColor } from '../../constants/colors';
import { useTypography } from '../../hooks/useTypography';

interface Props {
  uri?: string | null;
  name?: string | null;
  seed?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: ImageStyle;
}

function Avatar({ uri, name, seed, size = 44, style, imageStyle }: Props) {
  const initials = name ? name.trim()[0]?.toUpperCase() ?? '?' : '?';

  const typography = useTypography();
  const fontSize = size * 0.38;
  const containerStyle = [
    styles.placeholder,
    { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(seed ?? name) },
    style,
  ];

  return (
    <View style={containerStyle}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 } as ImageStyle, imageStyle]}
        />
      ) : (
        <Text style={[typography.labelLarge, styles.initials, { fontSize }]}>{initials}</Text>
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
  initials: { color: Colors.textOnPrimary },
});
