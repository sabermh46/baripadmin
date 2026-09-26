import React from 'react';
import { Receipt } from 'lucide-react';
import { HistoryCard, HistoryList } from './HistorySection';
import { formatAmount, formatDate } from './historyFormat';

const COLUMNS = [
  { header: 'ID', cell: (e) => `#${e.id}` },
  { header: 'Amount', cell: (e) => formatAmount(e.amount), className: 'font-medium' },
  { header: 'Category / Note', cell: (e) => e.category ?? e.note ?? '–' },
  { header: 'Date', cell: (e) => formatDate(e.date ?? e.createdAt) },
];

const ExpensesSection = ({ ownerId }) => (
  <HistoryCard>
    <HistoryList ownerId={ownerId} section="expenses" title="Expenses" icon={Receipt} columns={COLUMNS} emptyText="No expenses" />
  </HistoryCard>
);

export default ExpensesSection;
