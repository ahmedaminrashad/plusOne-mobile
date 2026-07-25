import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import ComingSoonScreen from '../../components/common/ComingSoonScreen';

function BillsTabScreen() {
  const { t } = useTranslation('navigation');
  return <ComingSoonScreen title={t('appStack.billsTabTitle')} />;
}

export default memo(BillsTabScreen);
