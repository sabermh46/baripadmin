import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, CalendarClock, ChevronLeft, Layers, RefreshCw, RotateCcw, Smartphone } from 'lucide-react';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import {
  useGetAppFeeNotificationSettingsQuery,
  useGetAppFeeReminderPreviewQuery,
  useResetAppFeeNotificationSettingsMutation,
  useUpdateAppFeeNotificationSettingsMutation,
} from '../../store/api/developerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

/**
 * App-fee notifications: everything the app sends about the app fee, in one place.
 *
 *   1. Payment confirmed + next invoice: one notification or two. The web owner's call.
 *   2. Each app-fee event, per recipient: the bell entry and the push, separately.
 *   3. The scheduled reminders: on/off, send time, each stage and how far ahead, the repeat
 *      interval, who else hears; with a count of what the next run would do.
 *
 * Edits are held locally and saved together, so a half-made change never goes live.
 * Moved here from the general push page (which can only switch push off) because app fee
 * needed the bell, the schedule and the combined-notification choice as well.
 */
const STAGE_ORDER = ['due', 'expiring', 'grace', 'blocked'];

const Switch = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

const Card = ({ icon: Icon, title, subtitle, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="border-b border-gray-100 px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const DaysInput = ({ value, onChange, min = 1, max = 60, disabled }) => (
  <input
    type="number"
    min={min}
    max={max}
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm tabular-nums disabled:bg-gray-50 disabled:text-gray-400"
  />
);

const Preview = ({ title, body }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
    <p className="text-xs font-semibold text-gray-800">{title}</p>
    <p className="text-xs text-gray-600">{body}</p>
  </div>
);

const AppFeeNotificationsPage = () => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetAppFeeNotificationSettingsQuery();
  const { data: preview, isFetching: previewLoading, refetch: refetchPreview } = useGetAppFeeReminderPreviewQuery();
  const [save, { isLoading: saving }] = useUpdateAppFeeNotificationSettingsMutation();
  const [reset, { isLoading: resetting }] = useResetAppFeeNotificationSettingsMutation();
  const [confirmReset, setConfirmReset] = useState(false);

  const server = data?.data?.settings;
  const catalog = useMemo(() => data?.data?.events ?? [], [data]);

  // Local edits over the server copy. `null` = no edits.
  const [draft, setDraft] = useState(null);
  const s = draft ?? server;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(server);

  const edit = (fn) =>
    setDraft((d) => {
      const next = structuredClone(d ?? server);
      fn(next);
      return next;
    });

  const onSave = async () => {
    try {
      await save(draft).unwrap();
      setDraft(null);
      toast.success(t('afn_saved'));
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('afn_save_failed'))));
    }
  };

  const onReset = async () => {
    setConfirmReset(false);
    try {
      await reset().unwrap();
      setDraft(null);
      toast.success(t('afn_reset_done'));
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('afn_save_failed'))));
    }
  };

  if (isLoading) return <div className="mx-auto max-w-4xl py-10 text-center text-sm text-gray-500">{t('loading')}</div>;
  if (error || !s) {
    return (
      <div className="mx-auto max-w-4xl py-10 text-center text-sm text-red-600">
        {showMessageInLanguage(apiErrorMessage(error, t('afn_load_failed')))}
      </div>
    );
  }

  const r = s.reminders;
  const hour = (h) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/developer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-3.5 w-3.5" />
            {t('developer_panel')}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl">
            <BellRing className="h-5 w-5 text-primary" />
            {t('afn_title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('afn_subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={resetting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('afn_reset')}
        </button>
      </div>

      {/* 1. Paid + next invoice */}
      <Card icon={Layers} title={t('afn_combined_title')} subtitle={t('afn_combined_subtitle')}>
        <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
          {[
            {
              value: 'combined',
              label: t('afn_combined_one'),
              hint: t('afn_combined_one_hint'),
              previews: [
                { title: 'App fee paid · next invoice raised', body: 'Your app fee payment of ৳1,000 has been verified as paid. Your next invoice of ৳1,000 covers 30 Oct – 28 Nov 2026.' },
              ],
            },
            {
              value: 'separate',
              label: t('afn_combined_two'),
              hint: t('afn_combined_two_hint'),
              previews: [
                { title: 'App fee receipt', body: 'Your app fee payment of ৳1,000 has been verified as paid.' },
                { title: 'App fee invoice', body: 'An app fee invoice of ৳1,000 has been raised for your next period.' },
              ],
            },
          ].map((opt) => {
            const active = s.paidWithNextInvoice === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => edit((d) => { d.paidWithNextInvoice = opt.value; })}
                className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${active ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                <p className="mb-2 text-xs text-gray-500">{opt.hint}</p>
                <div className="space-y-1.5">
                  {opt.previews.map((p) => (
                    <Preview key={p.title} {...p} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 2. Per event × recipient */}
      <Card icon={Bell} title={t('afn_events_title')} subtitle={t('afn_events_subtitle')}>
        <div className="divide-y divide-gray-100">
          {catalog.map((ev) =>
            ev.recipients.map((role) => {
              const ch = s.events?.[ev.key]?.[role] ?? { inApp: true, push: true };
              return (
                <div key={`${ev.key}-${role}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {ev.label} <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-gray-600">{t(`role_${role}`)}</span>
                    </p>
                    <p className="text-xs text-gray-500">{ev.trigger}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{ev.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <Bell className="h-3.5 w-3.5" />
                      {t('afn_bell')}
                      <Switch
                        checked={ch.inApp}
                        label={`${ev.label} · ${t(`role_${role}`)} · ${t('afn_bell')}`}
                        onChange={(v) => edit((d) => { d.events[ev.key][role].inApp = v; })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <Smartphone className="h-3.5 w-3.5" />
                      {t('afn_push')}
                      <Switch
                        checked={ch.push}
                        label={`${ev.label} · ${t(`role_${role}`)} · ${t('afn_push')}`}
                        onChange={(v) => edit((d) => { d.events[ev.key][role].push = v; })}
                      />
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">{t('afn_push_note')}</p>
      </Card>

      {/* 3. Schedule */}
      <Card icon={CalendarClock} title={t('afn_schedule_title')} subtitle={t('afn_schedule_subtitle')}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-900">
              <Switch checked={r.enabled} label={t('afn_schedule_enabled')} onChange={(v) => edit((d) => { d.reminders.enabled = v; })} />
              {t('afn_schedule_enabled')}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              {t('afn_send_at')}
              <select
                value={r.sendAtHour}
                disabled={!r.enabled}
                onChange={(e) => edit((d) => { d.reminders.sendAtHour = Number(e.target.value); })}
                className="rounded-md border border-gray-200 px-2 py-1 text-sm tabular-nums disabled:bg-gray-50"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {hour(h)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">{t('afn_dhaka_time')}</span>
            </label>
          </div>

          <div className={`divide-y divide-gray-100 rounded-lg border border-gray-200 ${r.enabled ? '' : 'opacity-50'}`}>
            {STAGE_ORDER.map((stage) => {
              const st = r.stages[stage];
              const caretakers = r.caretakerStages.includes(stage);
              return (
                <div key={stage} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Switch
                      checked={st.enabled}
                      disabled={!r.enabled}
                      label={t(`afn_stage_${stage}`)}
                      onChange={(v) => edit((d) => { d.reminders.stages[stage].enabled = v; })}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t(`afn_stage_${stage}`)}</p>
                      <p className="text-xs text-gray-500">{t(`afn_stage_${stage}_hint`)}</p>
                      {st.daysBefore !== undefined && (
                        <p className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
                          {t('afn_from')}
                          <DaysInput
                            value={st.daysBefore}
                            disabled={!r.enabled || !st.enabled}
                            onChange={(v) => edit((d) => { d.reminders.stages[stage].daysBefore = v; })}
                          />
                          {t('afn_days_before_end')}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 pl-12 text-xs text-gray-600 sm:pl-0">
                    <input
                      type="checkbox"
                      checked={caretakers}
                      disabled={!r.enabled || !st.enabled}
                      onChange={(e) =>
                        edit((d) => {
                          const set = new Set(d.reminders.caretakerStages);
                          e.target.checked ? set.add(stage) : set.delete(stage);
                          d.reminders.caretakerStages = STAGE_ORDER.filter((x) => set.has(x));
                        })
                      }
                      className="h-4 w-4 accent-primary-600"
                    />
                    {t('afn_tell_caretakers')}
                  </label>
                </div>
              );
            })}
          </div>

          <p className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            {t('afn_repeat_before')}
            <DaysInput
              value={r.repeatEveryDays}
              min={0}
              max={30}
              disabled={!r.enabled}
              onChange={(v) => edit((d) => { d.reminders.repeatEveryDays = v; })}
            />
            {t('afn_repeat_after')}
          </p>

          {/* What the next run would do, with the SAVED settings. */}
          <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
            <div className="text-xs text-gray-600">
              <p className="font-medium text-gray-800">
                {t('afn_preview_title', { time: hour(server.reminders.sendAtHour) })}
                {dirty && <span className="ml-1 font-normal text-amber-700">({t('afn_preview_unsaved')})</span>}
              </p>
              {!server.reminders.enabled ? (
                <p>{t('afn_preview_off')}</p>
              ) : preview?.data ? (
                <p>
                  {t('afn_preview_body', { count: preview.data.wouldSend })}
                  {STAGE_ORDER.filter((x) => preview.data.stages[x] > 0)
                    .map((x) => ` · ${t(`afn_stage_${x}`)}: ${preview.data.stages[x]}`)
                    .join('')}
                  {preview.data.recentlyAnnounced > 0 && ` · ${t('afn_preview_recent', { count: preview.data.recentlyAnnounced })}`}
                </p>
              ) : (
                <p>{t('loading')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={refetchPreview}
              aria-label={t('refresh')}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Save bar: only while there is something to save. */}
      {dirty && (
        <div className="sticky bottom-0 z-20 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">{t('afn_unsaved')}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                {t('afn_discard')}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? t('loading') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        title={t('afn_reset_title')}
        message={t('afn_reset_message')}
        confirmText={t('afn_reset')}
        variant="warning"
        isLoading={resetting}
      />
    </div>
  );
};

export default AppFeeNotificationsPage;
