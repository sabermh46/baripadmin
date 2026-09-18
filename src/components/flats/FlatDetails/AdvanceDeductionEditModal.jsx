import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import {
  useDeleteAdvanceDeductionMutation,
  useUpdateAdvanceDeductionMutation,
} from '../../../store/api/flatApi';
import apiErrorMessage from '../../../utils/apiError';

/**
 * Correct or undo one deduction.
 *
 * The screen states the consequence before it happens, because the consequence is not obvious:
 * reducing a deduction gives money back to the advance AND makes the rent it paid fall due
 * again. An owner who expects to be editing a note rather than reopening a settled month is
 * exactly who this modal is for.
 *
 * The server decides whether the edit is allowed - it refuses once a receipt has reached the
 * renter - so its message is shown verbatim rather than second-guessed here.
 */
const AdvanceDeductionEditModal = ({ open, advance, entry, flatId, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [updateDeduction, { isLoading: isSaving }] = useUpdateAdvanceDeductionMutation();
  const [deleteDeduction, { isLoading: isDeleting }] = useDeleteAdvanceDeductionMutation();

  const [amount, setAmount] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [lastEntryId, setLastEntryId] = useState(null);

  // Seed from the entry on open. Derived during render rather than in an effect: an effect
  // would paint one frame of the previous deduction's figure before correcting itself.
  if (entry && entry.id !== lastEntryId) {
    setLastEntryId(entry.id);
    setAmount(String(entry.deducted_amount ?? ''));
    setConfirmingDelete(false);
  }

  if (!open || !entry) return null;

  const original = parseFloat(entry.deducted_amount) || 0;
  const next = parseFloat(amount);
  const valid = Number.isFinite(next) && next >= 0;
  const delta = valid ? next - original : 0;
  const busy = isSaving || isDeleting;

  const handleSave = async () => {
    if (!valid) {
      toast.error(t('enter_a_valid_amount') || 'Enter a valid amount');
      return;
    }
    try {
      await updateDeduction({
        flatId,
        advanceId: advance.id,
        entryId: entry.id,
        deducted_amount: next,
      }).unwrap();
      toast.success(t('deduction_updated') || 'Deduction updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the deduction'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeduction({ flatId, advanceId: advance.id, entryId: entry.id }).unwrap();
      toast.success(t('deduction_reverted') || 'Deduction reverted');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not revert the deduction'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-text">
              {t('edit_deduction') || 'Edit deduction'}
            </h3>
            <p className="mt-0.5 text-xs text-subdued">
              {entry.for_month
                ? `${t('deduction_for_month')}: ${entry.for_month}`
                : (t('no_linked_rent_payment') || 'Not linked to a rent payment')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t('close') || 'Close'}
            className="-mr-1 rounded-lg p-1.5 transition-colors hover:bg-subdued/10"
          >
            <X size={20} />
          </button>
        </div>

        <label htmlFor="deduction-amount" className="mb-1.5 block text-sm font-medium text-subdued">
          {t('amount_deducted') || 'Amount deducted'}
        </label>
        <input
          id="deduction-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          disabled={busy}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-subdued/30 px-3 py-2 text-base focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:text-sm"
        />
        <p className="mt-1.5 text-xs text-subdued">
          {t('was') || 'Was'} <TkSymbol />{original.toLocaleString()}
        </p>

        {/* Spelled out, because "edit a number" and "make a settled month owe rent again" do
            not look like the same action until someone says so. */}
        {valid && Math.abs(delta) > 0.004 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              {delta < 0
                ? (
                  <>
                    <TkSymbol />{Math.abs(delta).toLocaleString()}{' '}
                    {t('will_return_to_advance') || 'goes back to the advance, and the rent it paid becomes due again.'}
                  </>
                )
                : (
                  <>
                    <TkSymbol />{delta.toLocaleString()}{' '}
                    {t('will_take_from_advance') || 'more will be taken from the advance and applied to the rent.'}
                  </>
                )}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {t('confirm_revert') || 'Yes, revert it'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-subdued transition-colors hover:bg-subdued/10"
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={15} />
              {t('revert_deduction') || 'Revert deduction'}
            </button>
          )}

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-subdued/30 px-4 py-2 text-sm font-medium transition-colors hover:bg-subdued/10 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !valid}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvanceDeductionEditModal;
