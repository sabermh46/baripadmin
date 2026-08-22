/* eslint-disable react-hooks/preserve-manual-memoization */
// components/dashboard/SystemDashboard.jsx
import React, { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Link } from 'react-router-dom';
import { useGetDashboardDataQuery } from '../../store/api/analyticsApi';
import {
  Users, Home, Building, Users as Staff, Shield, Activity, Mail, Inbox,
  AlertTriangle, CheckCircle2, Wallet, Receipt, Database, BellRing, UserX, ChevronRight,
} from 'lucide-react';
import { ContentLoader } from '../common/RouteLoader';
import Btn from '../common/Button';
import { useAuth } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '../../utils/apiError';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import appLogo from '../../assets//icons/logo.svg';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const money = (n) =>
  `\u09f3${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * Tailwind scans source for complete class names, so `bg-${color}-100` was never emitted and
 * every icon on this dashboard rendered unstyled. A static map is what the scanner can see.
 */
const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

const StatCard = ({ title, value, icon: Icon, tone = 'slate', sub }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
    <div className={`inline-flex p-2 rounded-lg ${TONES[tone] ?? TONES.slate}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-2.5 tabular-nums leading-none">{value}</p>
    <p className="text-[11px] uppercase tracking-wider text-gray-400 mt-1.5">{title}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
  </div>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">{title}</h3>
    {children}
  </div>
);

/**
 * One operational reading. Green when there is nothing to do, amber or red when there is —
 * so the row can be read at a glance instead of parsed number by number.
 */
const OpsStat = ({ icon: Icon, label, value, detail, state = 'ok' }) => {
  const tones = {
    ok: 'text-emerald-600 bg-emerald-50',
    warn: 'text-amber-600 bg-amber-50',
    bad: 'text-red-600 bg-red-50',
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className={`shrink-0 p-1.5 rounded-lg ${tones[state]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 truncate">{label}</p>
        <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
      </div>
      {detail && <span className="text-[11px] text-gray-500 shrink-0">{detail}</span>}
    </div>
  );
};

const ActivityRow = ({ title, meta, time, icon: Icon }) => (
  <div className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
    <Icon className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      {/* Joined after filtering: the old version printed "\u2022 Admin \u2022 8/22/2026" with a
          leading bullet whenever a field was absent, which was most of the time. */}
      <p className="text-xs text-gray-500 truncate">
        {[meta, time].filter(Boolean).join(' \u00b7 ')}
      </p>
    </div>
  </div>
);

const EmptyRows = ({ label }) => (
  <p className="text-sm text-gray-400 text-center py-6">{label}</p>
);

/**
 * House owners with no house.
 *
 * Rendered in danger colours because it is one: the account is counted in every total on
 * this page, but it bills nothing and collects nothing, and nothing else on the platform
 * distinguishes it from a working owner. Shown only when there is at least one — a standing
 * red panel that is usually empty teaches people to ignore red.
 */
const OwnersWithoutHouse = ({ data, t }) => {
  const count = data?.count ?? 0;
  const owners = data?.owners ?? [];
  if (count === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-red-200 bg-red-50/60 overflow-hidden">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <span className="shrink-0 p-2 rounded-lg bg-red-100 text-red-600">
          <UserX className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-red-900">
            {count === 1 ? t('owners_without_house_one') : t('owners_without_house_many', { count })}
          </p>
          <p className="text-sm text-red-800/80 mt-0.5">{t('owners_without_house_hint')}</p>
          {/* Outside the row links below — an anchor inside an anchor is invalid, and this
              belongs to the group rather than to any single owner. */}
          {owners.some((o) => o.archivedHouses > 0) && (
            <Link to="/houses/archived" className="inline-block text-sm font-medium text-red-700 underline mt-1.5">
              {t('view_archived')}
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white/70 divide-y divide-red-100">
        {owners.map((o) => (
          <Link
            key={o.id}
            to={`/admin/house-owners/${o.id}`}
            className="group flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{o.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {[o.email, o.phone].filter(Boolean).join(' \u00b7 ')}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-500">
                {o.daysWaiting === 0 ? t('joined_today') : t('joined_days_ago', { count: o.daysWaiting })}
              </p>
              {/* An owner whose house was archived is a different story from one who never
                  had a house, and the fix is different too. */}
              {o.archivedHouses > 0 && (
                <p className="text-[11px] text-amber-700">{t('house_was_archived')}</p>
              )}
            </div>

            <ChevronRight className="h-4 w-4 text-red-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}

        {count > owners.length && (
          <p className="px-5 py-2 text-xs text-gray-500">{t('and_n_more', { count: count - owners.length })}</p>
        )}
      </div>
    </section>
  );
};

const SystemDashboard = () => {
  const { data, error, isLoading, isFetching, refetch } = useGetDashboardDataQuery(undefined, {
    // Always fetch on mount, follow the tab back when it regains focus, and poll while it is
    // actually being looked at. skipPollingIfUnfocused means a dashboard left open in a
    // background tab costs nothing until someone returns to it.
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = 'Anonymous'; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
        });
    };

  const handleExportPDF = async () => {
    if (!data) return;

    const doc = new jsPDF();
    const primaryColorRGB = [15, 23, 42]; // Matches slate-800

    // 1. Branding & Header (Same as your ReportGenPage)
    try {
        const logoData = await getLogoBase64(appLogo);
        if (logoData) doc.addImage(logoData, 'PNG', 20, 15, 12, 12);
    } catch {
        doc.setFillColor(...primaryColorRGB);
        doc.circle(26, 21, 6, 'F');
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Bari Porichalona", 36, 21);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("System Administration Dashboard", 36, 26);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("SYSTEM OVERVIEW REPORT", 130, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated By: ${user?.name}`, 130, 26);
    doc.text(`Date: ${new Date().toLocaleString()}`, 130, 31);

    doc.setDrawColor(...primaryColorRGB);
    doc.line(20, 36, 190, 36);

    // 2. Quick Stats Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColorRGB);
    doc.text("Key Metrics", 20, 45);

    autoTable(doc, {
        startY: 50,
        margin: { left: 20 },
        tableWidth: 170,
        head: [['Metric', 'Value', 'Status']],
        body: [
            ['Total Users', data.quickStats.totalUsers, 'Active'],
            ['Total Houses', data.quickStats.totalHouses, 'Operational'],
            ['Total Flats', data.quickStats.totalFlats, 'Recorded'],
            // 'System Health 100% Excellent' and a server-load reading used to sit here.
            // Neither was measured. What replaces them is measured.
            ['Occupied Flats', `${data.platform.occupiedFlats} of ${data.platform.totalFlats}`, `${data.platform.occupancyRate}%`],
            ['Rent Collected (month)', money(data.platform.rentCollectedThisMonth), 'Received'],
            ['Rent Outstanding', money(data.platform.rentOutstanding), data.platform.rentOverdueCount > 0 ? `${data.platform.rentOverdueCount} overdue` : 'None overdue'],
            ['Email Queue', `${data.operations.emailPending} pending`, data.operations.emailFailed > 0 ? `${data.operations.emailFailed} failed` : 'Healthy'],
            ['Background Jobs', `${data.operations.jobsPending} pending`, data.operations.jobsFailed > 0 ? `${data.operations.jobsFailed} failed` : 'Healthy'],
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColorRGB },
    });

    // 3. User Role Distribution
    const finalY1 = doc.lastAutoTable.finalY;
    doc.text("Role Distribution", 20, finalY1 + 15);
    
    autoTable(doc, {
        startY: finalY1 + 20,
        margin: { left: 20 },
        tableWidth: 80,
        head: [['Role', 'Count']],
        body: data.systemOverview.roleDistribution.map(r => [r.role, r.count]),
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139] }, // Slate-500
    });

    // 4. Recent Houses Table (Horizontal placement or below)
    const finalY2 = doc.lastAutoTable.finalY;
    doc.text("Recently Added Properties", 20, finalY2 + 15);

    const houseRows = data.recentActivities.recentHouses.map(h => [
        h.name,
        h.address,
        h.owner.name,
        new Date(h.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
        startY: finalY2 + 20,
        margin: { left: 20, right: 20 },
        head: [['House Name', 'Address', 'Owner', 'Created']],
        body: houseRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColorRGB },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Bari Porichalona Confidential | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`System_Dashboard_Report_${new Date().getTime()}.pdf`);
};

  const { t } = useTranslation();
  const { user } = useAuth();

  const ops = data?.operations ?? {};
  const platform = data?.platform ?? {};
  const quick = data?.quickStats ?? {};

  const stats = useMemo(() => [
    { title: t('total_users'), value: quick.totalUsers ?? 0, icon: Users, tone: 'blue' },
    { title: t('total_houses'), value: quick.totalHouses ?? 0, icon: Home, tone: 'green' },
    {
      title: t('total_flats'),
      value: quick.totalFlats ?? 0,
      icon: Building,
      tone: 'amber',
      sub: t('occupied_of_total', { occupied: platform.occupiedFlats ?? 0, total: platform.totalFlats ?? 0 }),
    },
    { title: t('renters'), value: quick.totalRenters ?? 0, icon: Users, tone: 'purple' },
    { title: t('active_staff'), value: quick.activeStaff ?? 0, icon: Staff, tone: 'rose' },
    { title: t('caretakers'), value: quick.activeCaretakers ?? 0, icon: Shield, tone: 'slate' },
  ], [quick, platform, t]);

  if (isLoading) return <ContentLoader />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('failed_to_load_dashboard')}</h3>
          <p className="text-sm text-gray-600 mb-4">{apiErrorMessage(error)}</p>
          <Btn type="primary" onClick={refetch}>{t('retry')}</Btn>
        </div>
      </div>
    );
  }

  const updatedAt = data?.timestamp ? new Date(data.timestamp) : null;
  const emailLate = (ops.emailOldestPendingMins ?? 0) > 30;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">
            {t('welcome')}, <span className="font-semibold text-primary">{user?.name}</span>
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-0.5">{t('system_dashboard')}</h1>
          {/* Guarded: an absent timestamp used to render the words "Invalid Date". */}
          {updatedAt && !Number.isNaN(updatedAt.getTime()) && (
            <p className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1.5">
              {/* isFetching rather than isLoading: a refresh of data already on screen should
                  say so quietly, not blank the page out and start again. */}
              {isFetching && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
              {isFetching ? t('updating') : t('last_updated', { time: updatedAt.toLocaleString() })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Btn type="secondary" onClick={refetch}>{t('refresh')}</Btn>
          <Btn type="secondary" onClick={handleExportPDF}>{t('export_report')}</Btn>
          <Btn type="primary" href="/admin/generate-token">{t('generate_invitation_link')}</Btn>
        </div>
      </div>

      <OwnersWithoutHouse data={data?.ownersWithoutHouse} t={t} />

      {/* Money first — what the platform is actually doing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Wallet}
          tone="green"
          title={t('rent_collected_this_month')}
          value={money(platform.rentCollectedThisMonth)}
        />
        <StatCard
          icon={Receipt}
          tone={platform.rentOutstanding > 0 ? 'rose' : 'slate'}
          title={t('rent_outstanding')}
          value={money(platform.rentOutstanding)}
          sub={platform.rentOverdueCount > 0 ? t('n_overdue', { count: platform.rentOverdueCount }) : t('nothing_owed')}
        />
        <StatCard
          icon={Wallet}
          tone="blue"
          title={t('app_fee_collected_this_month')}
          value={money(platform.appFeeCollectedThisMonth)}
          sub={platform.appFeeAwaitingCheck > 0 ? t('n_awaiting_check', { count: platform.appFeeAwaitingCheck }) : undefined}
        />
        <StatCard
          icon={Building}
          tone="amber"
          title={t('occupancy')}
          value={`${platform.occupancyRate ?? 0}%`}
          sub={t('occupied_of_total', { occupied: platform.occupiedFlats ?? 0, total: platform.totalFlats ?? 0 })}
        />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((stat, index) => <StatCard key={index} {...stat} />)}
      </div>

      {/*
        This strip replaces a radar chart of six invented percentages — Response Time 95,
        Uptime 99, Database 98, Cache 92, Security 100, Backups 97 — none of which was
        measured anywhere. Everything below is read from the tables that would actually
        show a problem: mail that is not going out, jobs that failed, a database slowing
        down. It is the only part of this page that can tell an admin to do something.
      */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            {t('system_operations')}
          </h3>
          {ops.emailFailed > 0 || ops.jobsFailed > 0 || emailLate ? (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {t('needs_attention')}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('all_clear')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 p-2">
          <OpsStat
            icon={Inbox}
            label={t('email_queue')}
            value={t('n_pending', { count: ops.emailPending ?? 0 })}
            detail={emailLate ? t('waiting_minutes', { count: ops.emailOldestPendingMins }) : null}
            state={emailLate ? 'bad' : (ops.emailPending > 0 ? 'warn' : 'ok')}
          />
          <OpsStat
            icon={Mail}
            label={t('email_sent_today')}
            value={ops.emailSentToday ?? 0}
            detail={ops.emailFailed > 0 ? t('n_failed', { count: ops.emailFailed }) : null}
            state={ops.emailFailed > 0 ? 'bad' : 'ok'}
          />
          <OpsStat
            icon={Activity}
            label={t('background_jobs')}
            value={t('n_pending', { count: ops.jobsPending ?? 0 })}
            detail={ops.jobsFailed > 0 ? t('n_failed', { count: ops.jobsFailed }) : null}
            state={ops.jobsFailed > 0 ? 'bad' : 'ok'}
          />
          <OpsStat
            icon={BellRing}
            label={t('push_subscriptions')}
            value={ops.pushSubscriptions ?? 0}
            state={(ops.pushSubscriptions ?? 0) > 0 ? 'ok' : 'warn'}
          />
          <OpsStat
            icon={Database}
            label={t('database_response')}
            value={`${data?.systemOverview?.summary?.databaseLatencyMs ?? 0} ms`}
            detail={t('activity_24h', { count: data?.systemOverview?.summary?.recentActivity ?? 0 })}
            state={(data?.systemOverview?.summary?.databaseLatencyMs ?? 0) > 200 ? 'warn' : 'ok'}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('user_growth_last_12_months')}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.systemOverview?.userGrowth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary-300)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t('house_distribution')}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: t('active'), value: data?.systemOverview?.houseStats?.activeHouses || 0 },
                { name: t('inactive'), value: data?.systemOverview?.houseStats?.inactiveHouses || 0 },
                { name: t('with_flats'), value: data?.systemOverview?.houseStats?.housesWithFlats || 0 },
                { name: t('with_caretakers'), value: data?.systemOverview?.houseStats?.housesWithCaretakers || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title={t('role_distribution')}>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data?.systemOverview?.roleDistribution ?? []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.role}: ${entry.count}`}
                outerRadius={80}
                dataKey="count"
              >
                {(data?.systemOverview?.roleDistribution ?? []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Recent activity — each list now says so when it is empty, rather than
          rendering a titled card with nothing under it. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title={t('recent_users')}>
          {data?.recentActivities?.recentUsers?.length ? (
            <div className="space-y-1">
              {data.recentActivities.recentUsers.map((u, i) => (
                <ActivityRow
                  key={i}
                  title={u.name || u.email}
                  meta={u.role?.name}
                  time={u.createdAt ? new Date(u.createdAt).toLocaleDateString() : null}
                  icon={Users}
                />
              ))}
            </div>
          ) : <EmptyRows label={t('no_records_yet')} />}
        </ChartCard>

        <ChartCard title={t('recent_houses')}>
          {data?.recentActivities?.recentHouses?.length ? (
            <div className="space-y-1">
              {data.recentActivities.recentHouses.map((h, i) => (
                <ActivityRow
                  key={i}
                  title={h?.name}
                  meta={[h?.address, h?.owner?.name].filter(Boolean).join(' \u00b7 ')}
                  time={h?.createdAt ? new Date(h.createdAt).toLocaleDateString() : null}
                  icon={Home}
                />
              ))}
            </div>
          ) : <EmptyRows label={t('no_records_yet')} />}
        </ChartCard>

        <ChartCard title={t('recent_notices')}>
          {data?.recentActivities?.recentNotices?.length ? (
            <div className="space-y-1">
              {data.recentActivities.recentNotices.map((n, i) => (
                <ActivityRow
                  key={i}
                  title={n.title}
                  meta={n.house?.address}
                  time={n.createdAt ? new Date(n.createdAt).toLocaleDateString() : null}
                  icon={Activity}
                />
              ))}
            </div>
          ) : <EmptyRows label={t('no_records_yet')} />}
        </ChartCard>
      </div>
    </div>
  );
};

export default SystemDashboard;
