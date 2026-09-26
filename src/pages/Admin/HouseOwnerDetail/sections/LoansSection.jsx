import React from 'react';
import { Landmark } from 'lucide-react';
import { HistoryCard, HistoryList } from './HistorySection';
import { formatAmount, formatDate } from './historyFormat';

const COLUMNS = [
  { header: 'ID', cell: (l) => `#${l.id}` },
  { header: 'Amount', cell: (l) => formatAmount(l.amount), className: 'font-medium' },
  { header: 'Source / Note', cell: (l) => l.source ?? l.note ?? '–' },
  { header: 'Date', cell: (l) => formatDate(l.date ?? l.createdAt) },
];

const LoansSection = ({ ownerId }) => (
  <HistoryCard>
    <HistoryList ownerId={ownerId} section="loans" title="Loans" icon={Landmark} columns={COLUMNS} emptyText="No loans" />
  </HistoryCard>
);

export default LoansSection;
