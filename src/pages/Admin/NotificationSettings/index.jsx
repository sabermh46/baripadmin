import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, MessageSquare, RotateCcw, Search } from 'lucide-react';
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationChannelMutation,
} from '../../../store/api/notificationSettingsApi';
import { apiErrorMessage } from '../../../utils/apiError';
import { showMessageInLanguage } from '../../../utils/showMessageInLanguage';
import SmsProviderPanel from './SmsProviderPanel';

const CHANNELS = [
  { key: 'push', icon: BellRing },
  { key: 'sms', icon: MessageSquare },
];

/** On / off, with the inherited state visibly different from a decision someone made. */
const Toggle = ({ value, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value.enabled}
    disabled={disabled}
    onClick={() => onChange(!value.enabled)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
      value.enabled ? 'bg-primary' : 'bg-gray-300'
    }`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const SourceChip = ({ source, t }) => {
  if (source === 'default') return <span className="text-[10px] text-gray-400">{t('source_default')}</span>;
  if (source === 'role') return <span className="text-[10px] text-blue-600">{t('source_role')}</span>;
  return <span className="text-[10px] text-amber-600 font-medium">{t('source_override')}</span>;
};

/**
 * Who the system is allowed to interrupt, and how.
 *
 * Two channels, not three. Email is deliberately absent: receipts, invoices and password-reset
 * links are transactional rather than a preference, and a per-role switch on them would let
 * somebody turn off the only channel that can deliver a reset link.
 *
 * Roles set the default; a single house owner can be overridden on top. The override is
 * shown as a distinct state — "on" that somebody chose reads differently from "on" that
 * nobody has touched, and only the first should survive a change to the role default.
 */
const NotificationSettings = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('push');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetNotificationSettingsQuery();
  const [update] = useUpdateNotificationChannelMutation();

  const settings = data?.data;
  const roles = settings?.roles ?? [];
  const owners = settings?.houseOwners ?? [];
  const smsReady = settings?.sms?.configured;

  const filteredOwners = owners.filter((o) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return o.name?.toLowerCase().includes(term) || o.email?.toLowerCase().includes(term);
  });

  const change = async (scope, scopeKey, enabled) => {
    try {
      await update({ scope, scopeKey: String(scopeKey), channel: tab, enabled }).unwrap();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_update_setting'))));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('notification_settings')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('notification_settings_subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {CHANNELS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(`channel_${key}`)}
          </button>
        ))}
      </div>

      {/* A channel switched on with no gateway behind it looks like it is delivering and is
          not. Said here rather than discovered later from an empty inbox. */}
      {tab === 'sms' && !smsReady && (
        <p className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 mt-px shrink-0 text-amber-500" />
          {t('sms_not_configured_warning')}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <>
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{t('by_role')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('by_role_hint')}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {roles.map((role) => (
                <div key={role.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <SourceChip source={role.channels[tab]?.source} t={t} />
                  </div>
                  <Toggle
                    value={role.channels[tab] ?? { enabled: false }}
                    onChange={(next) => change('role', role.slug, next)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{t('individual_house_owners')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('individual_house_owners_hint')}</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('search_by_name_or_email')}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filteredOwners.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500 text-center">{t('no_house_owners_found')}</p>
              ) : (
                filteredOwners.map((owner) => {
                  const cell = owner.channels[tab] ?? { enabled: false, source: 'default' };
                  return (
                    <div key={owner.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{owner.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {tab === 'sms' && !owner.phone ? (
                            <span className="text-amber-700">{t('no_phone_on_file')}</span>
                          ) : (
                            owner.email
                          )}
                        </p>
                        <SourceChip source={cell.source} t={t} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Only meaningful once an override exists — otherwise there is
                            nothing to reset to. */}
                        {cell.source === 'user' && (
                          <button
                            type="button"
                            onClick={() => change('user', owner.id, null)}
                            title={t('reset_to_role_default')}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Toggle value={cell} onChange={(next) => change('user', owner.id, next)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {tab === 'sms' && <SmsProviderPanel />}
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
