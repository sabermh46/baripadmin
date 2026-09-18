import React, { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  Banknote, History, Loader2, Pencil, Trash2, X,
} from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import ConfirmationModal from '../../common/ConfirmationModal';
import AdvanceDeductionHistory from './AdvanceDeductionHistory';
import { advanceStatusLabel, advanceStatusToneClass } from '../../../utils/advanceStatus';
import { useDeleteAdvancePaymentMutation } from '../../../store/api/flatApi';
import apiErrorMessage from '../../../utils/apiError';

const money = (value) => (parseFloat(value) || 0).toLocaleString();

const Fact = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-subdued">{label}</dt>
    <dd className="mt-0.5 truncate text-sm font-medium text-text">{value ?? '-'}</dd>
  </div>
);

/**
 * Everything about one advance payment, including what it has been spent on.
 *
 * WHY THE HISTORY LIVES HERE
 * --------------------------
 * It used to expand inside the Advance Payment History table. That put a table inside a table
 * and forced the outer one to carry every column both views needed, so the row a landlord scans
 * most often - "how much of this is left?" - was buried among figures that only matter once you
 * are already investigating one advance.
 *
 * So the outer table keeps the three numbers worth scanning and this modal takes the rest: the
 * breakdown, the payment particulars, and the deduction history with its own actions.
 */
const AdvancePaymentDetailsModal = ({
  open,
  advance,
  flatId,
  onClose,
  onEdit,
  onSuccess,
  onViewDeduction,
  onSendDeduction,
  onEditDeduction,
}) => {
  const { t } = useTranslation();
  const [deleteAdvancePayment, { isLoading: isDeleting }] = useDeleteAdvancePaymentMutation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!open || !advance) return null;

  const received = parseFloat(advance.paid_amount ?? advance.amount) || 0;
  const remaining = parseFloat(advance.remaining_amount) || 0;
  const used = Math.max(0, received - remaining);
  const usedPercent = received > 0 ? Math.min(100, (used / received) * 100) : 0;
  const deductions = advance.deductions ?? [];

  const handleDelete = async () => {
    try {
      await deleteAdvancePayment({ flatId, advanceId: advance.id }).unwrap();
      toast.success(t('advance_payment_deleted') || 'Advance payment deleted');
      setConfirmingDelete(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete advance payment'));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4">
        <div className="flex h-full w-full flex-col bg-surface sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl sm:shadow-xl">

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-subdued/20 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-green-100 text-green-700">
                <Banknote size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-text sm:text-lg">
                  {t('advance_payment_details') || 'Advance payment'}
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subdued">
                  <span>ADV-{String(advance.id).padStart(6, '0')}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {advance.payment_date
                      ? format(new Date(advance.payment_date), 'dd MMM yyyy')
                      : '-'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${advanceStatusToneClass(advance.status)}`}
                  >
                    {advanceStatusLabel(t, advance.status)}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close') || 'Close'}
              className="-mr-1 shrink-0 rounded-lg p-2 transition-colors hover:bg-subdued/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">

            {/* The balance, and how it got there. The remaining figure leads because it is the
                one a landlord actually acts on. */}
            <div className="rounded-xl border border-subdued/20 bg-background p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-subdued">
                    {t('remaining_available') || 'Remaining available'}
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-green-600">
                    <TkSymbol />{money(remaining)}
                  </p>
                </div>
                <dl className="flex gap-6 text-right">
                  <Fact label={t('advance_received') || 'Received'} value={<><TkSymbol />{money(received)}</>} />
                  <Fact label={t('applied_to_rent') || 'Applied to rent'} value={<><TkSymbol />{money(used)}</>} />
                </dl>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-subdued/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-subdued">
                {usedPercent.toFixed(0)}% {t('of_advance_applied') || 'of this advance has been applied to rent'}
              </p>
            </div>

            {/* Particulars: the things you look up rather than scan. */}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Fact
                label={t('method')}
                value={advance.payment_method?.replace(/_/g, ' ') || '-'}
              />
              <Fact label={t('transaction_id')} value={advance.transaction_id} />
              <Fact
                label={t('recorded_at') || 'Recorded at'}
                value={advance.created_at ? format(new Date(advance.created_at), 'dd MMM yyyy') : '-'}
              />
            </dl>

            {advance.notes && (
              <div className="mt-4 rounded-lg border border-subdued/20 bg-background p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-subdued">
                  {t('notes')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">{advance.notes}</p>
              </div>
            )}

            {/* Deduction history */}
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-subdued">
                <History size={13} />
                {t('deduction_history') || 'Deduction history'}
                {deductions.length > 0 && (
                  <span className="rounded-full bg-subdued/15 px-2 py-0.5 text-[10px] font-semibold text-subdued">
                    {deductions.length}
                  </span>
                )}
              </p>
              <div className="rounded-lg border border-subdued/20">
                <AdvanceDeductionHistory
                  deductions={deductions}
                  onView={onViewDeduction}
                  onSend={(entry) => onSendDeduction?.(advance, entry)}
                  onEdit={onEditDeduction ? (entry) => onEditDeduction(advance, entry) : undefined}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-subdued/20 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl sm:px-5">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:justify-start"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t('delete')}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-subdued/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-subdued/10 sm:flex-none"
              >
                {t('close') || 'Close'}
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(advance)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:flex-none"
              >
                <Pencil size={16} />
                {t('edit')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title={t('delete_advance_payment')}
        message={t('are_you_sure_you_want_to_delete_this_advance_payment_this_action_cannot_be_undone')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default AdvancePaymentDetailsModal;
