import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertCircle, BedDouble, CalendarDays, Grid2x2, Grid3x3, List, Phone, Plus, Search, UserPlus, Wallet,
} from 'lucide-react';
import { setFlatViewMode } from '../../../store/slices/uiSlice';
import { monthRelativity, monthName, dueBadgeTone, DUE_TEXT_TONE } from '../../../utils/rentMonth';
import { useAuth } from '../../../hooks';

const money = (n) =>
  n == null ? '—' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * The three layouts, and the grid each one resolves to.
 *
 * Two columns on mobile in both grid modes — a four-across grid on a phone gives cards too
 * narrow to show a renter name and a rent figure, which is the entire point of the card.
 * Desktop is where the density choice actually means something.
 */
const VIEW_MODES = {
  comfortable: {
    icon: Grid2x2,
    grid: 'grid grid-cols-2 lg:grid-cols-4 gap-3',
    labelKey: 'view_comfortable',
  },
  compact: {
    icon: Grid3x3,
    grid: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2',
    labelKey: 'view_compact',
  },
  list: {
    icon: List,
    grid: 'flex flex-col gap-2',
    labelKey: 'view_list',
  },
};

const RENT_STATE = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  partial: 'bg-blue-100 text-blue-800',
  none: 'bg-gray-100 text-gray-600',
};

/**
 * The amount still owed, when something is owed.
 *
 * `rentState.dueAmount` totals every unsettled period, not just the oldest one, so a tenant
 * three months behind reads differently from one who is a month late — which was the whole
 * complaint about a card that said only "overdue".
 */
const DueLine = ({ rent, t, small = false }) => {
  if (!(rent?.dueAmount > 0)) return null;

  // Red is reserved for money that is actually late. A bill for a month still ahead of us
  // reads calm, and either way the month is named — "৳19,000 due" with no month leaves the
  // landlord to work out whether that is a problem.
  const when = monthRelativity(rent.forMonth);
  const label = monthName(rent.forMonth, small);

  return (
    <p className={`font-semibold inline-flex items-center gap-1 ${DUE_TEXT_TONE[when]} ${small ? 'text-[11px]' : 'text-xs'}`}>
      {when === 'past' && <AlertCircle className={small ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />}
      {label
        ? t('amount_due_for_month', { amount: money(rent.dueAmount), month: label })
        : t('amount_due', { amount: money(rent.dueAmount) })}
      {rent.duePeriods > 1 && (
        <span className="font-normal opacity-80">{t('due_periods', { count: rent.duePeriods })}</span>
      )}
    </p>
  );
};

/** The status chip, toned by whether the month it refers to has actually arrived. */
const stateClass = (rent, state) => {
  if (state === 'paid' || state === 'none') return RENT_STATE[state] ?? RENT_STATE.none;
  return dueBadgeTone(monthRelativity(rent?.forMonth));
};

const FlatCard = ({ flat, dense, onOpen, onAssign, t }) => {
  const rent = flat.rentState ?? {};
  const state = rent.status ?? 'none';

  return (
    // A div, not a button: the card carries its own actions, and a button inside a button
    // is invalid HTML that browsers resolve by dropping one of them.
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`text-left bg-white border rounded-xl transition-all cursor-pointer hover:border-primary/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        dense ? 'p-2.5' : 'p-3.5'
      } ${flat.isOccupied ? 'border-gray-200' : 'border-dashed border-gray-300'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold text-gray-900 truncate ${dense ? 'text-sm' : 'text-base'}`}>
            {flat.name || flat.number || `#${flat.id}`}
          </p>
          {!dense && flat.number && flat.name && (
            <p className="text-[11px] text-gray-500">{flat.number}</p>
          )}
        </div>
        <span
          title={rent.forMonth ? t('rent_state_for_month', { month: rent.forMonth }) : undefined}
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${stateClass(rent, state)}`}
        >
          {rent.paidAhead ? t('rent_state_paid_ahead') : t(`rent_state_${state}`)}
        </span>
      </div>

      <p className={`font-semibold text-gray-900 ${dense ? 'text-sm mt-1' : 'text-lg mt-1.5'}`}>
        {money(flat.rent_amount)}
      </p>

      {/* Compact used to drop the tenant entirely, which made the densest view the least
          useful one — who lives here is the first thing anyone looks for. */}
      {dense && (
        <div className="mt-1 space-y-0.5">
          <p className="text-[11px] text-gray-600 truncate">
            {flat.isOccupied ? flat.renterName : t('vacant')}
          </p>
          <DueLine rent={rent} t={t} small />
          {!flat.isOccupied && onAssign && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAssign(flat); }}
              className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              {t('assign_renter')}
            </button>
          )}
        </div>
      )}

      {!dense && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          {flat.isOccupied ? (
            <>
              <p className="text-xs text-gray-700 truncate flex items-center gap-1.5">
                <BedDouble className="h-3 w-3 shrink-0 text-gray-400" />
                {flat.renterName}
              </p>
              {flat.renterPhone && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 text-gray-400" />
                  {flat.renterPhone}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <BedDouble className="h-3 w-3 shrink-0" />
                {t('vacant')}
              </p>
              {onAssign && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAssign(flat); }}
                  className="mt-1 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('assign_renter')}
                </button>
              )}
            </>
          )}
          <DueLine rent={rent} t={t} />
          {flat.should_pay_rent_day && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {t('rent_due_day', { day: flat.should_pay_rent_day })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const FlatRow = ({ flat, onOpen, onAssign, t }) => {
  const rent = flat.rentState ?? {};
  const state = rent.status ?? 'none';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="w-full text-left bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 flex items-center gap-3 cursor-pointer hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{flat.name || flat.number || `#${flat.id}`}</p>
        <p className="text-xs text-gray-500 truncate">
          {flat.isOccupied ? `${flat.renterName}${flat.renterPhone ? ` · ${flat.renterPhone}` : ''}` : t('vacant')}
        </p>
        <DueLine rent={rent} t={t} small />
      </div>

      {!flat.isOccupied && onAssign && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAssign(flat); }}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('assign_renter')}</span>
        </button>
      )}
      {flat.should_pay_rent_day && (
        <span className="hidden sm:inline text-[11px] text-gray-400 shrink-0">
          {t('rent_due_day', { day: flat.should_pay_rent_day })}
        </span>
      )}
      <span className="font-semibold text-gray-900 shrink-0 tabular-nums">{money(flat.rent_amount)}</span>
      <span
        title={rent.forMonth ? t('rent_state_for_month', { month: rent.forMonth }) : undefined}
        className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${stateClass(rent, state)}`}
      >
        {rent.paidAhead ? t('rent_state_paid_ahead') : t(`rent_state_${state}`)}
      </span>
    </div>
  );
};

/**
 * The flats half of the consolidated house page.
 *
 * This used to live at /houses/{id}/flats as its own route, which meant seeing a house and
 * seeing its flats were two navigations and two page loads for what is one question.
 * Everything here comes from the house response that the page has already fetched.
 */
const HouseFlatsSection = ({ flats = [], onAddFlat, onAssignRenter, can }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { hasPermission } = useAuth();
  // `can` comes from the house page, which also knows this user's per-house caretaker
  // grants; hasPermission alone only sees account-level ones.
  const allowed = can ?? hasPermission;
  const canAssign = allowed('flats.assign');

  // Persisted in the ui slice, so the layout a user picks is still there next visit.
  const viewMode = useSelector((s) => s.ui.flatViewMode) ?? 'comfortable';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return flats.filter((f) => {
      if (filter === 'occupied' && !f.isOccupied) return false;
      if (filter === 'vacant' && f.isOccupied) return false;
      if (!term) return true;
      return (
        f.name?.toLowerCase().includes(term) ||
        f.number?.toLowerCase().includes(term) ||
        f.renterName?.toLowerCase().includes(term)
      );
    });
  }, [flats, search, filter]);

  const mode = VIEW_MODES[viewMode] ?? VIEW_MODES.comfortable;
  const occupied = flats.filter((f) => f.isOccupied).length;

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('flats')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('flats_occupancy_summary', { occupied, total: flats.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout switch. Icon-only — three states that are obvious by shape. */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5" role="group" aria-label={t('layout')}>
            {Object.entries(VIEW_MODES).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const active = key === viewMode;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => dispatch(setFlatViewMode(key))}
                  aria-pressed={active}
                  title={t(cfg.labelKey)}
                  className={`p-1.5 rounded-md transition-colors ${
                    active ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {allowed('flats.create') && (
            <button
              type="button"
              onClick={onAddFlat}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('add_flat')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_flats')}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        {['all', 'occupied', 'vacant'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t(key === 'all' ? 'all' : key)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl py-10 text-center">
          <Wallet className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {flats.length === 0 ? t('no_flats_in_house') : t('no_flats_match')}
          </p>
        </div>
      ) : (
        <div className={mode.grid}>
          {visible.map((flat) =>
            viewMode === 'list' ? (
              <FlatRow
                key={flat.id}
                flat={flat}
                t={t}
                onOpen={() => navigate(`/flats/${flat.id}`)}
                onAssign={canAssign ? onAssignRenter : null}
              />
            ) : (
              <FlatCard
                key={flat.id}
                flat={flat}
                dense={viewMode === 'compact'}
                t={t}
                onOpen={() => navigate(`/flats/${flat.id}`)}
                onAssign={canAssign ? onAssignRenter : null}
              />
            )
          )}
        </div>
      )}
    </section>
  );
};

export default HouseFlatsSection;
