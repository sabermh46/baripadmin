import React from 'react';
import { apiErrorMessage } from '../../utils/apiError';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, Filter, Mail, Phone, Plus } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useGetAppFeeBreakdownQuery } from '../../store/api/appFeeApi';

const money = (n) =>
  n == null ? '–' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatDate = (d) => {
  if (!d) return '–';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
};

/**
 * Title/description per tile. The title deliberately reuses the tile's own label key so the
 * modal header reads as the same thing the admin just clicked — a different wording here
 * would leave them wondering whether they opened the right panel.
 */
const METRICS = {
  collected_this_month: { titleKey: 'collected_this_month', descKey: 'breakdown_collected_desc' },
  outstanding: { titleKey: 'outstanding', descKey: 'breakdown_outstanding_desc' },
  pending_verification: {
    titleKey: 'awaiting_your_verification',
    descKey: 'breakdown_pending_verification_desc',
    quickFilter: 'awaiting_verification',
  },
  monthly_recurring: { titleKey: 'monthly_recurring', descKey: 'breakdown_monthly_recurring_desc' },
  active_subscriptions: { titleKey: 'active_subscriptions', descKey: 'breakdown_active_subscriptions_desc' },
  never_started: { titleKey: 'app_fee_not_started', descKey: 'breakdown_never_started_desc' },
  in_grace: { titleKey: 'in_grace_period', descKey: 'breakdown_in_grace_desc' },
  blocked: { titleKey: 'blocked_lapsed', descKey: 'breakdown_blocked_desc' },
};

const STATE_STYLES = {
  active: 'bg-emerald-100 text-emerald-800',
  grace: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
  never_started: 'bg-gray-200 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-800',
};

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

const Chip = ({ className, children }) => (
  <span className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${className}`}>
    {children}
  </span>
);

const OwnerCell = ({ row }) => (
  <div className="min-w-0">
    <p className="font-medium text-gray-900 truncate">{row.name ?? `#${row.houseOwnerId}`}</p>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
      {row.email && (
        <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 hover:text-primary truncate">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{row.email}</span>
        </a>
      )}
      {row.phone && (
        <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
          <Phone className="h-3 w-3 shrink-0" />
          {row.phone}
        </a>
      )}
    </div>
  </div>
);

/**
 * Invoice-level rows: collected this month, outstanding, awaiting verification.
 * Clicking a row opens the existing view/edit modal, so the number is not just visible but
 * actionable from here.
 */
const PaymentsTable = ({ rows, onOpenPayment, t }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
        <th className="py-2 pr-3 font-medium">{t('house_owner')}</th>
        <th className="py-2 px-3 font-medium text-right">{t('amount')}</th>
        <th className="py-2 px-3 font-medium">{t('status')}</th>
        <th className="py-2 px-3 font-medium">{t('start_date')}</th>
        <th className="py-2 px-3 font-medium">{t('paid_date')}</th>
        <th className="py-2 pl-3 font-medium">{t('method')}</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {rows.map((row) => (
        <tr
          key={row.id}
          onClick={() => onOpenPayment?.(row.id)}
          className={onOpenPayment ? 'cursor-pointer hover:bg-gray-50' : ''}
        >
          <td className="py-2 pr-3 max-w-[220px]">
            <OwnerCell row={row} />
          </td>
          <td className="py-2 px-3 text-right font-medium text-gray-900 whitespace-nowrap">
            {money(row.amount)}
          </td>
          <td className="py-2 px-3">
            <div className="flex flex-col items-start gap-1">
              <Chip className={STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-700'}>
                {t(row.status)}
              </Chip>
              {row.awaitingVerification && (
                <Chip className="bg-amber-50 text-amber-700">{t('awaiting_verification')}</Chip>
              )}
              {row.daysOutstanding > 0 && (
                <span className="text-[11px] text-red-600">
                  {t('days_outstanding', { count: row.daysOutstanding })}
                </span>
              )}
            </div>
          </td>
          <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{formatDate(row.startDate)}</td>
          <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{formatDate(row.paidDate)}</td>
          <td className="py-2 pl-3 text-gray-600">
            <p>{row.paymentMethod || '–'}</p>
            {row.transactionId && (
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-[140px]">
                {row.transactionId}
              </p>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * Owner-level rows: subscription health tiles and MRR.
 *
 * The "days" column is the one number that changes meaning with state — remaining while
 * active, grace left while in grace, since-expiry once blocked — so it is rendered from the
 * state rather than from one field, which is exactly the confusion the old page created.
 */
const OwnersTable = ({ rows, onFilterOwner, onStartAppFee, t }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
        <th className="py-2 pr-3 font-medium">{t('house_owner')}</th>
        <th className="py-2 px-3 font-medium">{t('subscription_state')}</th>
        <th className="py-2 px-3 font-medium text-right">{t('active_houses')}</th>
        <th className="py-2 px-3 font-medium text-right">{t('monthly')}</th>
        <th className="py-2 px-3 font-medium">{t('valid_through')}</th>
        <th className="py-2 px-3 font-medium">{t('last_paid')}</th>
        {onStartAppFee && <th className="py-2 pl-3 font-medium text-right sr-only">{t('actions')}</th>}
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {rows.map((row) => (
        <tr
          key={row.houseOwnerId}
          onClick={() => onFilterOwner?.(row.houseOwnerId)}
          className={onFilterOwner ? 'cursor-pointer hover:bg-gray-50' : ''}
        >
          <td className="py-2 pr-3 max-w-[220px]">
            <OwnerCell row={row} />
          </td>
          <td className="py-2 px-3">
            <div className="flex flex-col items-start gap-1">
              <Chip className={STATE_STYLES[row.state] ?? 'bg-gray-100 text-gray-700'}>
                {t(`state_${row.state}`)}
              </Chip>
              {row.state === 'active' && (
                <span className="text-[11px] text-gray-500">
                  {row.daysRemaining === 0 ? t('expires_today') : t('days_left', { count: row.daysRemaining })}
                </span>
              )}
              {row.state === 'grace' && (
                <span className="text-[11px] text-amber-700">
                  {t('grace_days_left', { count: row.graceDaysRemaining })}
                </span>
              )}
              {row.state === 'blocked' && row.daysSinceExpiry != null && (
                <span className="text-[11px] text-red-600">
                  {t('expired_days_ago', { count: row.daysSinceExpiry })}
                </span>
              )}
            </div>
          </td>
          <td className="py-2 px-3 text-right text-gray-700">{row.activeHouses}</td>
          <td className="py-2 px-3 text-right font-medium text-gray-900 whitespace-nowrap">
            {money(row.monthlyAmount)}
          </td>
          <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
            {row.validThrough ? formatDate(row.validThrough) : t('never')}
            {row.coveredDaysTotal > 0 && (
              <p className="text-[11px] text-gray-400">
                {t('days_covered_total', { count: row.coveredDaysTotal })}
              </p>
            )}
          </td>
          <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
            {row.lastPaidDate ? (
              <>
                {formatDate(row.lastPaidDate)}
                <p className="text-[11px] text-gray-400">{money(row.lastPaidAmount)}</p>
              </>
            ) : (
              t('never')
            )}
          </td>
          {/* Reading that an owner has never been billed and then having to leave, find the
              create button and search for them again is the gap this closes. stopPropagation
              because the row itself filters the table — a different, weaker action. */}
          {onStartAppFee && (
            <td className="py-2 pl-3 text-right">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onStartAppFee(row.houseOwnerId); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 whitespace-nowrap"
              >
                <Plus className="h-3 w-3" />
                {row.state === 'never_started' ? t('start_app_fee') : t('new_invoice')}
              </button>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  </table>
);

const SkeletonRows = () => (
  <div className="space-y-2 py-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
    ))}
  </div>
);

/**
 * The detail behind one overview tile.
 *
 * `skip` while closed matters: without it every one of the eight tiles would fetch on mount
 * of the page, which is the cost the tiles were split out to avoid.
 */
const AppFeeMetricModal = ({ metric, isOpen, onClose, onOpenPayment, onApplyQuickFilter, onFilterOwner, onStartAppFee }) => {
  const { t } = useTranslation();
  const config = metric ? METRICS[metric] : null;

  const { data, isLoading, isFetching, error } = useGetAppFeeBreakdownQuery(metric, {
    skip: !isOpen || !config,
  });

  const rows = data?.rows ?? [];
  const truncated = data ? data.total > rows.length : false;

  return (
    <Modal
      isOpen={isOpen && !!config}
      onClose={onClose}
      size="xl"
      title={config ? t(config.titleKey) : ''}
      subtitle={config ? t(config.descKey) : ''}
    >
      <div className="-mt-2">
        {/* Totals restated here so the panel is self-verifying: if this disagrees with the
            tile the admin clicked, something is wrong and they can see it immediately. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pb-3 mb-3 border-b border-gray-200">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('total')}</p>
            <p className="text-lg font-semibold text-gray-900">{data?.total ?? '–'}</p>
          </div>
          {data?.totalAmount != null && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{t('total_amount')}</p>
              <p className="text-lg font-semibold text-gray-900">{money(data.totalAmount)}</p>
            </div>
          )}
          {config?.quickFilter && onApplyQuickFilter && rows.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onApplyQuickFilter(config.quickFilter);
                onClose();
              }}
              className="ml-auto inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
            >
              <Filter className="h-3.5 w-3.5" />
              {t('show_in_table')}
            </button>
          )}
        </div>

        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {apiErrorMessage(error, t('something_went_wrong'))}
          </div>
        ) : isLoading ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">{t('nothing_to_show_here')}</p>
        ) : (
          <div className={`overflow-x-auto max-h-[60vh] overflow-y-auto ${isFetching ? 'opacity-60' : ''}`}>
            {data.kind === 'payments' ? (
              <PaymentsTable rows={rows} onOpenPayment={onOpenPayment} t={t} />
            ) : (
              <OwnersTable rows={rows} onFilterOwner={onFilterOwner} onStartAppFee={onStartAppFee} t={t} />
            )}
          </div>
        )}

        {truncated && (
          <p className="text-[11px] text-gray-500 mt-3">
            {t('showing_first_n_of_total', { count: rows.length, total: data.total })}
          </p>
        )}

        {rows.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-2 inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {data.kind === 'payments' ? t('click_row_to_open_invoice') : t('click_row_to_filter_owner')}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default AppFeeMetricModal;
