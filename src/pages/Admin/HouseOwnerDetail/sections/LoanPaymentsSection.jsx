import React from 'react';
import { CreditCard } from 'lucide-react';
import { HistoryCard, HistoryList } from './HistorySection';
import { formatAmount, formatDate } from './historyFormat';

const COLUMNS = [
  { header: 'ID', cell: (p) => `#${p.id}` },
  { header: 'Amount', cell: (p) => formatAmount(p.amount), className: 'font-medium' },
  { header: 'Date', cell: (p) => formatDate(p.paid_date ?? p.date ?? p.createdAt) },
];

const LoanPaymentsSection = ({ ownerId }) => (
  <HistoryCard>
    <HistoryList
      ownerId={ownerId}
      section="loan_payments"
      title="Loan Payments"
      icon={CreditCard}
      columns={COLUMNS}
      emptyText="No loan payments"
    />
  </HistoryCard>
);

export default LoanPaymentsSection;
