import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  RotateCcw,
  Search,
  UserMinus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useGetPushEventsQuery,
  useUpdatePushEventMutation,
  useResetPushEventsMutation,
} from '../../store/api/developerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

const ROLE_LABEL_KEY = {
  web_owner: 'role_web_owner',
  staff: 'role_staff',
  house_owner: 'role_house_owner',
  caretaker: 'role_caretaker',
};

/**
 * On / off, with "somebody decided this" visibly different from "nobody has touched it".
 *
 * The distinction is not decoration. Only an override should survive a later change to a
 * catalog default, so a toggle reading "on" because a developer set it and one reading "on"
 * because that is how the code ships behave differently the next time the code changes.
 */
const Toggle = ({ enabled, locked, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    disabled={locked}
    onClick={() => onToggle(!enabled)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
      ${enabled ? 'bg-primary' : 'bg-gray-300'}
      ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const SourceChip = ({ source, t }) => {
  if (source === 'locked') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
        <Lock className="h-2.5 w-2.5" />
        {t('push_event_locked')}
      </span>
    );
  }
  if (source === 'override') {
    return <span className="text-[10px] font-medium text-amber-600">{t('push_event_overridden')}</span>;
  }
  return <span className="text-[10px] text-gray-400">{t('push_event_default')}</span>;
};

/** One number with a caption. Reads at a glance; that is the whole job. */
const Stat = ({ label, value, tone = 'default', hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p
      className={`mt-0.5 text-lg font-semibold ${
        tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900'
      }`}
    >
      {value}
    </p>
    {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

/**
 * Every push this platform sends, and who hears about it.
 *
 * Reads the catalog from the server rather than holding its own copy: the catalog is PHP
 * (App\Notifications\PushEventCatalog) because that is where the sends happen, and a
 * duplicated list here would drift the first time somebody adds an event without touching
 * the frontend. This screen renders whatever the server declares, so a new event appears
 * without a frontend deploy.
 *
 * A toggle gates WEB PUSH ONLY. The in-app bell entry is still written, and SMS is governed
 * separately on Notification Settings — said out loud on the page, because a screen called
 * "push notifications" that quietly also silenced the bell would be the worst kind of
 * surprise to discover from a user complaint.
 */
const PushNotifications = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  const { data, isLoading, isError } = useGetPushEventsQuery();
  const [update, { isLoading: isSaving }] = useUpdatePushEventMutation();
  const [reset, { isLoading: isResetting }] = useResetPushEventsMutation();

  const payload = data?.data;
  const events = useMemo(() => payload?.events ?? [], [payload]);
  const health = payload?.health;

  // Matches on the human-readable text too, not just the key: somebody looking for "the
  // rent one" does not know it is called rent.payment_recorded.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter(
      (e) =>
        e.key.toLowerCase().includes(term) ||
        e.label.toLowerCase().includes(term) ||
        e.trigger.toLowerCase().includes(term)
    );
  }, [events, search]);

  // Rendered in the order the server declares its groups, so related events stay together
  // rather than sorting alphabetically into nonsense.
  const grouped = useMemo(() => {
    // Read from `payload` rather than a destructured `groups`: a `?? {}` fallback in the
    // component body is a fresh object every render, which would make this memo useless.
    return Object.entries(payload?.groups ?? {})
      .map(([key, name]) => ({ key, name, rows: filtered.filter((e) => e.group === key) }))
      .filter((g) => g.rows.length > 0);
  }, [payload, filtered]);

  const change = async (eventKey, role, enabled) => {
    try {
      await update({ eventKey, role, enabled }).unwrap();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_update_setting'))));
    }
  };

  const doReset = async () => {
    try {
      const res = await reset().unwrap();
      setConfirmingReset(false);
      toast.success(t('push_events_reset_done', { count: res?.removed ?? 0 }));
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_update_setting'))));
    }
  };

  const overrideCount = health?.overrides ?? 0;
  const rate = health?.last7Days?.deliveryRate;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to="/developer"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t('developer_panel')}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl md:text-2xl font-bold text-gray-900">
            <BellRing className="h-5 w-5 text-primary" />
            {t('push_events_title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('push_events_subtitle')}</p>
        </div>

        {overrideCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={isResetting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('push_events_reset', { count: overrideCount })}
          </button>
        )}
      </div>

      {/* What a toggle does and does not do. Stated before the grid, not after it. */}
      <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
        <Info className="mt-px h-4 w-4 shrink-0 text-blue-500" />
        {t('push_events_scope_note')}
      </p>

      {/* App fee left this grid: it needed the bell and the schedule too, not just push. */}
      <Link
        to="/developer/app-fee-notifications"
        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <span>{t('push_events_app_fee_moved')}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-primary">
          {t('push_events_app_fee_link')}
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>

      {health && !health.vapidConfigured && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" />
          {t('push_vapid_missing')}
        </p>
      )}

      {health && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label={t('push_stat_subscriptions')} value={health.subscriptions?.total ?? 0} />
          <Stat label={t('push_stat_sent_7d')} value={health.last7Days?.sent ?? 0} />
          <Stat
            label={t('push_stat_failed_7d')}
            value={health.last7Days?.failed ?? 0}
            tone={health.last7Days?.failed > 0 ? 'warn' : 'default'}
          />
          <Stat
            label={t('push_stat_delivery_rate')}
            // A dash, not 0%. Nothing was sent, which is not the same as everything failing.
            value={rate === null || rate === undefined ? '—' : `${rate}%`}
            tone={rate !== null && rate !== undefined && rate < 80 ? 'bad' : 'default'}
          />
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('push_events_search')}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {t('failed_to_load')}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          {t('push_events_none_match')}
        </p>
      ) : (
        grouped.map((group) => (
          <section
            key={group.key}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-gray-900">{group.name}</h2>
            </div>

            <ul className="divide-y divide-gray-100">
              {group.rows.map((event) => (
                <li key={event.key} className="px-4 py-3.5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 md:pr-6">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                        {event.label}
                        {event.locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-normal text-gray-500">
                            <Lock className="h-2.5 w-2.5" />
                            {t('push_event_always_on')}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{event.trigger}</p>
                      <p className="mt-1 text-xs text-gray-400">{event.description}</p>

                      {/* The commonest reason for "it is switched on and I still never get
                          it", and invisible from the toggles. Worth its own line: rent
                          collection shows house_owner ON, yet an owner recording their own
                          rent is skipped — which is most of them. */}
                      {event.excludesActor && (
                        <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-700">
                          <UserMinus className="mt-px h-3 w-3 shrink-0 text-amber-500" />
                          {t('push_event_excludes_actor')}
                        </p>
                      )}
                      <code className="mt-1.5 inline-block rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                        {event.key}
                      </code>
                    </div>

                    {/* Only the roles that actually receive this event. Rendering all four
                        with two greyed out would suggest the missing ones could be switched
                        on, and they cannot — the server refuses a role the catalog does not
                        declare for the event. */}
                    <div className="flex shrink-0 flex-wrap gap-4 md:gap-5">
                      {event.recipients.map((r) => (
                        <div key={r.role} className="flex w-[104px] flex-col items-start gap-1">
                          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                            <Users className="h-3 w-3 text-gray-400" />
                            {t(ROLE_LABEL_KEY[r.role] ?? r.role)}
                          </span>
                          <Toggle
                            enabled={r.enabled}
                            locked={event.locked || isSaving}
                            label={`${event.label} — ${t(ROLE_LABEL_KEY[r.role] ?? r.role)}`}
                            onToggle={(next) =>
                              change(
                                event.key,
                                r.role,
                                // Toggling back to the shipped default clears the override
                                // rather than storing a row that happens to agree with it.
                                // Otherwise the grid fills up with "overridden" chips that
                                // pin values against any future change to the catalog.
                                next === r.default ? null : next
                              )
                            }
                          />
                          <SourceChip source={r.source} t={t} />
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {confirmingReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{t('push_events_reset_title')}</h3>
            <p className="mt-1.5 text-sm text-gray-600">
              {t('push_events_reset_confirm', { count: overrideCount })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={doReset}
                disabled={isResetting}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {t('push_events_reset_action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotifications;
