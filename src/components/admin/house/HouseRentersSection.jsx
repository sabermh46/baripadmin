import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertCircle, AlertTriangle, Grid2x2, Grid3x3, IdCard, List, Mail, Pencil, Phone, Plus, Search,
  Trash2, UserPlus, Users,
} from 'lucide-react';
import { setRenterViewMode } from '../../../store/slices/uiSlice';
import { monthRelativity, monthName, dueBadgeTone, DUE_TEXT_TONE } from '../../../utils/rentMonth';

const money = (n) =>
  n == null ? '—' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * The three layouts, mirroring the flats section so one house page has one set of controls.
 *
 * The grids differ from the flats grids on purpose. A renter card carries a phone, an email
 * and an NID, so two-across on a phone would truncate all three — comfortable stays one per
 * row there. Compact is the mode that goes two-up, and it drops the contact block to earn it.
 */
const VIEW_MODES = {
  comfortable: {
    icon: Grid2x2,
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
    labelKey: 'view_comfortable',
  },
  compact: {
    icon: Grid3x3,
    grid: 'grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4',
    labelKey: 'view_compact',
  },
  list: {
    icon: List,
    grid: 'flex flex-col gap-2',
    labelKey: 'view_list',
  },
};

const FILTERS = [
  { key: 'all', labelKey: 'all' },
  { key: 'assigned', labelKey: 'renters_filter_assigned' },
  { key: 'unassigned', labelKey: 'renters_filter_unassigned' },
];

const RENT_STATE = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  partial: 'bg-blue-100 text-blue-800',
  none: 'bg-gray-100 text-gray-700',
};

/** The status chip's tone, toned by whether the month it refers to has actually arrived. */
const stateClass = (rentState, state) => {
  if (state === 'paid' || state === 'none') return RENT_STATE[state] ?? RENT_STATE.none;
  return dueBadgeTone(monthRelativity(rentState?.forMonth));
};

/**
 * The rent-status chip.
 *
 * `floating` hangs it on the card's top edge on phones and drops it back into the flow from
 * `sm` up — the same treatment the flat cards use, and for the same reason: in a two-up grid
 * on a 320px screen an in-flow chip claims about half the card and leaves the name a couple
 * of characters. Only compact needs it; comfortable is one card per row on mobile.
 */
const StatusBadge = ({ rentState, t, floating = false, small = false }) => {
  const state = rentState?.status ?? 'none';

  return (
    <span
      title={rentState?.forMonth ? t('rent_state_for_month', { month: rentState.forMonth }) : undefined}
      className={`shrink-0 whitespace-nowrap rounded font-medium ${stateClass(rentState, state)} ${
        small ? 'px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${floating ? 'absolute right-2 top-0 -translate-y-1/2 shadow-sm sm:static sm:translate-y-0 sm:shadow-none' : ''}`}
    >
      {rentState?.paidAhead ? t('rent_state_paid_ahead') : t(`rent_state_${state}`)}
    </span>
  );
};

/**
 * What this renter still owes, when they owe something.
 *
 * Same rule as the flat cards: red is reserved for a month that has actually passed, and the
 * month is always named — "৳19,000 due" on its own leaves the landlord to work out whether
 * that is a problem.
 */
const DueLine = ({ rentState, t, small = false }) => {
  if (!(rentState?.dueAmount > 0)) return null;

  const when = monthRelativity(rentState.forMonth);
  const label = monthName(rentState.forMonth, small);

  return (
    <p className={`font-semibold inline-flex items-center gap-1 ${DUE_TEXT_TONE[when]} ${small ? 'text-[11px]' : 'text-xs'}`}>
      {when === 'past' && <AlertCircle className={small ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />}
      {label
        ? t('amount_due_for_month', { amount: money(rentState.dueAmount), month: label })
        : t('amount_due', { amount: money(rentState.dueAmount) })}
    </p>
  );
};

const ContactLine = ({ renter }) => (
  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
    {renter.phone && (
      <span className="inline-flex items-center gap-1.5">
        <Phone className="h-3 w-3 text-gray-400 shrink-0" />
        {renter.phone}
      </span>
    )}
    {renter.email && (
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <Mail className="h-3 w-3 text-gray-400 shrink-0" />
        <span className="truncate">{renter.email}</span>
      </span>
    )}
    {renter.nid && (
      <span className="inline-flex items-center gap-1.5">
        <IdCard className="h-3 w-3 text-gray-400 shrink-0" />
        {renter.nid}
      </span>
    )}
  </div>
);

/**
 * Edit and delete for one renter.
 *
 * Delete stays visible but disabled while the renter occupies a flat, rather than being
 * hidden: a button that disappears explains nothing, whereas a disabled one with a reason
 * says to end the tenancy first. The server refuses the same case outright, so this is the
 * explanation, not the enforcement.
 *
 * `iconOnly` is for compact and list, where there is no room for the words — the labels move
 * to `aria-label` so the buttons still announce themselves rather than going nameless.
 */
const RenterActions = ({
  renter, assigned, canEdit, canDelete, onEdit, onDelete, t, iconOnly = false, className = '',
}) => {
  if (!canEdit && !canDelete) return null;

  const blocked = assigned ? t('renter_delete_blocked_assigned') : t('delete');

  return (
    <div className={`flex items-center gap-1.5 ${iconOnly ? '' : 'justify-end'} ${className}`}>
      {canEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(renter); }}
          title={t('edit')}
          aria-label={iconOnly ? t('edit') : undefined}
          className={`inline-flex items-center gap-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100 ${
            iconOnly ? 'h-7 w-7 justify-center' : 'px-2 py-1'
          }`}
        >
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          {!iconOnly && t('edit')}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={assigned}
          onClick={(e) => { e.stopPropagation(); onDelete(renter); }}
          title={blocked}
          aria-label={iconOnly ? blocked : undefined}
          className={`inline-flex items-center gap-1 rounded-lg text-xs ${
            assigned ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
          } ${iconOnly ? 'h-7 w-7 justify-center' : 'px-2 py-1'}`}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          {!iconOnly && t('delete')}
        </button>
      )}
    </div>
  );
};

/**
 * One renter, in either grid mode.
 *
 * Assigned and unassigned renters share this card rather than having one each: they differ
 * in three lines out of a dozen, and the two copies had already drifted — the unassigned one
 * never showed the inactive-status warning.
 */
const RenterCard = ({ renter, dense, onOpen, canEdit, canDelete, onEdit, onDelete, t }) => {
  const assigned = renter.flatId != null;
  const interactive = assigned && onOpen;

  return (
    // A div rather than a button: the card holds its own edit/delete buttons, and nesting a
    // button inside a button is invalid HTML that browsers resolve by dropping one.
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpen : undefined}
      onKeyDown={
        interactive
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }
          : undefined
      }
      className={`relative text-left bg-white border rounded-xl transition-colors ${
        dense ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3.5'
      } ${assigned ? 'border-gray-200' : 'border-dashed border-gray-300'} ${
        interactive ? 'cursor-pointer hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-1 sm:gap-3">
        <div className="min-w-0 flex-1">
          {/* Two lines, then ellipsis — the name is the only thing telling one card from the
              next, so it gets a second line before it gets cut. */}
          <p
            title={renter.name}
            className={`font-medium text-gray-900 leading-tight break-words line-clamp-2 ${
              dense ? 'text-[13px] sm:text-sm' : 'text-sm sm:text-base'
            }`}
          >
            {renter.name}
          </p>
          {assigned ? (
            <p className={`text-gray-500 mt-0.5 truncate ${dense ? 'text-[11px]' : 'text-xs'}`}>
              {t('lives_in_flat', { flat: renter.flatName })}
              {' · '}
              <span className="tabular-nums">{money(renter.rent)}</span>
            </p>
          ) : (
            <p className={`text-gray-500 mt-0.5 inline-flex items-center gap-1 ${dense ? 'text-[11px]' : 'text-xs'}`}>
              <UserPlus className="h-3 w-3 shrink-0" />
              <span className="truncate">{t('renter_awaiting_flat')}</span>
            </p>
          )}
        </div>

        {assigned ? (
          <StatusBadge rentState={renter.rentState} t={t} floating={dense} small={dense} />
        ) : (
          renter.status && renter.status !== 'active' && (
            <span
              className={`shrink-0 whitespace-nowrap rounded font-medium bg-gray-100 text-gray-700 ${
                dense
                  ? 'absolute right-2 top-0 -translate-y-1/2 shadow-sm sm:static sm:translate-y-0 sm:shadow-none px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]'
                  : 'px-2 py-0.5 text-[11px]'
              }`}
            >
              {renter.status}
            </span>
          )
        )}
      </div>

      {assigned && (
        <div className="mt-1.5">
          <DueLine rentState={renter.rentState} t={t} small={dense} />
        </div>
      )}

      {/* Compact drops the contact block: three lines of phone, email and NID is exactly the
          content that does not survive a half-width card, and dropping it is the whole point
          of asking for the dense layout. */}
      {!dense && <ContactLine renter={renter} />}

      {renter.status && renter.status !== 'active' && assigned && !dense && (
        // A renter marked inactive while still occupying a flat is a data problem someone
        // should look at, not something to render silently.
        <p className="mt-2 text-[11px] text-amber-700 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="truncate">{t('renter_marked_status', { status: renter.status })}</span>
        </p>
      )}

      <RenterActions
        renter={renter}
        assigned={assigned}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
        t={t}
        iconOnly={dense}
        className={dense ? 'mt-1.5 -mr-1 justify-end' : 'mt-2.5'}
      />
    </div>
  );
};

const RenterRow = ({ renter, onOpen, canEdit, canDelete, onEdit, onDelete, t }) => {
  const assigned = renter.flatId != null;
  const interactive = assigned && onOpen;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onOpen : undefined}
      onKeyDown={
        interactive
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }
          : undefined
      }
      className={`w-full text-left bg-white border rounded-lg px-3 sm:px-3.5 py-2.5 flex items-center gap-2 sm:gap-3 transition-colors ${
        assigned ? 'border-gray-200' : 'border-dashed border-gray-300'
      } ${interactive ? 'cursor-pointer hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p title={renter.name} className="font-medium text-gray-900 truncate">{renter.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {assigned
            ? `${t('lives_in_flat', { flat: renter.flatName })}${renter.phone ? ` · ${renter.phone}` : ''}`
            : t('renter_awaiting_flat')}
        </p>
        <DueLine rentState={renter.rentState} t={t} small />
      </div>

      {assigned && (
        <span className="hidden sm:inline font-semibold text-gray-900 shrink-0 tabular-nums">
          {money(renter.rent)}
        </span>
      )}
      {assigned && <StatusBadge rentState={renter.rentState} t={t} />}

      <RenterActions
        renter={renter}
        assigned={assigned}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
        t={t}
        iconOnly
        className="shrink-0"
      />
    </div>
  );
};

/**
 * Everyone this house's owner has on file.
 *
 * Tenancies are derived from `house.flats` rather than fetched — a renter is in this house
 * by virtue of occupying one of its flats, so the flats array already carries every tenancy
 * and the flat each belongs to. Deriving keeps one source of truth (a renter cannot appear
 * here while their flat says vacant) and costs no extra request.
 *
 * Renters with no flat come from the same house response. They belong here even though they
 * are in no flat: a renter is created first and assigned second, so without them the "add
 * renter" button would lead nowhere visible — you fill the form, the renter is saved, and
 * the page looks unchanged.
 */
const HouseRentersSection = ({
  flats = [],
  unassignedRenters = [],
  can = () => false,
  onAddRenter,
  onEditRenter,
  onDeleteRenter,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Persisted in the ui slice, so the layout a user picks is still there next visit.
  const viewMode = useSelector((s) => s.ui.renterViewMode) ?? 'comfortable';
  const mode = VIEW_MODES[viewMode] ?? VIEW_MODES.comfortable;

  const canCreate = can('renters.create');
  const canEdit = can('renters.edit');
  const canDelete = can('renters.delete');

  const tenancies = useMemo(
    () =>
      flats
        .filter((f) => f.renter)
        .map((f) => ({
          flatId: f.id,
          flatName: f.name || f.number || `#${f.id}`,
          rent: f.rent_amount,
          rentState: f.rentState ?? {},
          ...f.renter,
        })),
    [flats]
  );

  const term = search.trim().toLowerCase();
  const matches = useMemo(
    () => (r) =>
      !term ||
      r.name?.toLowerCase().includes(term) ||
      r.phone?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.flatName?.toLowerCase().includes(term),
    [term]
  );

  const visible = useMemo(
    () => (filter === 'unassigned' ? [] : tenancies.filter(matches)),
    [tenancies, matches, filter]
  );
  const visibleUnassigned = useMemo(
    () => (filter === 'assigned' ? [] : unassignedRenters.filter(matches)),
    [unassignedRenters, matches, filter]
  );

  const owing = tenancies.filter((r) => ['pending', 'overdue', 'partial'].includes(r.rentState?.status)).length;

  const cardProps = {
    canEdit, canDelete, onEdit: onEditRenter, onDelete: onDeleteRenter, t,
  };

  const renderOne = (renter, key) =>
    viewMode === 'list' ? (
      <RenterRow
        key={key}
        renter={renter}
        onOpen={renter.flatId != null ? () => navigate(`/flats/${renter.flatId}`) : null}
        {...cardProps}
      />
    ) : (
      <RenterCard
        key={key}
        renter={renter}
        dense={viewMode === 'compact'}
        onOpen={renter.flatId != null ? () => navigate(`/flats/${renter.flatId}`) : null}
        {...cardProps}
      />
    );

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('renters')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('renters_in_this_house', { count: tenancies.length })}
            {owing > 0 && (
              <span className="text-amber-700"> · {t('renters_owing', { count: owing })}</span>
            )}
            {unassignedRenters.length > 0 && (
              <span> · {t('renters_unassigned_count', { count: unassignedRenters.length })}</span>
            )}
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
                  onClick={() => dispatch(setRenterViewMode(key))}
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

          {canCreate && (
            <button
              type="button"
              onClick={onAddRenter}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('add_renter')}</span>
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
            placeholder={t('search_renters')}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === key ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tenancies.length === 0 && unassignedRenters.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl py-8 text-center">
          <Users className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('no_renters_in_house')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('assign_renter_from_flat_hint')}</p>
        </div>
      ) : visible.length === 0 && visibleUnassigned.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">{t('no_renters_match')}</p>
      ) : (
        <div className="space-y-5">
          {visible.length > 0 && (
            <div className={mode.grid}>
              {visible.map((r) => renderOne(r, `${r.flatId}-${r.id}`))}
            </div>
          )}

          {visibleUnassigned.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('renters_not_assigned')}
              </p>
              <div className={mode.grid}>
                {visibleUnassigned.map((r) => renderOne(r, `u-${r.id}`))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default HouseRentersSection;
