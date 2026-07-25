import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import ComingSoonScreen from '../../components/common/ComingSoonScreen';

function ActivityScreen() {
  const { t } = useTranslation('navigation');
  return <ComingSoonScreen title={t('appStack.activityTabTitle')} />;
}

export default memo(ActivityScreen);
