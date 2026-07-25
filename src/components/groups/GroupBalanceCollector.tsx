import { useEffect } from 'react';
import { useGetGroupLedgerQuery } from '../../store/api/ledgerApi';

interface Props {
  groupId: string;
  onBalance: (groupId: string, netPiastres: number) => void;
}

// Invisible helper: the backend only exposes a per-group ledger endpoint, so a
// cross-group total (shown on the Home dashboard) is assembled client-side by
// mounting one of these per group and collecting each result.
export default function GroupBalanceCollector({ groupId, onBalance }: Props) {
  const { data: ledger } = useGetGroupLedgerQuery(groupId);

  useEffect(() => {
    if (ledger) onBalance(groupId, ledger.currentUserNetBalance);
  }, [ledger, groupId, onBalance]);

  return null;
}
