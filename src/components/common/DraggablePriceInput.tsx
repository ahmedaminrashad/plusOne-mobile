import React, { memo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { centeredInputText } from '../../utils/inputTextStyle';

interface Props {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  onCommit?: () => void;
}

const SIZE = 96;
const EDGE = 16;

/**
 * Floating, draggable amount field pinned bottom-right by default.
 * Used when splitting / assigning bill amounts.
 */
function DraggablePriceInput({ value, onChange, currency = 'EGP', onCommit }: Props) {
  const typography = useTypography();
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const [pos, setPos] = useState({
    x: screenW - SIZE - EDGE,
    y: screenH - SIZE - 140,
  });
  const startRef = useRef(pos);
  startRef.current = pos;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        startRef.current = pos;
      },
      onPanResponderMove: (_, g) => {
        const nextX = Math.min(Math.max(EDGE, startRef.current.x + g.dx), screenW - SIZE - EDGE);
        const nextY = Math.min(Math.max(EDGE + 40, startRef.current.y + g.dy), screenH - SIZE - EDGE);
        setPos({ x: nextX, y: nextY });
      },
      onPanResponderRelease: () => {
        // Snap toward right edge if close
        setPos((p) => ({
          x: p.x > screenW / 2 ? screenW - SIZE - EDGE : EDGE,
          y: p.y,
        }));
      },
    }),
  ).current;

  const handleChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9.,]/g, '');
      onChange(cleaned);
    },
    [onChange],
  );

  return (
    <View
      style={[styles.wrap, { left: pos.x, top: pos.y }]}
      {...panResponder.panHandlers}>
      <Text style={[typography.caption, styles.label]}>{currency}</Text>
      <TextInput
        style={[centeredInputText(typography.amountMedium), styles.input]}
        value={value}
        onChangeText={handleChange}
        onEndEditing={onCommit}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="rgba(255,255,255,0.5)"
        textAlign="center"
        selectTextOnFocus
      />
      <Text style={[typography.caption, styles.hint]}>drag</Text>
    </View>
  );
}

export default memo(DraggablePriceInput);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
    zIndex: 50,
  },
  label: { color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  input: {
    color: '#fff',
    width: '100%',
    padding: 0,
    textAlign: 'center',
  },
  hint: { color: 'rgba(255,255,255,0.45)', marginTop: 2, fontSize: 10 },
});
