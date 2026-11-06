import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  AlertTriangle, BellRing, CalendarClock, History, Mail, MessageSquare, Pencil, Plus, Receipt, Trash2,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { apiErrorMessage } from '../../utils/apiError';
import {
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useGetScheduleDeliveriesQuery,
  useGetSchedulesQuery,
  useUpdateScheduleMutation,
} from '../../store/api/scheduleApi';

/**
 * The Schedule menu: a house owner's rent bills and late-rent reminders, which the server sends
 * on its own every minute (barip-php RentScheduleRunner). This page only sets them up and shows
 * what they did; it never sends anything itself.
 *
 * Times are Bangladesh time, whatever the device's clock says: that is how the server reads
 * send_time, and an owner travelling abroad still means 9 AM in Dhaka.
 */

const TZ = 'Asia/Dhaka';

const BILL = 'rent_bill';
const REMINDER = 'rent_reminder';

// One tap from the empty state to a sensible schedule; both open the form to be checked first.
const PRESETS = {
  [BILL]: { type: BILL, house_id: '', channels: ['sms', 'email'], day_of_month: 1, send_time: '09:00', is_active: true },
  [REMINDER]: {
    type: REMINDER, house_id: '', channels: ['sms', 'email'], days_after_due: 3, repeat_every_days: 3, max_sends: 3,
    send_time: '10:00', is_active: true,
  },
};

// Latin digits with the app's other figures; month and weekday names follow the language.
const formatWhen = (iso, language) => {
  if (!iso) return '–';
  const locale = language?.startsWith('bn') ? 'bn-BD-u-nu-latn' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
};

const CHANNEL_ICON = { sms: MessageSquare, email: Mail };

const ChannelChips = ({ channels, t }) => (
  <div className="flex flex-wrap gap-1.5">
    {channels.map((c) => {
      const Icon = CHANNEL_ICON[c];
      return (
        <span key={c} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          <Icon className="w-3.5 h-3.5" aria-hidden /> {t(`schedule_${c}`)}
        </span>
      );
    })}
  </div>
);

const summary = (s, t) => {
  if (s.type === BILL) return t('schedule_bill_summary', { day: s.dayOfMonth, time: s.sendTime });
  const base = t('schedule_reminder_summary', { days: s.daysAfterDue, time: s.sendTime });
  return s.repeatEveryDays ? base + t('schedule_reminder_repeat', { every: s.repeatEveryDays, max: s.maxSends }) : base;
};

// ── Form ──────────────────────────────────────────────────────────────────────

const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

// The form's state as the API wants it. Fields that do not belong to the type go as null, so a
// schedule's stored shape always matches its type.
const toPayload = (form) => {
  const isBill = form.type === BILL;
  return {
    type: form.type,
    house_id: form.house_id ? Number(form.house_id) : null,
    channels: form.channels,
    day_of_month: isBill ? num(form.day_of_month) : null,
    days_after_due: isBill ? null : num(form.days_after_due),
    repeat_every_days: isBill ? null : num(form.repeat_every_days),
    max_sends: isBill ? null : num(form.max_sends),
    send_time: form.send_time,
    is_active: form.is_active,
  };
};

const ScheduleForm = ({ initial, houses, smsConfigured, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [createSchedule, { isLoading: creating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: updating }] = useUpdateScheduleMutation();
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const isBill = form.type === BILL;

  const toggleChannel = (c) =>
    set('channels', form.channels.includes(c) ? form.channels.filter((x) => x !== c) : [...form.channels, c]);

  // Who this schedule would miss, for the houses it covers.
  const covered = form.house_id ? houses.filter((h) => String(h.id) === String(form.house_id)) : houses;
  const reach = covered.reduce(
    (a, h) => ({ occupied: a.occupied + h.occupiedFlats, phone: a.phone + h.withoutPhone, email: a.email + h.withoutEmail }),
    { occupied: 0, phone: 0, email: 0 },
  );

  const submit = async () => {
    const payload = toPayload(form);
    try {
      if (form.id) await updateSchedule({ id: form.id, ...payload }).unwrap();
      else await createSchedule(payload).unwrap();
      toast.success(t('schedule_saved'));
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={form.id ? t('schedule_edit') : t('schedule_new')}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">{t('cancel')}</button>
          <button type="button" onClick={submit} disabled={creating || updating || form.channels.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
            {t('save')}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* The type decides every other field, so it comes first and cannot be changed later
            (a bill schedule edited into a reminder would carry the bill's history). */}
        <div role="radiogroup" className="grid sm:grid-cols-2 gap-3">
          {[[BILL, Receipt], [REMINDER, BellRing]].map(([type, Icon]) => (
            <button key={type} type="button" role="radio" aria-checked={form.type === type} disabled={!!form.id}
              onClick={() => setForm({ ...PRESETS[type], house_id: form.house_id, channels: form.channels })}
              className={`text-left rounded-xl border p-4 transition-colors disabled:cursor-default ${
                form.type === type ? 'border-primary bg-primary-100/40 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'
              } ${form.id && form.type !== type ? 'opacity-40' : ''}`}>
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <Icon className="w-4 h-4 text-primary" aria-hidden /> {t(type === BILL ? 'schedule_type_bill' : 'schedule_type_reminder')}
              </span>
              <span className="block mt-1 text-xs text-gray-500">{t(type === BILL ? 'schedule_type_bill_hint' : 'schedule_type_reminder_hint')}</span>
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('schedule_house')}>
            <select className={INPUT} value={form.house_id ?? ''} onChange={(e) => set('house_id', e.target.value)}>
              <option value="">{t('schedule_all_houses')}</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </Field>
          <Field label={t('schedule_time')} hint={t('schedule_time_hint')}>
            <input type="time" className={INPUT} value={form.send_time} onChange={(e) => set('send_time', e.target.value)} />
          </Field>

          {isBill ? (
            <Field label={t('schedule_day_of_month')} hint={t('schedule_day_of_month_hint')}>
              <input type="number" min={1} max={28} className={INPUT} value={form.day_of_month ?? ''} onChange={(e) => set('day_of_month', e.target.value)} />
            </Field>
          ) : (
            <>
              <Field label={t('schedule_days_after_due')}>
                <input type="number" min={0} max={60} className={INPUT} value={form.days_after_due ?? ''} onChange={(e) => set('days_after_due', e.target.value)} />
              </Field>
              <Field label={t('schedule_repeat')} hint={t('schedule_repeat_hint')}>
                <input type="number" min={1} max={60} className={INPUT} value={form.repeat_every_days ?? ''} onChange={(e) => set('repeat_every_days', e.target.value)} />
              </Field>
              {form.repeat_every_days ? (
                <Field label={t('schedule_max_sends')}>
                  <input type="number" min={1} max={10} className={INPUT} value={form.max_sends ?? ''} onChange={(e) => set('max_sends', e.target.value)} />
                </Field>
              ) : null}
            </>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">{t('schedule_channels')}</span>
          <div className="flex flex-wrap gap-3">
            {['sms', 'email'].map((c) => {
              const Icon = CHANNEL_ICON[c];
              return (
                <label key={c} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                  form.channels.includes(c) ? 'border-primary bg-primary-100/40' : 'border-gray-200'
                }`}>
                  <input type="checkbox" className="accent-primary" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} />
                  <Icon className="w-4 h-4" aria-hidden /> {t(`schedule_${c}`)}
                </label>
              );
            })}
          </div>
          {form.channels.includes('sms') && !smsConfigured && (
            <p className="mt-2 flex gap-2 text-xs text-amber-700"><AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />{t('schedule_no_sms_gateway')}</p>
          )}
        </div>

        {/* Who it would reach, so a missing phone or email is found here rather than after the 1st. */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
            <span>{t('schedule_occupied', { count: reach.occupied })}</span>
            {form.channels.includes('sms') && <span className={reach.phone ? 'text-amber-700' : ''}>{t('schedule_no_phone', { count: reach.phone })}</span>}
            {form.channels.includes('email') && <span className={reach.email ? 'text-amber-700' : ''}>{t('schedule_no_email', { count: reach.email })}</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">{t('schedule_reach_note')}</p>
        </div>

        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t('schedule_active')}</span>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        </label>
      </div>
    </Modal>
  );
};

// ── History ───────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  sent: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-600',
  sending: 'bg-amber-100 text-amber-700',
};

const KNOWN_REASONS = ['no_email', 'no_phone', 'invalid_phone', 'no_provider'];

const HistoryModal = ({ schedule, onClose }) => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetScheduleDeliveriesQuery(schedule.id);
  const rows = data?.data || [];
  return (
    <Modal isOpen onClose={onClose} title={t('schedule_history')} subtitle={summary(schedule, t)} size="lg">
      {isLoading ? (
        <p className="text-sm text-gray-500">{t('loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">{t('schedule_history_empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 -my-2">
          {rows.map((r) => {
            const Icon = CHANNEL_ICON[r.channel] || Mail;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Icon className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{r.renterName || '–'}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[r.houseName, r.flatName, r.forMonth].filter(Boolean).join(' · ')}
                    {' · '}{schedule.type === BILL ? t('schedule_bill_label') : t('schedule_reminder_nth', { n: r.sequence })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] || STATUS_STYLE.skipped}`}>
                    {r.reason ? t(KNOWN_REASONS.includes(r.reason) ? `schedule_reason_${r.reason}` : 'schedule_reason_other') : t(`schedule_${r.status}`)}
                  </span>
                  <div className="text-[11px] text-gray-400 mt-0.5">{formatWhen(r.createdAt, i18n.language)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const toForm = (s) => ({
  id: s.id, type: s.type, house_id: s.houseId ?? '', channels: s.channels, day_of_month: s.dayOfMonth,
  days_after_due: s.daysAfterDue, repeat_every_days: s.repeatEveryDays ?? '', max_sends: s.maxSends,
  send_time: s.sendTime, is_active: s.isActive,
});

const SchedulePage = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetSchedulesQuery();
  const [updateSchedule] = useUpdateScheduleMutation();
  const [deleteSchedule] = useDeleteScheduleMutation();
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const schedules = data?.data || [];
  const houses = data?.houses || [];
  const smsConfigured = data?.smsConfigured ?? true;
  const usesSms = schedules.some((s) => s.isActive && s.channels.includes('sms'));

  const toggleActive = async (s) => {
    try {
      await updateSchedule({ id: s.id, ...toPayload({ ...toForm(s), is_active: !s.isActive }) }).unwrap();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteSchedule(deleting.id).unwrap();
      toast.success(t('schedule_deleted'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-primary" aria-hidden />
            {t('schedule')}
          </h1>
          <p className="text-subdued text-sm mt-1">{t('schedule_subtitle')}</p>
        </div>
        <button type="button" onClick={() => setEditing(PRESETS[BILL])}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium">
          <Plus size={18} aria-hidden /> {t('schedule_new')}
        </button>
      </div>

      {usesSms && !smsConfigured && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden /> {t('schedule_no_sms_gateway')}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-subdued">{t('loading')}</p>
      ) : schedules.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-subdued/20 p-8 text-center">
          <CalendarClock className="w-10 h-10 mx-auto text-primary/70" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-gray-900">{t('schedule_empty_title')}</h2>
          <p className="mt-1 text-sm text-subdued max-w-md mx-auto">{t('schedule_empty_text')}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button type="button" onClick={() => setEditing(PRESETS[BILL])}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:border-primary hover:text-primary">
              <Receipt className="w-4 h-4" aria-hidden /> {t('schedule_quick_bill')}
            </button>
            <button type="button" onClick={() => setEditing(PRESETS[REMINDER])}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium hover:border-primary hover:text-primary">
              <BellRing className="w-4 h-4" aria-hidden /> {t('schedule_quick_reminder')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {schedules.map((s) => {
            const Icon = s.type === BILL ? Receipt : BellRing;
            return (
              <div key={s.id} className={`bg-surface rounded-2xl border border-subdued/20 p-5 ${s.isActive ? '' : 'opacity-70'}`}>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-primary-100/70 text-primary-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-gray-900">{t(s.type === BILL ? 'schedule_type_bill' : 'schedule_type_reminder')}</h2>
                      <button type="button" onClick={() => toggleActive(s)} title={s.isActive ? t('schedule_pause') : t('schedule_resume')}
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {s.isActive ? t('schedule_active') : t('schedule_paused')}
                      </button>
                    </div>
                    <p className="text-sm text-subdued">{s.houseName || t('schedule_all_houses')}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-700">{summary(s, t)}</p>
                <div className="mt-3"><ChannelChips channels={s.channels} t={t} /></div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-subdued">{t('schedule_next')}</dt>
                    <dd className="font-medium text-gray-900">{formatWhen(s.nextRunAt, i18n.language)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subdued">{t('schedule_last_30')}</dt>
                    <dd className="text-gray-900">
                      <span className="text-green-700 font-medium">{s.last30Days.sent}</span> {t('schedule_sent')}
                      {s.last30Days.failed > 0 && <> · <span className="text-red-600 font-medium">{s.last30Days.failed}</span> {t('schedule_failed')}</>}
                      {s.last30Days.skipped > 0 && <> · {s.last30Days.skipped} {t('schedule_skipped')}</>}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <button type="button" onClick={() => setHistory(s)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                    <History className="w-4 h-4" aria-hidden /> {t('schedule_history')}
                  </button>
                  <button type="button" onClick={() => setEditing(toForm(s))} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
                    <Pencil className="w-4 h-4" aria-hidden /> {t('edit')}
                  </button>
                  <button type="button" onClick={() => setDeleting(s)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" aria-hidden /> {t('delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <ScheduleForm initial={editing} houses={houses} smsConfigured={smsConfigured} onClose={() => setEditing(null)} />}
      {history && <HistoryModal schedule={history} onClose={() => setHistory(null)} />}
      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t('delete')}
        message={t('schedule_delete_confirm')}
        confirmText={t('delete')}
        variant="danger"
      />
    </div>
  );
};

export default SchedulePage;
