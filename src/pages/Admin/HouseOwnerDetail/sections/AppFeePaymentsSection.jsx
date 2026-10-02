import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, CalendarRange } from 'lucide-react';
import SubscriptionTimelineModal from '../../../AppFee/SubscriptionTimelineModal';
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

// The table is the raw invoice list; the timeline is the same owner's subscription day by
// day, exactly as they see it on their own app-fee page.
const AppFeePaymentsSection = ({ ownerId, ownerName }) => {
  const { t } = useTranslation();
  const [timelineOpen, setTimelineOpen] = useState(false);

  return (
    <HistoryCard>
      <HistoryList
        ownerId={ownerId}
        section="app_fees"
        title="App Fee Payments"
        icon={Banknote}
        columns={COLUMNS}
        emptyText="No app fee payments"
        action={
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {t('tl_title')}
          </button>
        }
      />
      <SubscriptionTimelineModal
        houseOwnerId={ownerId ? Number(ownerId) : null}
        ownerName={ownerName}
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
      />
    </HistoryCard>
  );
};

export default AppFeePaymentsSection;
