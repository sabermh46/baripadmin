import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Building2, CalendarDays, CalendarPlus, Check, ChevronDown, Hash, Loader2, Mail, Smartphone, Trash2, User,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useAuth } from '../../hooks';
import {
  useDeleteAppFeePaymentMutation,
  useGetAppFeePaymentQuery,
  useUpdateAppFeePaymentMutation,
} from '../../store/api/appFeeApi';
import { invoicePeriod } from '../../utils/appFeePeriod';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

// The values the API stores. `bank`, not `bank_transfer` — sending the alias only makes the
// server normalise it back.
const METHODS = ['bkash', 'nagad', 'rocket', 'bank', 'mobile_banking', 'cash', 'other'];

/**
 * What an admin can set, and what each choice means for the owner. `overdue` is derived from
 * the due date everywhere else in the app, so it is not offered as something to type in by
 * hand — that only ever produced a status the rest of the system would disagree with.
 */
const STATUSES = ['pending', 'paid', 'rejected', 'cancelled'];

const STATUS_TONE = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-200 text-gray-700',
  overdue: 'bg-red-100 text-red-800',
};

const money = (n) => (n == null ? '—' : `৳${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

const day = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const stamp = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const dateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

const Summary = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-2 min-w-0">
    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  </div>
);

/**
 * One app-fee invoice, for the people who verify them. Opened from the admin table and from
 * the overview breakdown.
 *
 * It was a flat list of every column on the row: status, paid date, method, transaction id,
 * notes, verified notes, invoice URL, subscription days, offset days, two checkboxes. Three
 * of those did nothing —
 *   · `verified_notes` is not in the update endpoint's validation rules, so it was discarded
 *     on arrival;
 *   · "Send SMS (reserved)" had no consumer anywhere;
 *   · "Send email" was not validated either, so `$data['sendMail'] ?? true` always resolved
 *     true and unticking it changed nothing (now fixed server-side).
 * — and "Due date" read a field that is neither a column nor in the payload, so it rendered
 * "–" for every invoice ever opened.
 *
 * The bigger problem was the bare status dropdown. Flipping it to Paid settles an invoice,
 * and VerifyClaimModal exists precisely because settling one without the transaction number
 * on screen is asking an admin to confirm money arrived with nothing to match it against.
 * The same unsafe action was reachable here, one door along, with no evidence shown at all.
 * So an outstanding claim is now surfaced in this dialog, above the control that resolves it,
 * and refusing one asks for the reason the API has always accepted and this form never sent.
 */
const AppFeeViewEditModal = ({ paymentId, isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { isWebOwner, isStaff } = useAuth();
  const canEdit = isWebOwner || isStaff;

  const { data: paymentResponse, isLoading } = useGetAppFeePaymentQuery(paymentId, {
    skip: !isOpen || !paymentId,
  });
  const payment = paymentResponse?.data;

  const [updatePayment, { isLoading: isUpdating }] = useUpdateAppFeePaymentMutation();
  const [deletePayment, { isLoading: isDeleting }] = useDeleteAppFeePaymentMutation();

  // Only what the admin has actually changed, laid over the fetched row.
  //
  // The obvious shape — copy the row into form state — needs an effect to seed it, because
  // the row arrives from the network after mount. Holding the diff instead means the fetched
  // row IS the baseline: no effect, no re-sync when a refetch lands, and "dirty" is simply
  // "is there anything in here that differs". The parent mounts this keyed by invoice id, so
  // opening a different one starts empty.
  const [changes, setChanges] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const original = useMemo(() => ({
    status: payment?.status ?? 'pending',
    paid_date: dateInput(payment?.paid_date),
    payment_method: payment?.payment_method ?? 'other',
    transaction_id: payment?.transaction_id ?? '',
    notes: payment?.notes ?? '',
    rejection_reason: '',
    invoice_url: payment?.invoice_url ?? '',
    subscription_days: payment?.subscription_days ?? '',
    offset_days: payment?.offset_days ?? '',
  }), [payment]);

  const form = { ...original, sendMail: true, startNextPeriod: true, ...changes };

  // What confirming this would schedule next, for display only — the server derives the real
  // date from the owner's whole coverage history.
  const nextStart = (() => {
    if (!payment?.start_date) return null;
    const d = new Date(payment.start_date);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + (Number(payment.subscription_days) || 30));
    return day(d);
  })();

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setChanges((prev) => ({ ...prev, [key]: value }));
  };

  // sendMail is excluded on purpose: it describes how to announce a change, so on its own
  // there is nothing to announce and Save should stay disabled.
  const dirty = Object.keys(original).some((k) => form[k] !== original[k]);

  const claim = payment?.metadata?.claim ?? null;
  const awaitingClaim = !!payment?.metadata?.waiting_for_confirm;
  const rejected = payment?.metadata?.claim_rejected ?? null;

  // Answering an outstanding claim with anything other than "paid" is a refusal, and the
  // owner is told about it — so this is the moment to ask why, not after the fact.
  const refusingClaim = awaitingClaim && form?.status && form.status !== 'paid';

  // Plain derivation. It was memoised on two specific fields, which the React Compiler
  // refuses to preserve because it infers the whole `payment` object — and formatting two
  // dates is not worth a barrier to compilation.
  const coverage = (() => {
    if (!payment?.start_date) return null;
    const start = new Date(payment.start_date);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + (Number(payment.subscription_days) || 30) - 1);
    return `${day(start)} – ${day(end)}`;
  })();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dirty) return;

    if (form.status === 'paid' && form.payment_method !== 'cash' && !form.transaction_id.trim()) {
      toast.error(t('transaction_number_required_to_report_payment'));
      return;
    }

    const body = {
      status: form.status || undefined,
      paid_date: form.paid_date || undefined,
      payment_method: form.payment_method || undefined,
      transaction_id: form.transaction_id.trim() || undefined,
      notes: form.notes.trim() || undefined,
      invoice_url: form.invoice_url.trim() || undefined,
      sendMail: form.sendMail,
      start_next_period: form.status === 'paid' && original.status !== 'paid' ? form.startNextPeriod : undefined,
    };
    if (refusingClaim && form.rejection_reason.trim()) body.rejection_reason = form.rejection_reason.trim();
    if (form.subscription_days !== '') body.subscription_days = Number(form.subscription_days);
    if (form.offset_days !== '') body.offset_days = Number(form.offset_days);

    try {
      await updatePayment({ id: paymentId, body }).unwrap();
      toast.success(t('payment_updated'));
      setChanges({});
      onSuccess?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_update_payment'))));
    }
  };

  const handleDelete = async () => {
    try {
      await deletePayment(paymentId).unwrap();
      toast.success(t('payment_deleted'));
      setConfirmDelete(false);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_delete_payment'))));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={payment ? `${t('app_fee')} · ${invoicePeriod(payment) ?? ''}`.trim() : t('app_fee')}
        subtitle={payment?.house_owner_name || undefined}
      >
        {isLoading || !payment ? (
          <div className="py-10 text-center text-gray-500">{t('loading')}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* The invoice itself, stated before anything editable. */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-gray-900">{money(payment.amount)}</p>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${STATUS_TONE[payment.status] || 'bg-gray-100 text-gray-700'}`}>
                  {t(`status_${payment.status}`, payment.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <Summary icon={User} label={t('house_owner')} value={payment.house_owner_name ?? '—'} />
                <Summary icon={Building2} label={t('active_houses')} value={payment.house_count ?? '—'} />
                <Summary icon={CalendarDays} label={t('coverage')} value={coverage ?? '—'} />
              </div>
              {payment.verifier_name && (
                <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-600" />
                  {t('verified_by_on', { name: payment.verifier_name, date: stamp(payment.paid_date) })}
                </p>
              )}
            </div>

            {/* The evidence, where the decision is made. */}
            {awaitingClaim && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('awaiting_verification')}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Summary icon={Smartphone} label={t('paid_via')} value={t(`method_${claim?.method ?? payment.payment_method}`, claim?.method ?? '—')} />
                  <Summary icon={Hash} label={t('transaction_number')} value={claim?.transactionId ?? payment.transaction_id ?? '—'} mono />
                  <Summary icon={User} label={t('reported_by')} value={claim?.byName ?? '—'} />
                  <Summary icon={CalendarDays} label={t('reported_on')} value={stamp(claim?.at)} />
                </div>
                <p className="text-[11px] text-amber-800 mt-2">{t('match_reference_before_confirming')}</p>
              </div>
            )}

            {rejected && !awaitingClaim && (
              <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {t('claim_was_refused_on', { date: stamp(rejected.at), name: rejected.byName ?? '—' })}
                {rejected.reason ? ` — ${rejected.reason}` : ''}
              </p>
            )}

            {!canEdit ? (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Summary icon={Smartphone} label={t('payment_method')} value={payment.payment_method ? t(`method_${payment.payment_method}`, payment.payment_method) : '—'} />
                <Summary icon={Hash} label={t('transaction_number')} value={payment.transaction_id || '—'} mono />
                {payment.notes && <p className="sm:col-span-2 text-xs text-gray-600">{payment.notes}</p>}
              </div>
            ) : (
              <>
                <div>
                  <span className="block text-xs font-medium text-gray-700 mb-1.5">{t('status')}</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setChanges((p) => ({ ...p, status: s }))}
                        className={`px-2 py-2 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                          form.status === s
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {t(`status_${s}`, s)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asked at the moment of refusal, because the owner is told the outcome and
                    "we could not match it" without a reason leaves them nothing to act on. */}
                {refusingClaim && (
                  <label className="block">
                    <span className="block text-xs font-medium text-gray-700 mb-1">{t('why_could_it_not_be_confirmed')}</span>
                    <input
                      type="text"
                      value={form.rejection_reason}
                      onChange={set('rejection_reason')}
                      placeholder={t('rejection_reason_placeholder')}
                      className={inputClass}
                    />
                    <span className="block text-[11px] text-gray-500 mt-1">{t('rejection_reason_hint')}</span>
                  </label>
                )}

                {form.status === 'paid' && (
                  <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                    <label className="block">
                      <span className="block text-xs font-medium text-gray-700 mb-1">{t('payment_method')}</span>
                      <select value={form.payment_method} onChange={set('payment_method')} className={inputClass}>
                        {METHODS.map((m) => <option key={m} value={m}>{t(`method_${m}`, m)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-gray-700 mb-1">{t('transaction_number')}</span>
                      <input type="text" value={form.transaction_id} onChange={set('transaction_id')} className={inputClass} />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-gray-700 mb-1">{t('paid_date')}</span>
                      <input type="date" value={form.paid_date} onChange={set('paid_date')} className={inputClass} />
                    </label>
                  </div>
                )}

                <label className="block">
                  <span className="block text-xs font-medium text-gray-700 mb-1">{t('notes')}</span>
                  <textarea rows={2} value={form.notes} onChange={set('notes')} className={inputClass} />
                </label>

                {/* Confirming a period is the natural moment to raise the one after it —
                    otherwise the subscription lapses silently until somebody remembers to
                    invoice again. The server works out the start from the owner's real
                    coverage, so stacked pre-payments are not billed twice, and it refuses to
                    raise a second invoice for a period that already has one. */}
                {form.status === 'paid' && original.status !== 'paid' && (
        <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:border-gray-300">
          <input
            type="checkbox"
            checked={form.startNextPeriod}
            onChange={set('startNextPeriod')}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/40"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
              <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
              {t('start_next_period')}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {nextStart ? t('next_period_starts_on', { date: nextStart }) : t('start_next_period_hint')}
            </span>
          </span>
        </label>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.sendMail} onChange={set('sendMail')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40" />
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {t('email_the_owner_about_this_change')}
                </label>

                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    {t('advanced_options')}
                  </button>
                  {showAdvanced && (
                    <div className="grid sm:grid-cols-3 gap-3 mt-3">
                      <label className="block">
                        <span className="block text-xs font-medium text-gray-700 mb-1">{t('subscription_days')}</span>
                        <input type="number" min="1" value={form.subscription_days} onChange={set('subscription_days')} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-medium text-gray-700 mb-1">{t('grace_days')}</span>
                        <input type="number" min="0" value={form.offset_days} onChange={set('offset_days')} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-medium text-gray-700 mb-1">{t('invoice_url')}</span>
                        <input type="url" value={form.invoice_url} onChange={set('invoice_url')} className={inputClass} />
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('delete')}
                </button>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  {t('close')}
                </button>
                {canEdit && (
                  <button
                    type="submit"
                    disabled={!dirty || isUpdating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isUpdating ? t('saving') : t('save_changes')}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('delete_app_fee_payment')}
        message={t('delete_app_fee_payment_confirm')}
        confirmText={t('delete')}
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
};

export default AppFeeViewEditModal;
