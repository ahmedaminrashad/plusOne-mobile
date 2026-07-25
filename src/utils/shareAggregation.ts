import { MyShare } from '../store/api/sharesApi';

export interface AggregateShareRow {
  key: string;
  counterpartId: string | null;
  counterpartPhone: string | null;
  counterpartName: string;
  groupId: string;
  groupName: string;
  amountPiastres: number;
  billId: string;
  billName: string;
  shareIds: string[];
  anyInitiated: boolean;
}

/** Collapses individual shares into one row per (counterpart, group) pair —
 * Settle Up and Remind both show a single amount per person per group rather
 * than one row per underlying bill share. */
export function aggregateSharesByCounterpart(shares: MyShare[], byInitiator: boolean): AggregateShareRow[] {
  const rows = new Map<string, AggregateShareRow>();
  for (const share of shares) {
    const counterpart = byInitiator ? share.owner : share.initiator;
    const counterpartId = byInitiator ? share.ownerUserId : share.initiatorUserId;
    const counterpartPhone = byInitiator ? share.ownerPendingPhone : null;
    const key = `${counterpartId ?? counterpartPhone}::${share.groupId}`;
    const existing = rows.get(key);
    if (existing) {
      existing.amountPiastres += share.amountPiastres;
      existing.shareIds.push(share.id);
      if (share.status === 'initiated') existing.anyInitiated = true;
    } else {
      rows.set(key, {
        key,
        counterpartId,
        counterpartPhone,
        counterpartName: counterpart?.displayName ?? counterpartPhone ?? '',
        groupId: share.groupId,
        groupName: share.group?.name ?? '',
        amountPiastres: share.amountPiastres,
        billId: share.billId,
        billName: share.bill?.venueName ?? share.bill?.title ?? '',
        shareIds: [share.id],
        anyInitiated: share.status === 'initiated',
      });
    }
  }
  return [...rows.values()];
}
