import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, ChevronRight, DoorOpen, ShieldCheck, Users, X,
} from 'lucide-react';

const money = (n) =>
  n == null ? '—' : `৳${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * One accent per card, carried through the hero band, the row markers and the chips, so each
 * of the four modals reads as its own thing rather than four copies of a generic list.
 */
const THEMES = {
  houses: { icon: Building2, from: 'from-amber-500', to: 'to-orange-600', ring: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700' },
  flats: { icon: DoorOpen, from: 'from-sky-500', to: 'to-blue-600', ring: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700' },
  renters: { icon: Users, from: 'from-emerald-500', to: 'to-teal-600', ring: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700' },
  caretakers: { icon: ShieldCheck, from: 'from-violet-500', to: 'to-purple-600', ring: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700' },
};

const Chip = ({ children, tone = 'bg-white/15 text-white' }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${tone}`}>{children}</span>
);

/** A single tappable line. The accent stripe on the left is the shared visual signature. */
const Row = ({ to, accent, title, subtitle, right, meta }) => (
  <Link
    to={to}
    className="group relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-[0_1px_12px_rgba(0,0,0,0.06)] transition-all"
  >
    <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${accent}`} />
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-gray-900 truncate leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
      {meta && <div className="flex flex-wrap items-center gap-1.5 mt-1.5">{meta}</div>}
    </div>
    {right && <div className="shrink-0 text-right">{right}</div>}
    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
  </Link>
);

const StatsCardModal = ({ open, onClose, cardFor, value, label, houses = [], renters = [], caretakers = [] }) => {
  const { t } = useTranslation();

  // Escape to dismiss, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !cardFor) return null;

  const theme = THEMES[cardFor] ?? THEMES.houses;
  const HeroIcon = theme.icon;

  // The chips under the headline number — the one-line story for this metric.
  const headlineChips = {
    houses: [
      `${houses.filter((h) => h.active).length} ${t('active')}`,
      `${houses.reduce((n, h) => n + (h.flatCount || 0), 0)} ${t('flats')}`,
      money(houses.reduce((n, h) => n + (h.monthlyRent || 0), 0)),
    ],
    flats: [
      `${houses.reduce((n, h) => n + (h.occupiedFlats || 0), 0)} ${t('occupied')}`,
      `${houses.reduce((n, h) => n + (h.vacantFlats || 0), 0)} ${t('vacant')}`,
    ],
    renters: [
      `${renters.filter((r) => r.flat_id).length} ${t('occupied')}`,
      `${renters.filter((r) => !r.flat_id).length} ${t('renters_not_assigned')}`,
    ],
    caretakers: [`${caretakers.reduce((n, c) => n + (c.houseCount || 0), 0)} ${t('houses')}`],
  }[cardFor] ?? [];

  const bodies = {
    houses: () =>
      houses.map((h) => (
        <Row
          key={h.id}
          to={`/houses/${h.id}`}
          accent={theme.ring}
          title={h.name}
          subtitle={h.address}
          meta={[
            <Chip key="f" tone={theme.soft}>{`${h.occupiedFlats}/${h.flatCount} ${t('occupied')}`}</Chip>,
            !h.active && <Chip key="i" tone="bg-gray-100 text-gray-600">{t('inactive')}</Chip>,
            h.outstanding > 0 && (
              <Chip key="o" tone="bg-red-50 text-red-700">{`${money(h.outstanding)} ${t('outstanding')}`}</Chip>
            ),
          ].filter(Boolean)}
          right={<p className="font-semibold text-gray-900 tabular-nums">{money(h.monthlyRent)}</p>}
        />
      )),

    // Flats are grouped by house — a flat name means nothing without the building it is in.
    flats: () =>
      houses
        .filter((h) => (h.flats ?? []).length > 0)
        .map((h) => (
          <div key={h.id}>
            <div className="flex items-center gap-2 mb-2 mt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{h.name}</p>
              <span className="h-px flex-1 bg-gray-100" />
              <span className="text-[11px] text-gray-400">{`${h.occupiedFlats}/${h.flatCount}`}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {h.flats.map((f) => {
                const vacant = !f.renter_id;
                return (
                  <Link
                    key={f.id}
                    to={`/flats/${f.id}`}
                    className={`relative rounded-xl border p-2.5 transition-all hover:shadow-[0_1px_12px_rgba(0,0,0,0.06)] ${
                      vacant ? 'border-dashed border-gray-300 bg-gray-50/60' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="font-semibold text-gray-900 truncate">{f.name}</p>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">{f.number}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {vacant ? t('vacant') : f.renter_name}
                    </p>
                    <p className="text-xs font-semibold text-gray-800 mt-1 tabular-nums">{money(f.rent_amount)}</p>
                    {vacant && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )),

    renters: () =>
      renters.map((r) => (
        <Row
          key={r.id}
          to={r.flat_id ? `/flats/${r.flat_id}` : `/renters/?view=${r.id}`}
          accent={r.flat_id ? theme.ring : 'bg-gray-300'}
          title={r.name}
          subtitle={r.flat_id ? `${r.house_name} · ${t('flats')} ${r.flat_name}` : t('renter_awaiting_flat')}
          meta={[
            r.phone && <Chip key="p" tone="bg-gray-100 text-gray-600">{r.phone}</Chip>,
            r.outstanding > 0 && (
              <Chip key="o" tone="bg-red-50 text-red-700">{`${money(r.outstanding)} ${t('outstanding')}`}</Chip>
            ),
          ].filter(Boolean)}
          right={r.rent_amount ? <p className="font-semibold text-gray-900 tabular-nums">{money(r.rent_amount)}</p> : null}
        />
      )),

    caretakers: () =>
      caretakers.map((c) => (
        <Row
          key={c.id}
          to={`/caretakers/${c.id}/details`}
          accent={theme.ring}
          title={c.name}
          subtitle={(c.houses ?? []).join(' · ')}
          meta={[<Chip key="h" tone={theme.soft}>{`${c.houseCount ?? 0} ${t('houses')}`}</Chip>]}
        />
      )),
  };

  const rows = bodies[cardFor]?.() ?? [];
  const isEmpty = !rows.length;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[80vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Hero band: the metric restated large, so the modal stands on its own once the
            card behind it is covered. */}
        <div className={`relative bg-linear-to-br ${theme.from} ${theme.to} text-white px-5 pt-5 pb-4 shrink-0`}>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10"
          />
          {/* z-10 is load-bearing, not decoration.
              The headline row below is `position: relative`, so it painted above this
              button — later positioned sibling, same auto z-index — and its box spans the
              full width of the band. It therefore covered all but a 4px sliver of the X and
              swallowed the click, on all four cards. The handler was always wired; nothing
              could reach it. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <HeroIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">{t('overview')}</p>
              <p className="text-lg font-semibold leading-tight truncate">{label}</p>
            </div>
            <p className="ml-auto mr-8 text-4xl font-bold leading-none tabular-nums">{value}</p>
          </div>

          {headlineChips.length > 0 && (
            <div className="relative flex flex-wrap gap-1.5 mt-3">
              {headlineChips.map((c) => <Chip key={c}>{c}</Chip>)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/70">
          {isEmpty ? (
            <div className="py-12 text-center">
              <HeroIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('no_records_yet')}</p>
            </div>
          ) : (
            <div className={cardFor === 'flats' ? 'space-y-4' : 'space-y-2'}>{rows}</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StatsCardModal;
