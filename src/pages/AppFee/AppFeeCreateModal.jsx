import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, CalendarDays, Check, ChevronDown, FileText, Loader2, Search, Wallet,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../hooks';
import useOwnerOptions from '../../hooks/useOwnerOptions';
import {
  useCreateAppFeePaymentMutation,
  useGetAppFeeDueQuery,
  useGetAppFeeStatusQuery,
  useGetMyAppFeeQuery,
} from '../../store/api/appFeeApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

// The values AppFeeBillingService::normalizePaymentMethod stores, so nothing has to be
// translated on the way in. The individual wallets stay separate on purpose: whoever
// verifies a manual payment needs to know which app to open to find the transaction.
const PAYMENT_METHODS = ['bkash', 'nagad', 'rocket', 'bank', 'cash', 'other'];

const DEFAULT_SUBSCRIPTION_DAYS = 30;

const money = (n) => `৳${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(days || 0));
  return d;
};

const humanDate = (d) =>
  d instanceof Date && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

/** The owner's current standing, so the person raising the invoice can see what they are joining onto. */
const StateChip = ({ status, t }) => {
  if (!status) return null;

  const [tone, label] = !status.hasEverPaid
    ? ['bg-gray-200 text-gray-700', t('state_never_started')]
    : status.isBlocked
      ? ['bg-red-100 text-red-800', t('state_blocked')]
      : status.inGracePeriod
        ? ['bg-amber-100 text-amber-800', t('state_grace')]
        : ['bg-emerald-100 text-emerald-800', t('state_active')];

  return <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${tone}`}>{label}</span>;
};

/** One of the two things this form can do. Stated as an outcome, not as a `status` enum. */
const IntentCard = ({ active, onClick, icon: Icon, title, description }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 text-left rounded-xl border p-3 transition-colors ${
      active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-gray-200 hover:border-gray-300 bg-white'
    }`}
  >
    <span className="flex items-center gap-2">
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
      <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-gray-900'}`}>{title}</span>
      {active && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
    </span>
    <span className="block text-xs text-gray-500 mt-1 leading-snug">{description}</span>
  </button>
);

const Field = ({ label, error, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {hint && !error && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
  </label>
);

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

/**
 * Raise or settle one app-fee invoice.
 *
 * The previous version put the database row on screen: amount, house_count, subscription_days,
 * offset_days, status, start_date, method, transaction id, proof — eleven inputs, all empty,
 * all equally weighted, and it recomputed the price in the browser from its own copy of
 * `MONTHLY_FEE_PER_HOUSE = 500`. Two constants for one price is one too many, and the browser's
 * was the one nobody would remember to change.
 *
 * Now the server is asked what this owner owes (`calculate-due`) and what state their
 * subscription is in, both are shown before anything is typed, and the form's first real
 * question is the one that actually decides what happens: is this an invoice being raised, or
 * a payment that has already arrived? Everything the answer does not need stays hidden.
 */
const AppFeeCreateModal = ({ isOpen, onClose, onSuccess, presetOwnerId = null }) => {
  const { t } = useTranslation();
  const { user, isWebOwner, isStaff, isHouseOwner, isCaretaker } = useAuth();
  const [createPayment, { isLoading: isCreating }] = useCreateAppFeePaymentMutation();

  const isAdmin = isWebOwner || isStaff;

  // AppFeePaymentController::store() forces `status = 'pending'` for a house owner or
  // caretaker — a self-service submission is a claim for an admin to verify, never a
  // settled payment. Offering these roles a "record money received" card would be offering
  // a choice the server discards, so they get the one thing they can actually do: report a
  // payment, with the reference an admin needs to find it.
  const isSelfService = !isAdmin;

  // A caretaker cannot list owners — managed-owners is an admin endpoint — so the owner is
  // resolved server-side from their assignment instead of offered as a picker that would 403.
  const { data: myAppFee } = useGetMyAppFeeQuery(undefined, { skip: !isOpen || !isCaretaker });

  // Seeded at mount. Both callers mount this keyed by the owner it is for, so a different
  // owner is a different component and there is nothing to reset.
  const [ownerId, setOwnerId] = useState(presetOwnerId ? String(presetOwnerId) : '');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [intent, setIntent] = useState('pending'); // 'pending' = invoice, 'paid' = received
  // Self-service can only ever produce a pending claim, so the payment-details block is
  // always shown for them — the reference IS the submission.
  const collectingPaymentDetails = intent === 'paid' || isSelfService;
  const [showAdvanced, setShowAdvanced] = useState(false);
  // null means "whatever the server says this owner owes". Only once someone types does a
  // local value exist — which is why this is not seeded from `due` by an effect: `due`
  // arrives after mount, and an effect that back-fills it would also have to be careful not
  // to overwrite an edit already in progress.
  const [amountEdit, setAmountEdit] = useState(null);
  const [form, setForm] = useState({
    start_date: today(),
    payment_method: 'bkash',
    transaction_id: '',
    proof_image_url: '',
    notes: '',
    sendMail: true,
    subscription_days: String(DEFAULT_SUBSCRIPTION_DAYS),
    offset_days: '',
  });
  const [errors, setErrors] = useState({});

  const { owners, isLoading: ownersLoading } = useOwnerOptions({ search: ownerSearch, skip: !isOpen || !isAdmin });

  // Whoever this invoice is for, however we arrived at them.
  const effectiveOwnerId = useMemo(() => {
    if (isHouseOwner) return user?.id ? String(user.id) : '';
    if (isCaretaker) return myAppFee?.houseOwnerId ? String(myAppFee.houseOwnerId) : '';
    return ownerId;
  }, [isHouseOwner, isCaretaker, user?.id, myAppFee?.houseOwnerId, ownerId]);

  const ownerLocked = isHouseOwner || isCaretaker || !!presetOwnerId;

  const { data: due, isFetching: dueLoading } = useGetAppFeeDueQuery(effectiveOwnerId, {
    skip: !isOpen || !effectiveOwnerId,
  });
  const { data: status } = useGetAppFeeStatusQuery(effectiveOwnerId, {
    skip: !isOpen || !effectiveOwnerId,
  });

  const selectedOwner = useMemo(
    () => owners.find((o) => String(o.id) === String(effectiveOwnerId)) ?? null,
    [owners, effectiveOwnerId]
  );

  // The server's number is the default, and it is only a default — an admin settling an
  // agreed part-payment can still type over it.
  const amount = amountEdit ?? (due?.totalDue != null ? String(due.totalDue) : '');

  const set = (key) => (e) => {
    const value = e?.target?.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const coverageEnd = addDays(form.start_date, Number(form.subscription_days || DEFAULT_SUBSCRIPTION_DAYS) - 1);

  const validate = () => {
    const next = {};
    if (!effectiveOwnerId) next.owner = t('house_owner_required');
    if (amount === '' || Number(amount) < 0) next.amount = t('amount_must_be_valid');
    if (!form.start_date) next.start_date = t('start_date_required');
    if (collectingPaymentDetails && !form.transaction_id.trim() && form.payment_method !== 'cash') {
      next.transaction_id = t('transaction_number_required_to_report_payment');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const body = {
      house_owner_id: Number(effectiveOwnerId),
      amount: Number(amount),
      status: intent,
      start_date: form.start_date,
      payment_method: form.payment_method,
      transaction_id: form.transaction_id.trim() || undefined,
      proof_image_url: form.proof_image_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
      sendMail: form.sendMail,
      subscription_days: Number(form.subscription_days) || undefined,
      offset_days: form.offset_days === '' ? undefined : Number(form.offset_days),
      // house_count is deliberately not sent. The server counts active houses itself, and a
      // number typed here could only ever disagree with it.
    };

    try {
      await createPayment(body).unwrap();
      toast.success(
        isSelfService
          ? t('payment_submitted_for_verification')
          : intent === 'paid'
            ? t('app_fee_payment_recorded')
            : t('app_fee_invoice_raised')
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_create_payment'))));
    }
  };

  const ownerName = selectedOwner?.name
    ?? myAppFee?.status?.lastPaidPayment?.houseOwner?.name
    ?? (isHouseOwner ? user?.name : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSelfService ? t('report_payment') : intent === 'paid' ? t('record_app_fee_payment') : t('start_app_fee')}
      subtitle={ownerName || undefined}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1 — who */}
        {!ownerLocked && (
          <Field label={t('house_owner')} error={errors.owner}>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder={t('search_by_name_or_email')}
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={ownerId}
              onChange={(e) => { setOwnerId(e.target.value); setAmountEdit(null); }}
              className={inputClass}
            >
              <option value="">{ownersLoading ? t('loading') : t('select_house_owner')}</option>
              {owners.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.email ? `${o.name} (${o.email})` : o.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* 2 — what the server says they owe, before anything is typed */}
        {effectiveOwnerId && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
            {dueLoading ? (
              <div className="h-12 animate-pulse rounded bg-gray-200/60" />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('subscription_state')}
                  </span>
                  <StateChip status={status} t={t} />
                </div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="text-gray-600">
                    {due?.activeHouseCount ?? 0} × {money(due?.monthlyFeePerHouse)}
                  </span>
                  <span className="text-gray-400">=</span>
                  <span className="text-lg font-bold text-gray-900">{money(due?.totalDue)}</span>
                  <span className="text-xs text-gray-500">{t('per_month')}</span>
                </div>
                {status?.validThrough && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {t('valid_through_date', { date: humanDate(new Date(status.validThrough)) })}
                  </p>
                )}
                {due?.hasPendingPayment && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                    {t('pending_invoice_exists_this_month')}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* 3 — the question that decides what actually happens. Admin-only: see isSelfService. */}
        {!isSelfService && (
        <div>
          <span className="block text-xs font-medium text-gray-700 mb-1.5">{t('what_are_you_recording')}</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <IntentCard
              active={intent === 'pending'}
              onClick={() => setIntent('pending')}
              icon={FileText}
              title={t('raise_an_invoice')}
              description={t('raise_an_invoice_desc')}
            />
            <IntentCard
              active={intent === 'paid'}
              onClick={() => setIntent('paid')}
              icon={Wallet}
              title={t('record_money_received')}
              description={t('record_money_received_desc')}
            />
          </div>
        </div>
        )}

        {isSelfService && (
          <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            {t('self_service_submission_note')}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('amount')} error={errors.amount}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
              <input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => { setAmountEdit(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                className={`${inputClass} pl-7`}
              />
            </div>
          </Field>

          <Field label={t('start_date')} error={errors.start_date} hint={t('coverage_begins_hint')}>
            <input type="date" value={form.start_date} onChange={set('start_date')} className={inputClass} />
          </Field>
        </div>

        {/* Spelling out the period stops "30 days from when, exactly?" being a question. */}
        <p className="flex items-center gap-1.5 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          {t('covers_period', {
            from: humanDate(new Date(`${form.start_date}T00:00:00`)),
            to: humanDate(coverageEnd),
            count: Number(form.subscription_days || DEFAULT_SUBSCRIPTION_DAYS),
          })}
        </p>

        {/* 4 — only asked when money has actually changed hands */}
        {collectingPaymentDetails && (
          <div className="grid sm:grid-cols-2 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <Field label={t('payment_method')}>
              <select value={form.payment_method} onChange={set('payment_method')} className={inputClass}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`method_${m}`)}</option>
                ))}
              </select>
            </Field>
            <Field
              label={t('transaction_number')}
              error={errors.transaction_id}
              hint={form.payment_method === 'cash' ? t('optional_for_cash') : t('transaction_number_to_match')}
            >
              <input type="text" value={form.transaction_id} onChange={set('transaction_id')} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('proof_image_url')} hint={t('proof_image_hint')}>
                <input type="url" value={form.proof_image_url} onChange={set('proof_image_url')} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        <Field label={t('notes')}>
          <textarea rows={2} value={form.notes} onChange={set('notes')} className={inputClass} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.sendMail} onChange={set('sendMail')} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40" />
          {intent === 'paid' ? t('email_receipt_to_owner') : t('email_invoice_to_owner')}
        </label>

        {/* 5 — the plumbing, out of the way. Blank means "use the platform default", which is
            what almost every invoice wants. Admin-only: these are the platform's terms, not
            something the paying side gets to set. */}
        {!isSelfService && (
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
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label={t('subscription_days')} hint={t('subscription_days_hint')}>
                <input type="number" min="1" value={form.subscription_days} onChange={set('subscription_days')} className={inputClass} />
              </Field>
              <Field label={t('grace_days')} hint={t('grace_days_hint')}>
                <input type="number" min="0" placeholder={t('platform_default')} value={form.offset_days} onChange={set('offset_days')} className={inputClass} />
              </Field>
            </div>
          )}
        </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isCreating || !effectiveOwnerId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSelfService ? t('report_payment') : intent === 'paid' ? t('record_payment') : t('send_invoice')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AppFeeCreateModal;
