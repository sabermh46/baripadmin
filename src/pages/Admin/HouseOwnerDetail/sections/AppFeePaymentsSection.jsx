import React from 'react';
import { Banknote } from 'lucide-react';
import { invoicePeriod } from '../../../../utils/appFeePeriod';
import { HistoryCard, HistoryList } from './HistorySection';
import { formatAmount, formatDate } from './historyFormat';

const statusClass = (s) =>
  s === 'paid' ? 'bg-green-100 text-green-800' : s === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700';

const COLUMNS = [
  // Period, not the row id. `fee_type` went with it — every row in this table is
  // 'monthly_subscription', so the column printed the same raw enum value on every line and
  // identified nothing.
  { header: 'Period', cell: (p) => invoicePeriod(p) ?? '–', className: 'text-gray-600 whitespace-nowrap' },
  { header: 'Amount', cell: (p) => formatAmount(p.amount), className: 'font-medium' },
  {
    header: 'Status',
    cell: (p) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass(p.status)}`}>{p.status || '–'}</span>,
    className: '',
  },
  { header: 'Paid', cell: (p) => formatDate(p.paid_date) },
];

const AppFeePaymentsSection = ({ ownerId }) => (
  <HistoryCard>
    <HistoryList
      ownerId={ownerId}
      section="app_fees"
      title="App Fee Payments"
      icon={Banknote}
      columns={COLUMNS}
      emptyText="No app fee payments"
    />
  </HistoryCard>
);

export default AppFeePaymentsSection;
