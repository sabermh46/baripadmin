import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-subdued/10 py-2 last:border-0">
    <span className="shrink-0 text-sm text-subdued">{label}</span>
    <span className="text-right text-sm font-medium break-words">{value ?? '-'}</span>
  </div>
);

/** ISO timestamp to something readable, tolerating the ones that are missing or malformed. */
const stamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date) ? value : format(date, 'dd MMM yyyy, HH:mm');
};

/** 'apply_advance' -> 'Apply advance'. */
const humanise = (value) =>
  (value ? String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : null);

/**
 * Everything recorded about one deduction.
 *
 * The history table shows what fits on a row; this shows the rest - who made the deduction,
 * which path it came through, which rent payment it funded, and what the renter was told. It
 * reads the stored entry rather than re-deriving anything, so what is on screen is exactly what
 * would be reversed if the deduction were later edited.
 */
const AdvanceDeductionDetailsModal = ({ open, entry, onClose }) => {
  const { t } = useTranslation();

  if (!open || !entry) return null;

  const amount = parseFloat(entry.deducted_amount) || 0;
  const isRestore = amount < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-text">
              {isRestore
                ? (t('credit_returned') || 'Credit returned')
                : (t('deduction_details') || 'Deduction details')}
            </h3>
            <p className="mt-0.5 text-xs text-subdued">
              {entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : '-'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close') || 'Close'}
            className="-mr-1 rounded-lg p-1.5 transition-colors hover:bg-subdued/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-0">
          <Row
            label={isRestore ? (t('amount_returned') || 'Amount returned') : (t('amount_deducted') || 'Amount deducted')}
            value={<span className={isRestore ? 'text-green-600' : ''}><TkSymbol />{Math.abs(amount).toLocaleString()}</span>}
          />
          <Row
            label={t('remaining_after') || 'Advance remaining after'}
            value={<><TkSymbol />{(parseFloat(entry.remaining_after) || 0).toLocaleString()}</>}
          />
          <Row label={t('deduction_for_month')} value={entry.for_month} />
          <Row label={t('renter')} value={entry.renter_name} />
          <Row
            label={t('rent_payment') || 'Rent payment'}
            value={entry.rent_payment_id ? `#${entry.rent_payment_id}` : null}
          />
          <Row label={t('recorded_via') || 'Recorded via'} value={humanise(entry.source)} />
          <Row label={t('recorded_by') || 'Recorded by'} value={entry.created_by_name} />
          <Row
            label={t('emailed') || 'Emailed'}
            value={entry.emailed > 0 ? `${entry.emailed}×` : (t('not_sent') || 'Not sent')}
          />
          <Row
            label={t('smsed') || 'SMS sent'}
            value={entry.smsed > 0 ? `${entry.smsed}×` : (t('not_sent') || 'Not sent')}
          />
          <Row label={t('recorded_at') || 'Recorded at'} value={stamp(entry.created_at)} />
          {entry.updated_at && entry.updated_at !== entry.created_at && (
            <Row label={t('last_updated') || 'Last updated'} value={stamp(entry.updated_at)} />
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subdued/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-subdued/10"
          >
            {t('close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvanceDeductionDetailsModal;
