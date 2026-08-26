import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, DoorOpen, KeyRound, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../hooks';
import { useGetHouseOwnerDashboardDataQuery } from '../../store/api/houseOwnerAnalyticsApi';
import { useGetDashboardDataQuery } from '../../store/api/analyticsApi';
import { useGetCaretakerDetailsQuery } from '../../store/api/caretakerApi';
import { roleTheme } from './roleTheme';

/**
 * Pick the wording variant by hand rather than leaning on i18next's plural suffixes.
 *
 * Two reasons. The codebase already selects variants this way (see owners_without_house_one
 * / _many in SystemDashboard), and neither English nor Bengali has a `zero` plural category
 * in Intl.PluralRules — so a real zero-state sentence is unreachable through the plural
 * machinery. Zero is the case that matters most here: a brand-new owner should be met with
 * an invitation, not "0 families call your buildings home".
 */
const variant = (base, n) => `${base}_${n === 0 ? 'zero' : n === 1 ? 'one' : 'other'}`;

const num = (n) => Number(n ?? 0).toLocaleString('en-US');
const money = (n) => `৳${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const Tile = ({ icon: Icon, value, label, tone }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-3 min-w-0">
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
    </span>
    <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums truncate">{value}</p>
    <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
  </div>
);

const Skeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
    ))}
  </div>
);

/**
 * What this person has actually built or looks after, in their own terms.
 *
 * Each role reads a different endpoint, and each is skipped for every other role — the three
 * are not interchangeable and two of them refuse the wrong caller outright. Measured, not
 * assumed: /analytics/dashboard answers 200 for web_owner and staff, and 403 for house_owner
 * *and* developer, so the developer is deliberately not subscribed to it either.
 *
 * The headline is the point of the section. A count of houses is administrative; "3 families
 * call your buildings home" is the same number said in a way that means something to the
 * person who made it true.
 */
const RoleImpact = () => {
  const { t } = useTranslation();
  const { user, isHouseOwner, isCaretaker, isWebOwner, isStaff } = useAuth();
  const theme = roleTheme(user?.role?.slug);

  const isPlatformAdmin = isWebOwner || isStaff;

  const owner = useGetHouseOwnerDashboardDataQuery(undefined, { skip: !isHouseOwner });
  const admin = useGetDashboardDataQuery(undefined, { skip: !isPlatformAdmin });
  const caretaker = useGetCaretakerDetailsQuery(user?.id, { skip: !isCaretaker || !user?.id });

  const active = isHouseOwner ? owner : isPlatformAdmin ? admin : isCaretaker ? caretaker : null;
  if (!active) return null;
  if (active.isLoading) return <Skeleton />;

  // A refused or failed lookup must not turn the profile into an error page — the identity
  // and security sections below are the part someone came here for.
  if (active.error || !active.data) return null;

  let headline = null;
  let tiles = [];

  if (isHouseOwner) {
    const s = active.data?.data?.summary ?? active.data?.summary ?? {};
    const n = Number(s.activeRenters ?? 0);
    headline = t(variant('impact_owner', n), { count: n });
    tiles = [
      { icon: Building2, value: num(s.activeHouses), label: t('houses') },
      { icon: DoorOpen, value: `${num(s.occupiedFlats)}/${num(s.totalFlats)}`, label: t('occupied') },
      { icon: TrendingUp, value: `${num(s.occupancyRate)}%`, label: t('occupancy_rate') },
      { icon: Wallet, value: money(s.monthlyRentCollection), label: t('monthly_rent') },
    ];
  } else if (isPlatformAdmin) {
    const q = active.data?.data?.quickStats ?? active.data?.quickStats ?? {};
    const n = Number(q.totalHouses ?? 0);
    headline = t(variant('impact_admin', n), { count: n });
    tiles = [
      { icon: Users, value: num(q.totalUsers), label: t('total_users') },
      { icon: Building2, value: num(q.totalHouses), label: t('houses') },
      { icon: DoorOpen, value: num(q.totalFlats), label: t('flats') },
      { icon: Users, value: num(q.totalRenters), label: t('renters') },
    ];
  } else {
    const d = active.data?.data ?? active.data ?? {};
    const s = d.stats ?? {};
    const assignments = d.assignments ?? [];
    const n = Number(s.activeAssignments ?? assignments.length);
    // Owners, not a second count of the same houses. `activeAssignments` and
    // `assignments.length` are the same number — verified against a live caretaker, both 1 —
    // so showing them side by side filled a tile without adding a fact. How many different
    // people rely on them is a different, larger thing to be told about yourself.
    const owners = new Set(assignments.map((a) => a.houseOwner?.id).filter(Boolean)).size;
    headline = t(variant('impact_caretaker', n), { count: n });
    tiles = [
      { icon: Building2, value: num(n), label: t('houses') },
      { icon: Users, value: num(owners), label: t('house_owners') },
      { icon: KeyRound, value: num(user?.permissions?.length ?? 0), label: t('permissions') },
    ];
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <p className="flex items-start gap-2 text-sm sm:text-base font-semibold text-gray-900 mb-3">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>{headline}</span>
      </p>
      <div className={`grid gap-2.5 ${tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {tiles.map((tile) => (
          <Tile key={tile.label} {...tile} tone={theme.tile} />
        ))}
      </div>
    </section>
  );
};

export default RoleImpact;
