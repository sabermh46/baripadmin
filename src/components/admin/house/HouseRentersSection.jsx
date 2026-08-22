import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, AlertTriangle, IdCard, Mail, Pencil, Phone, Plus, Search, Trash2, UserPlus, Users,
} from 'lucide-react';
import { monthRelativity, monthName, dueBadgeTone, DUE_TEXT_TONE } from '../../../utils/rentMonth';

const money = (n) =>
  n == null ? '—' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const RENT_STATE = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  partial: 'bg-blue-100 text-blue-800',
  none: 'bg-gray-100 text-gray-600',
};

const ContactLine = ({ renter }) => (
  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
    {renter.phone && (
      <span className="inline-flex items-center gap-1.5">
        <Phone className="h-3 w-3 text-gray-400" />
        {renter.phone}
      </span>
    )}
    {renter.email && (
      <span className="inline-flex items-center gap-1.5 truncate">
        <Mail className="h-3 w-3 text-gray-400 shrink-0" />
        <span className="truncate">{renter.email}</span>
      </span>
    )}
    {renter.nid && (
      <span className="inline-flex items-center gap-1.5">
        <IdCard className="h-3 w-3 text-gray-400" />
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
 */
const RenterActions = ({ renter, assigned, canEdit, canDelete, onEdit, onDelete, t }) => {
  if (!canEdit && !canDelete) return null;

  return (
    <div className="mt-2.5 flex items-center justify-end gap-1.5">
      {canEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(renter); }}
          title={t('edit')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('edit')}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={assigned}
          onClick={(e) => { e.stopPropagation(); onDelete(renter); }}
          title={assigned ? t('renter_delete_blocked_assigned') : t('delete')}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
            assigned ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('delete')}
        </button>
      )}
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
  const [search, setSearch] = useState('');

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

  const visible = useMemo(() => tenancies.filter(matches), [tenancies, matches]);
  const visibleUnassigned = useMemo(() => unassignedRenters.filter(matches), [unassignedRenters, matches]);

  const owing = tenancies.filter((r) => ['pending', 'overdue', 'partial'].includes(r.rentState?.status)).length;
  const searchable = tenancies.length + unassignedRenters.length > 3;

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
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
          {searchable && (
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search_renters')}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          )}

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {visible.map((r) => {
                const state = r.rentState?.status ?? 'none';
                const openFlat = () => navigate(`/flats/${r.flatId}`);

                return (
                  // A div rather than a button: the card holds its own edit/delete buttons,
                  // and nesting a button inside a button is invalid HTML.
                  <div
                    key={`${r.flatId}-${r.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={openFlat}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFlat(); } }}
                    className="text-left border border-gray-200 rounded-xl p-3.5 cursor-pointer hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t('lives_in_flat', { flat: r.flatName })} · {money(r.rent)}
                        </p>
                      </div>
                      <span
                        title={r.rentState?.forMonth ? t('rent_state_for_month', { month: r.rentState.forMonth }) : undefined}
                        className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${
                          state === 'paid' || state === 'none'
                            ? (RENT_STATE[state] ?? RENT_STATE.none)
                            : dueBadgeTone(monthRelativity(r.rentState?.forMonth))
                        }`}
                      >
                        {r.rentState?.paidAhead ? t('rent_state_paid_ahead') : t(`rent_state_${state}`)}
                      </span>
                    </div>

                    {r.rentState?.dueAmount > 0 && (() => {
                      // Same rule as the flat cards: red only when the month has passed.
                      const when = monthRelativity(r.rentState.forMonth);
                      const label = monthName(r.rentState.forMonth);

                      return (
                        <p className={`mt-1.5 text-xs font-semibold inline-flex items-center gap-1 ${DUE_TEXT_TONE[when]}`}>
                          {when === 'past' && <AlertCircle className="h-3.5 w-3.5" />}
                          {label
                            ? t('amount_due_for_month', { amount: money(r.rentState.dueAmount), month: label })
                            : t('amount_due', { amount: money(r.rentState.dueAmount) })}
                        </p>
                      );
                    })()}

                    <ContactLine renter={r} />

                    {r.status && r.status !== 'active' && (
                      // A renter marked inactive while still occupying a flat is a data
                      // problem someone should look at, not something to render silently.
                      <p className="mt-2 text-[11px] text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t('renter_marked_status', { status: r.status })}
                      </p>
                    )}

                    <RenterActions
                      renter={r}
                      assigned
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={onEditRenter}
                      onDelete={onDeleteRenter}
                      t={t}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {visibleUnassigned.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t('renters_not_assigned')}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {visibleUnassigned.map((r) => (
                  <div key={`u-${r.id}`} className="border border-dashed border-gray-300 rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {t('renter_awaiting_flat')}
                        </p>
                      </div>
                      {r.status && r.status !== 'active' && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                          {r.status}
                        </span>
                      )}
                    </div>

                    <ContactLine renter={r} />

                    <RenterActions
                      renter={r}
                      assigned={false}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={onEditRenter}
                      onDelete={onDeleteRenter}
                      t={t}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default HouseRentersSection;
