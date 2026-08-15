import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SafeScreen from './SafeScreen';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { useTypography } from '../../hooks/useTypography';
import { ChevronLeftIcon } from '../icons';

interface Props {
  title: string;
  onBack?: () => void;
}

function ComingSoonScreen({ title, onBack }: Props) {
  const { t } = useTranslation('common');
  const typography = useTypography();
  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <ChevronLeftIcon size={20} color={Colors.accent} />
          </TouchableOpacity>
        )}
        <Text style={[typography.headingLarge, styles.title]}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[typography.bodyLarge, styles.message]}>{t('comingSoon.message')}</Text>
      </View>
    </SafeScreen>
  );
}

export default memo(ComingSoonScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  title: { color: Colors.text },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  message: { color: Colors.textSecondary, textAlign: 'center' },
});
