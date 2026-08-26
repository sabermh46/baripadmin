import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useUpdateAppFeePaymentMutation } from '../../store/api/appFeeApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

/**
 * The methods AppFeePaymentController::CLAIM_METHODS accepts, in the order a Bangladeshi
 * house owner is likeliest to have used. `bank`, not `bank_transfer` — that is the stored
 * value, and sending the alias only makes the server normalise it back.
 */
const METHODS = ['bkash', 'nagad', 'rocket', 'bank', 'cash', 'other'];

const money = (n) => `৳${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const humanDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * "I have paid this" — the house owner's side of a manual payment.
 *
 * This used to open AppFeeViewEditModal with `forceEditable`, which is the admin's edit form.
 * The owner was shown a status dropdown offering Rejected, Overdue and Cancelled for their own
 * invoice, a "Verified notes" box belonging to the person checking the claim, an Invoice URL,
 * the platform's own subscription and grace day counts, a "Send SMS (reserved)" checkbox wired
 * to nothing, and a Delete button.
 *
 * The server accepts exactly four things from a house owner or caretaker: status, method,
 * transaction number, notes. Everything else on that form was silently discarded — so most of
 * what the owner was being asked to think about could not have any effect even in principle.
 *
 * Those four, and nothing else. The method is a row of buttons rather than a <select> because
 * this is the one screen an elderly owner has to get through unaided, and because it makes the
 * "which reference do I need?" hint change as soon as they choose.
 */
const ReportPaymentModal = ({ payment, isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [updatePayment, { isLoading }] = useUpdateAppFeePaymentMutation();

  // Seeded from the invoice, not synced to it by an effect. The parent mounts this per
  // claim with a key, so a fresh invoice is a fresh component and there is nothing to
  // re-sync. Prefilled because after a refusal the owner is usually correcting one digit,
  // not starting again.
  const [method, setMethod] = useState(payment?.payment_method || 'bkash');
  const [reference, setReference] = useState(payment?.transaction_id || '');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const rejected = payment?.metadata?.claim_rejected;
  const alreadyClaimed = !!payment?.metadata?.waiting_for_confirm;
  const referenceNeeded = method !== 'cash';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (referenceNeeded && !reference.trim()) {
      setError(t('transaction_number_required_to_report_payment'));
      return;
    }

    try {
      await updatePayment({
        id: payment.id,
        body: {
          status: 'paid',
          payment_method: method,
          transaction_id: reference.trim() || undefined,
          notes: note.trim() || undefined,
        },
      }).unwrap();
      toast.success(t('payment_submitted_for_verification'));
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_update_payment'))));
    }
  };

  if (!payment) return null;

  const from = humanDate(payment.start_date);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={alreadyClaimed ? t('update_payment_details') : t('i_have_paid_this')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* What is being paid. Stated once, large, so there is no doubt which bill this is. */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('amount')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-0.5">{money(payment.amount)}</p>
          {from && (
            <p className="text-xs text-gray-500 mt-1">
              {t('covers_days_from', { days: payment.subscription_days ?? 30, date: from })}
            </p>
          )}
        </div>

        {rejected && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t('payment_could_not_be_confirmed')}
            </p>
            {rejected.reason && <p className="text-xs text-red-700 mt-1">{rejected.reason}</p>}
            <p className="text-[11px] text-red-600 mt-1">{t('check_transaction_number_and_resubmit')}</p>
          </div>
        )}

        <div>
          <span className="block text-sm font-medium text-gray-800 mb-2">{t('how_did_you_pay')}</span>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMethod(m); setError(null); }}
                  className={`relative px-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {active && <Check className="absolute top-1 right-1 h-3 w-3" />}
                  {t(`method_${m}`)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-800 mb-1">
            {t('transaction_number')}
            {!referenceNeeded && <span className="text-gray-400 font-normal"> · {t('optional_for_cash')}</span>}
          </span>
          <input
            type="text"
            value={reference}
            onChange={(e) => { setReference(e.target.value); setError(null); }}
            placeholder={referenceNeeded ? t('transaction_number_placeholder') : ''}
            className={`w-full px-3 py-2.5 border rounded-lg text-base tracking-wide focus:ring-2 focus:ring-primary focus:border-primary outline-none ${
              error ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {/* Says why it is being asked for, which is the difference between a form field and
              a demand. There is no gateway — this number is the only way anyone can check. */}
          <span className={`block text-xs mt-1 ${error ? 'text-red-600' : 'text-gray-500'}`}>
            {error || (referenceNeeded ? t('transaction_number_why') : t('cash_no_reference_hint'))}
          </span>
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-800 mb-1">
            {t('notes')} <span className="text-gray-400 font-normal">· {t('optional')}</span>
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('anything_else_to_add')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </label>

        <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          {t('what_happens_next_verification')}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('send_for_verification')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportPaymentModal;
