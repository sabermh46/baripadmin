import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  Database,
  Receipt,
  Server,
  Terminal,
} from 'lucide-react';
import { useGetDeveloperOverviewQuery } from '../../store/api/developerApi';

const MODULE_ICON = {
  'push-notifications': BellRing,
  'app-fee-notifications': Receipt,
};

/** A key/value line in one of the environment cards. */
const Row = ({ label, value, tone = 'default' }) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <span className="text-xs text-gray-500">{label}</span>
    <span
      className={`font-mono text-xs ${
        tone === 'bad' ? 'font-semibold text-red-600' : tone === 'good' ? 'text-emerald-600' : 'text-gray-800'
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * The developer panel's home.
 *
 * The developer role is walled out of the business screens on purpose — nobody maintaining
 * this system needs to read a house owner's ledger in production. But "no business data" got
 * implemented as "no screens", and maintenance work still has to happen somewhere. On this
 * deployment there is no terminal at all, so in practice it meant a deploy.
 *
 * So: operational surface, no business data. Every number on this page is a count, a flag or
 * a duration. No names, no amounts, no phone numbers. Worth defending on each module added
 * here rather than checked once.
 *
 * `modules` comes from the server so a new one appears without a frontend deploy, and a
 * half-built one can ship as unavailable instead of as a link that 404s.
 */
const DeveloperPanel = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetDeveloperOverviewQuery();

  const panel = data?.data;
  const env = panel?.environment;
  const queue = panel?.queue;
  const db = panel?.database;

  // Debug mode on in production leaks stack traces to users and is invisible until it
  // happens. It is the first thing this page should say, above everything else.
  const debugInProduction = env?.debug && env?.env === 'production';

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-gray-900">
          <Terminal className="h-5 w-5 text-primary" />
          {t('developer_panel')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('developer_panel_subtitle')}</p>
      </div>

      {debugInProduction && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-red-500" />
          {t('developer_debug_in_production')}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-2">
            {(panel?.modules ?? []).map((m) => {
              const Icon = MODULE_ICON[m.key] ?? Server;

              const card = (
                <div
                  className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-sm transition-colors ${
                    m.available ? 'border-gray-200 hover:border-primary/40' : 'border-gray-100 opacity-60'
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{m.description}</p>
                  </div>
                  {m.available ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {t('coming_soon')}
                    </span>
                  )}
                </div>
              );

              return m.available ? (
                <Link key={m.key} to={m.path} className="block">
                  {card}
                </Link>
              ) : (
                <div key={m.key}>{card}</div>
              );
            })}
          </section>

          <div className="grid gap-3 md:grid-cols-3">
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Server className="h-3.5 w-3.5 text-gray-400" />
                {t('developer_environment')}
              </h2>
              <Row label={t('developer_env')} value={env?.env ?? '—'} />
              <Row
                label="debug"
                value={env?.debug ? 'on' : 'off'}
                tone={debugInProduction ? 'bad' : 'default'}
              />
              <Row label={t('developer_version')} value={env?.version ?? '—'} />
              <Row label="PHP" value={env?.php ?? '—'} />
              <Row label="Laravel" value={env?.laravel ?? '—'} />
              {/* Editing .env on the server does nothing while a config cache exists.
                  Cheap to state; expensive to rediscover. */}
              <Row label={t('developer_config_cached')} value={env?.configCached ? 'yes' : 'no'} />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Database className="h-3.5 w-3.5 text-gray-400" />
                {t('developer_database')}
              </h2>
              <Row
                label={t('developer_status')}
                value={db?.up ? 'up' : 'down'}
                tone={db?.up ? 'good' : 'bad'}
              />
              <Row label={t('developer_driver')} value={db?.driver ?? '—'} />
              <Row
                label={t('developer_latency')}
                value={db?.latencyMs != null ? `${db.latencyMs} ms` : '—'}
              />
              {db?.error && <p className="mt-2 break-words text-[11px] text-red-600">{db.error}</p>}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-1.5 text-sm font-semibold text-gray-900">{t('developer_queue')}</h2>
              <Row
                label={t('developer_queued')}
                value={queue?.queueLength ?? 0}
                tone={queue?.queueLength > 50 ? 'bad' : 'default'}
              />
              <Row label={t('developer_active')} value={queue?.activeTasks ?? 0} />
              <Row label="CPU" value={queue?.cpuCount ?? '—'} />
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default DeveloperPanel;
