import { useEffect } from 'react';
import { useGetGroupLedgerQuery, GroupLedgerResponse } from '../../store/api/ledgerApi';

interface Props {
  groupId: string;
  onLedger: (groupId: string, ledger: GroupLedgerResponse) => void;
}

// Same invisible-collector pattern as GroupBalanceCollector, but forwards the
// full per-group ledger (monthly total + net balance) for screens that need
// more than just the net balance — e.g. My Ledger's monthly spend view.
export default function GroupLedgerCollector({ groupId, onLedger }: Props) {
  const { data: ledger } = useGetGroupLedgerQuery(groupId);

  useEffect(() => {
    if (ledger) onLedger(groupId, ledger);
  }, [ledger, groupId, onLedger]);

  return null;
}
