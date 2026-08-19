import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Banknote, CalendarDays, Hash, Smartphone, User } from 'lucide-react';
import Modal from '../../components/common/Modal';

/**
 * The admin's side of the manual payment loop.
 *
 * There is no gateway. An owner pays by hand — bKash, Nagad, Rocket, a bank transfer, or cash
 * — and reports it with the transaction number. The only thing that can confirm it is a human
 * opening the matching account and finding that reference.
 *
 * The admin table used to offer a one-click "Mark paid" button that did exactly that: marked
 * an invoice settled without ever showing the transaction number, the wallet used, or the
 * amount claimed. An admin was being asked to confirm money had arrived with none of the
 * evidence on screen.
 *
 * This dialog puts the claim in front of them and makes the two outcomes explicit and equal:
 * confirm it, or send it back with a reason.
 */

const METHOD_LABELS = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank: 'Bank transfer',
  mobile_banking: 'Mobile banking',
  cash: 'Cash',
  other: 'Other',
};

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString()}`);

const fmt = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const Field = ({ icon: Icon, label, value, emphasise }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`${emphasise ? 'text-base font-semibold font-mono break-all' : 'text-sm'} text-gray-900`}
      >
        {value}
      </p>
    </div>
  </div>
);

const VerifyClaimModal = ({ payment, isOpen, onClose, onConfirm, onReject, isSaving }) => {
  const { t } = useTranslation();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!payment) return null;

  const claim = payment.metadata?.claim ?? null;
  // Fall back to the invoice's own columns for claims made before the richer claim record
  // existed, so older rows still show something useful rather than an empty dialog.
  const method = claim?.method ?? payment.payment_method;
  const reference = claim?.transactionId ?? payment.transaction_id;
  const isCash = method === 'cash';

  const close = () => {
    setRejecting(false);
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="lg"
      title={t('verify_payment_claim')}
      subtitle={t('verify_payment_claim_hint')}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field icon={User} label={t('house_owner')} value={payment.house_owner_name ?? `#${payment.house_owner_id}`} />
          <Field icon={Banknote} label={t('amount')} value={money(payment.amount)} />
          <Field
            icon={Smartphone}
            label={t('paid_via')}
            value={METHOD_LABELS[method] ?? method ?? '—'}
          />
          <Field icon={CalendarDays} label={t('reported_on')} value={fmt(claim?.at ?? payment.updated_at)} />
        </div>

        {/* The transaction number is the whole point of the screen, so it is given its own
            block rather than sitting as one field among six. */}
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <Field
            icon={Hash}
            label={isCash ? t('cash_payment_no_reference') : t('transaction_number_to_match')}
            value={isCash ? t('handed_over_in_person') : reference || t('no_reference_supplied')}
            emphasise={!isCash}
          />
          {claim?.byRole === 'caretaker' && (
            <p className="text-xs text-amber-700 mt-3">
              {t('claim_submitted_by_caretaker', { name: claim.byName })}
            </p>
          )}
        </div>

        {!isCash && !reference && (
          <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {t('claim_has_no_reference_warning')}
          </div>
        )}

        {rejecting ? (
          <div className="space-y-2">
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-800">
              {t('why_could_it_not_be_confirmed')}
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reject_reason_placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <p className="text-xs text-gray-500">{t('reject_reason_is_sent_to_owner')}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">{t('confirm_only_after_matching')}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {t('cancel')}
          </button>

          {rejecting ? (
            <button
              type="button"
              onClick={() => onReject(payment.id, reason.trim())}
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {t('send_back_to_owner')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {t('could_not_find_it')}
            </button>
          )}

          {!rejecting && (
            <button
              type="button"
              onClick={() => onConfirm(payment.id)}
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {t('i_found_this_payment')}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VerifyClaimModal;
