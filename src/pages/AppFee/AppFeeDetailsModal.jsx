import React from 'react';
import { format } from 'date-fns';
import {
  FileText, Wallet, ShieldCheck, ShieldAlert, Clock, CalendarDays,
  CheckCircle2, XCircle, CircleDot, Home, Mail, ExternalLink, Hash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/common/Modal';
import { useGetAppFeePaymentQuery } from '../../store/api/appFeeApi';
import { invoicePeriod } from '../../utils/appFeePeriod';
import { buildAppFeeTimeline } from '../../utils/appFeeTimeline';

const money = (n) => (n == null ? '–' : `৳${Number(n).toLocaleString()}`);
const day = (d) => (d ? format(new Date(d), 'd MMM yyyy') : null);
const dayTime = (d) => (d ? format(new Date(d), 'd MMM yyyy, h:mm a') : null);

/* ── timeline ─────────────────────────────────────────────────────────────────────────────
 * Hand-rolled rather than a package. The three candidates (react-vertical-timeline-component,
 * react-chrono, @mui/lab Timeline) all bring their own styling system or a peer dependency on
 * a component library this app does not use, to draw a line, a row of dots and some text —
 * which is the thirty lines below, and which inherits the app's own colours for free.
 */

const NODE = {
  done: { ring: 'border-emerald-500 bg-emerald-500', text: 'text-gray-900', Icon: CheckCircle2 },
  current: { ring: 'border-amber-500 bg-amber-500 animate-pulse', text: 'text-amber-900', Icon: Clock },
  failed: { ring: 'border-red-500 bg-red-500', text: 'text-red-900', Icon: XCircle },
  upcoming: { ring: 'border-gray-300 bg-white', text: 'text-gray-400', Icon: CircleDot },
};

const TimelineRow = ({ event, isLast, t }) => {
  const tone = NODE[event.state] ?? NODE.upcoming;
  const { Icon } = tone;
  const { method, reference, amount, reason } = event.values ?? {};

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* The connector stops at the last node instead of trailing into empty space. */}
      {!isLast && <span aria-hidden className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" />}

      <span
        className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${tone.ring}`}
      >
        <Icon className={`h-3.5 w-3.5 ${event.state === 'upcoming' ? 'text-gray-400' : 'text-white'}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className={`text-sm font-medium ${tone.text}`}>{t(event.titleKey)}</p>
          {event.state === 'upcoming' && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
              {t('upcoming')}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs text-gray-500">
          {event.at ? dayTime(event.at) : t('in_progress')}
          {event.detail ? ` · ${event.detail}` : ''}
        </p>

        {(reference || method || amount != null) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {amount != null && <span className="font-medium">{money(amount)}</span>}
            {method && <span className="capitalize">{String(method).replace(/_/g, ' ')}</span>}
            {reference && (
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] break-all">
                <Hash className="h-3 w-3 shrink-0 text-gray-400" />
                {reference}
              </span>
            )}
          </p>
        )}

        {reason && (
          <p className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {t('reason')}: {reason}
          </p>
        )}
      </div>
    </li>
  );
};

/* ── detail rows ──────────────────────────────────────────────────────────────────────── */

const Field = ({ label, children, mono = false }) => (
  <div className="min-w-0">
    <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
    <dd className={`mt-0.5 text-sm text-gray-900 break-words ${mono ? 'font-mono text-xs' : ''}`}>{children}</dd>
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-xl border border-gray-200 p-4">
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <Icon className="h-4 w-4 text-gray-400" />
      {title}
    </h3>
    {children}
  </section>
);

const STATUS_TONE = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

/**
 * Everything recorded about one app-fee invoice, in one read-only place.
 *
 * This exists because the table's eye icon and its pencil icon called the same handler and
 * opened the same editor — there was no way to *look* at an invoice, only to edit one, and the
 * fields that answer "why is this still unpaid" (the claim, its reference, who refused it and
 * why) were not on that form at all. Read-only is the point: verification stays in
 * VerifyClaimModal, where the two real outcomes and their consequences live.
 */
const AppFeeDetailsModal = ({ paymentId, isOpen, onClose, onEdit, onVerify }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetAppFeePaymentQuery(paymentId, { skip: !isOpen || !paymentId });

  const payment = data?.data;
  const meta = payment?.metadata ?? {};
  const timeline = buildAppFeeTimeline(payment);

  const period = payment ? invoicePeriod(payment) : null;
  const waiting = !!meta.waiting_for_confirm;
  const proofUrl = meta.proofImageUrl;
  const invoiceUrl = payment?.invoice_url || meta.invoice_url;
  const extraNotes = meta.additionalNotes && meta.additionalNotes !== payment?.notes ? meta.additionalNotes : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={t('app_fee_details')}
      subtitle={period ?? undefined}
    >
      {isLoading || !payment ? (
        <div className="space-y-3 py-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline: the three things worth seeing before reading anything else. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold text-gray-900">{money(payment.amount)}</p>
              <p className="mt-0.5 truncate text-sm text-gray-600">{payment.house_owner_name ?? '–'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2.5 py-1 text-xs font-medium ${STATUS_TONE[payment.status] ?? STATUS_TONE.cancelled}`}>
                {t(payment.status ?? 'pending')}
              </span>
              {waiting && (
                <span className="rounded bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                  {t('awaiting_verification')}
                </span>
              )}
              {meta.claim_rejected && !waiting && (
                <span className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{t('sent_back')}</span>
              )}
            </div>
          </div>

          {/* The amount charged is house_count × the per-house fee. Showing the expected figure
              next to the charged one makes a manual override visible instead of silent. */}
          <Section icon={Wallet} title={t('billing')}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label={t('amount')}>{money(payment.amount)}</Field>
              <Field label={t('expected_amount')}>
                <span className={Number(payment.expected_amount) !== Number(payment.amount) ? 'text-amber-700' : ''}>
                  {money(payment.expected_amount)}
                </span>
              </Field>
              <Field label={t('houses_billed')}>{payment.house_count ?? '–'}</Field>
              <Field label={t('fee_type')}>
                <span className="capitalize">{String(payment.fee_type ?? '–').replace(/_/g, ' ')}</span>
              </Field>
              <Field label={t('subscription_length')}>
                {payment.subscription_days ? t('n_days', { days: payment.subscription_days }) : '–'}
              </Field>
              <Field label={t('grace_offset')}>
                {payment.offset_days ? t('n_days', { count: payment.offset_days }) : '–'}
              </Field>
              <Field label={t('billing_period')}>{period ?? '–'}</Field>
              <Field label={t('method')}>
                <span className="capitalize">{String(payment.payment_method ?? '–').replace(/_/g, ' ')}</span>
              </Field>
              <Field label={t('paid_date')}>{day(payment.paid_date) ?? t('not_recorded')}</Field>
            </dl>
          </Section>

          <Section icon={waiting ? ShieldAlert : ShieldCheck} title={t('verification')}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label={t('transaction_number')} mono>
                {meta.claim?.transactionId ?? payment.transaction_id ?? t('not_recorded')}
              </Field>
              <Field label={t('claimed_amount')}>{meta.claim?.amount != null ? money(meta.claim.amount) : '–'}</Field>
              <Field label={t('verified_by')}>{payment.verifier_name ?? t('not_recorded')}</Field>
              <Field label={t('verified_at')}>{dayTime(payment.verified_at) ?? t('not_recorded')}</Field>
            </dl>

            {meta.claim_rejected?.reason && (
              <p className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span className="font-medium">{t('claim_sent_back')}</span> — {meta.claim_rejected.reason}
              </p>
            )}

            {/* The claim is only actionable from here while it is still open, and it opens the
                same verify dialog the table uses rather than a second confirmation path. */}
            {waiting && onVerify && (
              <button
                type="button"
                onClick={() => onVerify(payment)}
                className="mt-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
              >
                {t('review_claim')}
              </button>
            )}
          </Section>

          <Section icon={Home} title={t('house_owner')}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label={t('name')}>{payment.house_owner_name ?? '–'}</Field>
              <Field label={t('email')}>
                {payment.house_owner_email ? (
                  <a href={`mailto:${payment.house_owner_email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{payment.house_owner_email}</span>
                  </a>
                ) : '–'}
              </Field>
              <Field label={t('raised_by')}>
                {meta.createdBy?.name ?? '–'}
                {meta.createdBy?.role && (
                  <span className="ml-1 text-xs capitalize text-gray-500">
                    ({String(meta.createdBy.role).replace(/_/g, ' ')})
                  </span>
                )}
              </Field>
            </dl>
          </Section>

          {(payment.notes || extraNotes || invoiceUrl || proofUrl) && (
            <Section icon={FileText} title={t('notes')}>
              {payment.notes && <p className="whitespace-pre-wrap text-sm text-gray-700">{payment.notes}</p>}
              {extraNotes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{extraNotes}</p>}
              {(invoiceUrl || proofUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {invoiceUrl && (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('open_invoice_file')}
                    </a>
                  )}
                  {proofUrl && (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('payment_proof')}
                    </a>
                  )}
                </div>
              )}
            </Section>
          )}

          <Section icon={CalendarDays} title={t('invoice_timeline')}>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400">{t('nothing_recorded_yet')}</p>
            ) : (
              <ol className="mt-1">
                {timeline.map((event, i) => (
                  <TimelineRow key={event.key} event={event} isLast={i === timeline.length - 1} t={t} />
                ))}
              </ol>
            )}
          </Section>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('close')}
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(payment.id)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                {t('edit')}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AppFeeDetailsModal;
