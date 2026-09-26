import React from 'react';
import { Wallet } from 'lucide-react';
import { HistoryCard, HistoryList } from './HistorySection';
import { formatAmount, formatDate } from './historyFormat';

const COLUMNS = [
  { header: 'ID', cell: (r) => `#${r.id}` },
  { header: 'Amount', cell: (r) => formatAmount(r.amount), className: 'font-medium' },
  { header: 'Date', cell: (r) => formatDate(r.paid_date ?? r.date) },
];

// Two independent lists, each paged on its own: a busy owner's rent rows outnumber their
// advances a hundred to one, so a shared pager would page one list through the other's
// emptiness.
const IncomeSection = ({ ownerId }) => (
  <HistoryCard>
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
      <Wallet className="h-4 w-4" />
      Income
    </h3>
    <div className="space-y-4">
      <HistoryList
        ownerId={ownerId}
        section="rent_payments"
        subheading="Rent payments"
        columns={COLUMNS}
        emptyText="No rent received yet"
      />
      <HistoryList
        ownerId={ownerId}
        section="advance_payments"
        subheading="Advance payments"
        columns={COLUMNS}
        emptyText="No advance payments"
      />
    </div>
  </HistoryCard>
);

export default IncomeSection;
