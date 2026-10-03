import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ArrowRight, Check, Paintbrush, Plus, RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import { buildingLayout, windowState } from '../../../utils/flatPosition';
import { monthName } from '../../../utils/rentMonth';
import { apiErrorMessage } from '../../../utils/apiError';
import { useUpdateHouseMutation } from '../../../store/api/houseApi';

/**
 * The house as a building: one window per flat, each in the place its flat number gives it
 * (101 is floor 1, flat 01; see utils/flatPosition). Lit windows are let, dark ones vacant
 * with a to-let sign, and a dot marks rent owed: orange when due, red when late.
 *
 * Plain CSS 3D rather than WebGL. A box with windows needs nothing more, it adds no
 * dependency to a PWA that precaches everything it ships, it runs on the cheapest phones,
 * and every window is a real button: tap, keyboard and screen reader all work on it.
 *
 * Turning it: drag (horizontal on touch, so a vertical swipe still scrolls the page), or the
 * buttons. The rotation is written straight to one element's transform, so dragging never
 * re-renders the windows.
 *
 * Its colours are the owner's: the wall, and the floor stripes when they are painted in a
 * different colour, kept in the house's metadata as `building: {wall, stripe}`.
 */
const CELL_W = 46;
const CELL_H = 42;
const PIER = 20; // wall either side of the windows; the floor numbers sit on it
const PARAPET = 12;
const PLINTH = 40; // street level: gate and parking, unless flats are numbered there
const YAW = -26;
const TILT = -13;
const YAW_LIMIT = 55; // never round to the back: the flats are on the front
const TILT_MIN = -30;
const TILT_MAX = -4;
const ROOF_EXTRA = 50; // stair room and tank above the roof
const MAX_STAGE_H = 600;

const HEX = /^#[0-9a-f]{6}$/i;
const DEFAULT_WALL = '#efe6d8';

// Colours a house here is commonly painted, as starting points; any colour can be picked.
const WALL_SWATCHES = [
  ['cream', '#efe6d8'], ['white', '#f6f4ef'], ['sand', '#efdcb2'], ['peach', '#ecccb6'],
  ['sky', '#d6e4ee'], ['mint', '#d8e7d2'], ['grey', '#d3d5d8'],
];
const STRIPE_SWATCHES = [
  ['maroon', '#8b3a3a'], ['terracotta', '#b0573a'], ['brown', '#7a5a3a'], ['navy', '#2f4a6b'],
  ['green', '#3f6b4a'], ['charcoal', '#4b5563'], ['white', '#ffffff'],
];

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (hex, to, amount) => {
  const a = rgb(hex);
  const b = rgb(to);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
};
const shade = (hex, amount) => mix(hex, '#000000', amount);
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Every surface colour, from the two the owner picks. The faces turned from the light are
 * darker versions of the wall, so any colour still reads as a lit box; the roof leans to
 * concrete grey whatever the walls are. Without a stripe colour the floors are marked by a
 * thin shadow line, with one they are painted bands, as on many houses here.
 */
const paletteFor = ({ wall, stripe } = {}) => {
  const w = HEX.test(wall ?? '') ? wall : DEFAULT_WALL;
  const st = HEX.test(stripe ?? '') ? stripe : null;
  const darkWall = luminance(w) < 0.3;
  return {
    faces: { front: w, left: shade(w, 0.05), right: shade(w, 0.11), back: shade(w, 0.14), top: mix(shade(w, 0.08), '#c9c4bb', 0.5) },
    room: { front: shade(w, 0.03), left: shade(w, 0.07), right: shade(w, 0.13), back: shade(w, 0.15), top: mix(shade(w, 0.1), '#c9c4bb', 0.5) },
    parapet: st ?? shade(w, 0.06),
    parapetEdge: shade(st ?? w, 0.16),
    slab: st ?? 'rgba(120, 100, 70, 0.18)',
    sideSlab: st ? shade(st, 0.12) : 'rgba(110, 90, 60, 0.14)',
    slabH: st ? 6 : 3,
    plinth: shade(w, 0.1),
    pier: shade(w, 0.15),
    floorText: darkWall ? 'rgba(255, 255, 255, 0.75)' : shade(w, 0.42),
    bay: darkWall ? 'rgba(255, 255, 255, 0.08)' : 'rgba(150, 130, 100, 0.1)',
  };
};

const LIT = 'linear-gradient(180deg, #fff4c7 0%, #fcd34d 100%)';
const DARK = 'linear-gradient(180deg, #64748b 0%, #334155 100%)';
const DOT = { due: '#f97316', overdue: '#dc2626' };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const money = (n) => `৳${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const face = (w, h, transform, background, extra = {}) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: w,
  height: h,
  transform,
  background,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  ...extra,
});

/** A box standing on the ground at (x, z), base at height y. `front` is drawn on its front face. */
const Box = ({ w, h, d, x = 0, y = 0, z = 0, colors, front = null, right = null }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>
    <div style={{ position: 'absolute', left: -w / 2, top: -h, width: w, height: h, transformStyle: 'preserve-3d' }}>
      <div style={face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, colors.back)} />
      <div style={face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, colors.left, { left: (w - d) / 2 })} />
      <div style={face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, colors.right, { left: (w - d) / 2 })}>{right}</div>
      <div style={face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, colors.top, { top: (h - d) / 2 })} />
      <div style={face(w, h, `translateZ(${d / 2}px)`, colors.front)}>{front}</div>
    </div>
  </div>
);

/** Two crossed planes: reads as a round tree from any angle, no turning to face the camera. */
const Tree = ({ x, z, k = 1 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transform: `translate3d(${x}px, 0, ${z}px)` }}>
    {[0, 90].map((r) => (
      <div key={r} style={{ position: 'absolute', left: -17 * k, top: -58 * k, width: 34 * k, height: 58 * k, transform: `rotateY(${r}deg)` }}>
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 4, marginLeft: -2, height: 24 * k, background: '#7a5a3a' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 34 * k, height: 38 * k, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #93c973, #4b8a3b 75%)' }} />
      </div>
    ))}
  </div>
);

const Window = ({ flat, label, left, top, selected, onSelect, ariaLabel, t }) => {
  const state = windowState(flat);
  const lit = state !== 'vacant';

  return (
    <button
      type="button"
      onClick={() => onSelect(flat.id)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      title={flat.name || flat.number}
      className="cursor-pointer outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-primary-500"
      style={{ position: 'absolute', left, top, width: CELL_W, height: CELL_H, borderRadius: 4 }}
    >
      <span
        style={{
          position: 'absolute', left: 8, right: 8, top: 6, bottom: 14, borderRadius: 2,
          background: lit ? LIT : DARK,
          boxShadow: lit ? '0 0 8px 1px rgba(252, 211, 77, 0.55)' : 'inset 0 0 0 1px rgba(15, 23, 42, 0.3)',
        }}
      >
        <span style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, marginLeft: -0.75, background: lit ? 'rgba(146, 64, 14, 0.25)' : 'rgba(255, 255, 255, 0.12)' }} />
        <span
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 1, textAlign: 'center', fontSize: 7.5, fontWeight: 700,
            lineHeight: '8px', color: lit ? 'rgba(120, 53, 15, 0.85)' : 'rgba(226, 232, 240, 0.85)',
          }}
        >
          {flat.number || label}
        </span>
      </span>
      {/* Balcony grill. */}
      <span
        style={{
          position: 'absolute', left: 5, right: 5, bottom: 6, height: 7, borderTop: '2px solid #7c8593',
          background: 'repeating-linear-gradient(90deg, rgba(100, 110, 125, 0.75) 0 1px, transparent 1px 5px)',
        }}
      />
      {state === 'vacant' && (
        <span
          style={{
            position: 'absolute', left: '50%', bottom: 3, transform: 'translateX(-50%)', padding: '0 2px', borderRadius: 1,
            fontSize: 5.5, fontWeight: 800, lineHeight: '7px', whiteSpace: 'nowrap', letterSpacing: 0.2,
            color: '#b91c1c', background: '#fff', border: '1px solid #b91c1c',
          }}
        >
          {t('b3d_tolet')}
        </span>
      )}
      {DOT[state] && (
        <span style={{ position: 'absolute', right: 2, top: 1, width: 10, height: 10, borderRadius: '50%', background: DOT[state], border: '1.5px solid #fff' }} />
      )}
      {selected && <span style={{ position: 'absolute', inset: 1, borderRadius: 4, boxShadow: '0 0 0 2px var(--color-primary-500), 0 0 12px 2px rgba(249, 135, 60, 0.45)' }} />}
    </button>
  );
};

/** Street level when no flat is numbered there: piers, parking bays and the gate. */
const StreetLevel = ({ top, width, houseName, palette }) => (
  <div style={{ position: 'absolute', left: 0, top, width, height: PLINTH, background: palette.plinth }}>
    <div
      style={{
        position: 'absolute', left: PIER, right: PIER, top: 6, bottom: 0,
        background: `repeating-linear-gradient(90deg, ${palette.pier} 0 7px, #46505e 7px ${CELL_W * 2}px)`,
      }}
    />
    <div
      style={{
        position: 'absolute', left: '50%', top: 8, bottom: 0, width: 52, marginLeft: -26, background: '#2f3742',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(203, 213, 225, 0.55) 0 1.5px, transparent 1.5px 6px)',
        borderTop: '3px solid #9aa3ad',
      }}
    />
    {houseName && (
      <div
        style={{
          position: 'absolute', left: '50%', top: -1, transform: 'translateX(-50%)', maxWidth: Math.max(60, width - PIER * 2 - 20),
          padding: '1px 5px', borderRadius: 2, background: '#fffaf0', border: '1px solid #b8a88e', color: '#5b4a33',
          fontSize: 7, fontWeight: 700, lineHeight: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {houseName}
      </div>
    )}
  </div>
);

const Legend = ({ counts, t }) => {
  const items = [
    { key: 'occupied', swatch: <span className="h-3 w-2.5 rounded-[2px]" style={{ background: LIT }} /> },
    { key: 'vacant', swatch: <span className="h-3 w-2.5 rounded-[2px]" style={{ background: DARK }} /> },
    { key: 'due', swatch: <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT.due }} /> },
    { key: 'overdue', swatch: <span className="h-2.5 w-2.5 rounded-full" style={{ background: DOT.overdue }} /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
      {items.map((i) => (
        <span key={i.key} className="inline-flex items-center gap-1.5">
          {i.swatch}
          {t(`b3d_state_${i.key}`)}
          <span className="font-semibold tabular-nums text-gray-900">{counts[i.key]}</span>
        </span>
      ))}
    </div>
  );
};

const Swatch = ({ color, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
    title={label}
    className={`relative h-7 w-7 shrink-0 rounded-full border transition-transform hover:scale-110 ${active ? 'border-gray-900 ring-2 ring-primary-300' : 'border-gray-300'}`}
    style={{ background: color }}
  >
    {active && <Check className="absolute inset-0 m-auto h-3.5 w-3.5" style={{ color: luminance(color) < 0.4 ? '#fff' : '#111827' }} />}
  </button>
);

/** Any colour beyond the swatches: the browser's own picker, drawn as one more swatch. */
const CustomSwatch = ({ value, active, label, onChange }) => (
  <label
    title={label}
    className={`relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border ${active ? 'border-gray-900 ring-2 ring-primary-300' : 'border-dashed border-gray-400'}`}
    style={{ background: active ? value : 'conic-gradient(#f87171, #fbbf24, #4ade80, #60a5fa, #c084fc, #f87171)' }}
  >
    {!active && <Plus className="h-3.5 w-3.5 rounded-full bg-white/80 text-gray-700" />}
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
  </label>
);

const PaintPanel = ({ colors, onChange, onDefault, onCancel, onSave, saving, t }) => {
  const wall = colors.wall ?? DEFAULT_WALL;
  const wallIsSwatch = WALL_SWATCHES.some(([, c]) => c === wall);
  const stripeIsSwatch = !colors.stripe || STRIPE_SWATCHES.some(([, c]) => c === colors.stripe);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-700">{t('b3d_wall_colour')}</p>
        <div className="flex flex-wrap gap-2">
          {WALL_SWATCHES.map(([id, c]) => (
            <Swatch key={id} color={c} label={t(`b3d_color_${id}`)} active={wall === c} onClick={() => onChange({ wall: c })} />
          ))}
          <CustomSwatch value={wall} active={!wallIsSwatch} label={t('b3d_custom_colour')} onChange={(c) => onChange({ wall: c })} />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-700">{t('b3d_stripe_colour')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ stripe: null })}
            aria-pressed={!colors.stripe}
            className={`h-7 rounded-full border px-2.5 text-xs ${!colors.stripe ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {t('b3d_stripe_none')}
          </button>
          {STRIPE_SWATCHES.map(([id, c]) => (
            <Swatch key={id} color={c} label={t(`b3d_color_${id}`)} active={colors.stripe === c} onClick={() => onChange({ stripe: c })} />
          ))}
          <CustomSwatch value={colors.stripe ?? '#8b3a3a'} active={!stripeIsSwatch} label={t('b3d_custom_colour')} onChange={(c) => onChange({ stripe: c })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <button type="button" onClick={onDefault} className="text-xs font-medium text-gray-500 hover:text-gray-800">
          {t('b3d_paint_default')}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const FlatPanel = ({ entry, t, onOpen }) => {
  if (!entry) return <p className="text-xs text-gray-500">{t('b3d_select_prompt')}</p>;

  const { flat, floor, label } = entry;
  const state = windowState(flat);
  const rent = flat.rentState ?? {};
  const where = floor === 0 ? t('b3d_where_ground', { position: label }) : t('b3d_where', { floor, position: label });

  let status;
  if (state === 'vacant') {
    status = <span className="text-gray-600">{t('b3d_vacant_line')}</span>;
  } else if (state === 'occupied') {
    status = <span className="text-emerald-700">{rent.paidAhead ? t('b3d_paid_ahead') : t('b3d_paid_up')}</span>;
  } else {
    const month = monthName(rent.forMonth);
    status = (
      <span className={state === 'overdue' ? 'font-medium text-red-600' : 'font-medium text-orange-600'}>
        {month ? t('amount_due_for_month', { amount: money(rent.dueAmount), month }) : t('amount_due', { amount: money(rent.dueAmount) })}
      </span>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-gray-900">{flat.name || flat.number}</p>
        <p className="text-xs text-gray-500">
          {where}
          {flat.name && flat.number ? ` · ${flat.number}` : ''}
        </p>
        <p className="mt-1 text-sm">
          {flat.renter?.name && <span className="text-gray-800">{flat.renter.name} · </span>}
          {status}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(flat.id)}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {t('b3d_open_flat')}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// `embedded`: drawn inside another card (the house header), so no card of its own.
const HouseBuilding3D = ({ house, canCustomize = false, embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const flats = useMemo(() => house?.flats ?? [], [house]);
  const layout = useMemo(() => buildingLayout(flats), [flats]);
  const [selectedId, setSelectedId] = useState(null);

  // Colours: the saved ones, a draft while painting, and what was just saved until the
  // refetched house carries it (so Save does not flash the old colours for a moment). That
  // last one is keyed to the server value it replaced and expires by itself once it changes.
  const [updateHouse, { isLoading: savingColours }] = useUpdateHouseMutation();
  const serverColours = useMemo(
    () => ({ wall: house?.metadata?.building?.wall ?? null, stripe: house?.metadata?.building?.stripe ?? null }),
    [house]
  );
  const serverKey = JSON.stringify(serverColours);
  const [justSaved, setJustSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const colours = draft ?? (justSaved?.over === serverKey ? justSaved.colours : serverColours);
  const palette = useMemo(() => paletteFor(colours), [colours]);

  const saveColours = async () => {
    try {
      await updateHouse({ id: house.id, metadata: { building: draft } }).unwrap();
      setJustSaved({ colours: draft, over: serverKey });
      setDraft(null);
      toast.success(t('b3d_paint_saved'));
    } catch (err) {
      toast.error(apiErrorMessage(err, t('b3d_paint_failed')));
    }
  };

  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const rotorRef = useRef(null);
  const view = useRef({ yaw: YAW, tilt: TILT });
  const drag = useRef(null);
  const swallowClick = useRef(false);
  const [stageW, setStageW] = useState(0);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Building size in scene pixels. The stage (the round ground) is sized to hold the
  // building at any allowed angle.
  const rowsH = layout.rows.length * CELL_H;
  const W = layout.columns * CELL_W + PIER * 2;
  const H = PARAPET + rowsH + (layout.hasGround ? 0 : PLINTH);
  const D = clamp(Math.round(W * 0.42), 104, 210);
  const G = Math.round(Math.hypot(W / 2, D / 2) + 60) * 2;

  // Fit the building, not the round stage: the stage may run off the sides, but the windows
  // are the tap targets and a phone needs them as large as they can be. Width is taken at
  // the default angle; height is what the tilt actually shows, from the back of the roof
  // (stair room and tank included) to the front edge of the stage.
  const sinT = Math.sin((-TILT * Math.PI) / 180);
  const above = (H + ROOF_EXTRA) * Math.cos((TILT * Math.PI) / 180) + (D / 2) * sinT;
  const below = (G / 2) * sinT + 12;
  const s = stageW ? Math.min(1.1, (stageW - 24) / (W * 0.92 + D * 0.5), (MAX_STAGE_H - 56) / (above + below)) : 1;
  const stageH = Math.round(clamp((above + below) * s + 56, 240, MAX_STAGE_H));
  const oy = Math.round(stageH / 2 + ((above - below) * s) / 2);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setStageW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const apply = (animate) => {
    const el = rotorRef.current;
    if (!el) return;
    el.style.transition = animate && !reducedMotion ? 'transform 650ms cubic-bezier(0.2, 0.7, 0.2, 1)' : 'none';
    el.style.transform = `rotateX(${view.current.tilt}deg) rotateY(${view.current.yaw}deg)`;
  };

  // Swing in once on arrival: says "this turns" without a word.
  const hasStage = layout.placed > 0 && stageW > 0;
  useLayoutEffect(() => {
    if (!hasStage) return undefined;
    view.current = { yaw: YAW - 20, tilt: TILT };
    apply(false);
    const id = requestAnimationFrame(() => {
      view.current = { yaw: YAW, tilt: TILT };
      apply(true);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStage]);

  const turn = (by) => {
    view.current.yaw = clamp(view.current.yaw + by, -YAW_LIMIT, YAW_LIMIT);
    apply(true);
  };
  const resetView = () => {
    view.current = { yaw: YAW, tilt: TILT };
    apply(true);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ...view.current, active: false, mouse: e.pointerType === 'mouse' };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      // Below this it is a tap on a window, not a turn.
      if (Math.hypot(dx, dy) < 6) return;
      d.active = true;
      stageRef.current?.setPointerCapture?.(e.pointerId);
    }
    view.current.yaw = clamp(d.yaw + dx * 0.35, -YAW_LIMIT, YAW_LIMIT);
    if (d.mouse) view.current.tilt = clamp(d.tilt - dy * 0.15, TILT_MIN, TILT_MAX);
    apply(false);
  };
  const onPointerEnd = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.active) {
      swallowClick.current = true;
      setTimeout(() => {
        swallowClick.current = false;
      }, 0);
    }
    drag.current = null;
  };

  const entries = useMemo(() => {
    const m = new Map();
    layout.rows.forEach((row) =>
      row.cells.forEach((c) => c.flat && m.set(c.flat.id, { flat: c.flat, floor: row.floor, label: c.label }))
    );
    return m;
  }, [layout]);

  const counts = useMemo(() => {
    const c = { occupied: 0, vacant: 0, due: 0, overdue: 0 };
    flats.forEach((f) => {
      const st = windowState(f);
      if (st === 'vacant') c.vacant++;
      else {
        c.occupied++;
        if (st !== 'occupied') c[st]++;
      }
    });
    return c;
  }, [flats]);

  const whereOf = (floor, label) =>
    floor === 0 ? t('b3d_where_ground', { position: label }) : t('b3d_where', { floor, position: label });

  const openFlat = (id) => navigate(`/flats/${id}`);

  if (!flats.length) return null;

  const facade = (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: PARAPET, background: palette.parapet, borderBottom: `2px solid ${palette.parapetEdge}` }} />
      {layout.rows.map((row, r) => {
        const top = PARAPET + r * CELL_H;
        return (
          <React.Fragment key={row.floor}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: top + CELL_H - palette.slabH, height: palette.slabH, background: palette.slab }} />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, top, width: PIER, height: CELL_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: palette.floorText,
              }}
            >
              {row.floor === 0 ? 'G' : row.floor}
            </span>
            {row.cells.map((cell, i) =>
              cell.flat ? (
                <Window
                  key={cell.position}
                  flat={cell.flat}
                  label={cell.label}
                  left={PIER + i * CELL_W}
                  top={top}
                  selected={selectedId === cell.flat.id}
                  onSelect={setSelectedId}
                  ariaLabel={`${cell.flat.name || cell.flat.number}, ${whereOf(row.floor, cell.label)}, ${t(`b3d_state_${windowState(cell.flat)}`)}`}
                  t={t}
                />
              ) : (
                <span
                  key={cell.position}
                  style={{ position: 'absolute', left: PIER + i * CELL_W + 10, top: top + 8, width: CELL_W - 20, height: CELL_H - 22, borderRadius: 2, background: palette.bay }}
                />
              )
            )}
          </React.Fragment>
        );
      })}
      {!layout.hasGround && <StreetLevel top={PARAPET + rowsH} width={W} houseName={house?.name} palette={palette} />}
    </>
  );

  // Slab lines carried round the side, so the floors read from every angle.
  const side = (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: PARAPET, background: shade(palette.parapet, 0.1), borderBottom: `2px solid ${palette.parapetEdge}` }} />
      {layout.rows.map((row, r) => (
        <div key={row.floor} style={{ position: 'absolute', left: 0, right: 0, top: PARAPET + r * CELL_H + CELL_H - palette.slabH, height: palette.slabH, background: palette.sideSlab }} />
      ))}
      {!layout.hasGround && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: PLINTH - 6, background: 'rgba(60, 50, 40, 0.12)' }} />}
    </>
  );

  const roomW = 58;
  const roomH = 32;
  const roomD = 46;
  const roomX = -W / 2 + roomW / 2 + 14;
  const roomZ = -D / 2 + roomD / 2 + 12;

  return (
    <section className={embedded ? '' : 'rounded-2xl border border-gray-200 bg-white p-3 sm:p-5'}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('b3d_title')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t('b3d_subtitle')}</p>
        </div>
        <Legend counts={counts} t={t} />
      </div>

      <div ref={wrapRef}>
        {layout.placed === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">{t('b3d_empty')}</p>
        ) : (
          <div
            ref={stageRef}
            role="group"
            aria-label={t('b3d_title')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClickCapture={(e) => {
              if (swallowClick.current) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            className="relative select-none overflow-hidden rounded-xl"
            style={{
              height: stageH,
              perspective: 1500,
              touchAction: 'pan-y',
              cursor: 'grab',
              background: 'linear-gradient(180deg, #e6effa 0%, #f3f6fa 55%, #f7f4ee 100%)',
            }}
          >
            {stageW > 0 && (
              <div
                style={{
                  position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d',
                  transform: `translate3d(${stageW / 2}px, ${oy}px, 0) scale3d(${s}, ${s}, ${s})`,
                }}
              >
                <div ref={rotorRef} style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d' }}>
                  {/* The stage: a round plinth, its edge a second disc a little lower. */}
                  <div style={{ position: 'absolute', left: -G / 2, top: -G / 2, width: G, height: G, borderRadius: '50%', transform: 'translateY(12px) rotateX(90deg)', background: '#cfc6b5' }} />
                  <div
                    style={{
                      position: 'absolute', left: -G / 2, top: -G / 2, width: G, height: G, borderRadius: '50%', transform: 'rotateX(90deg)',
                      background: 'radial-gradient(circle, #f4f0e7 0%, #ece6d9 70%, #e3dccd 100%)', overflow: 'hidden',
                    }}
                  >
                    {/* In this plane, down is towards the viewer: the front of the building. */}
                    <div style={{ position: 'absolute', left: G / 2 - W / 2 - 14, top: G / 2 - D / 2 - 14, width: W + 28, height: D + 28, borderRadius: 6, background: '#e2dacb' }} />
                    <div style={{ position: 'absolute', left: G / 2 - W / 2 + 14, top: G / 2 - D / 2 - 30, width: W + 26, height: D + 18, borderRadius: 14, background: 'rgba(70, 55, 35, 0.16)', filter: 'blur(9px)' }} />
                    <div style={{ position: 'absolute', left: G / 2 - 26, top: G / 2 + D / 2 + 14, width: 52, height: G / 2, background: 'linear-gradient(180deg, #d9d0bf, #e9e3d6)' }} />
                  </div>

                  <Tree x={-(W / 2 + 34)} z={D / 2 + 30} />
                  <Tree x={W / 2 + 36} z={D / 2 + 22} k={0.85} />
                  <Tree x={-(W / 2 + 26)} z={-(D / 2 + 8)} k={0.75} />

                  <Box w={W} h={H} d={D} colors={palette.faces} front={facade} right={side} />
                  {/* Roof: the stair room with the water tank on it. */}
                  <Box
                    w={roomW} h={roomH} d={roomD} x={roomX} y={-H} z={roomZ}
                    colors={palette.room}
                    front={<div style={{ position: 'absolute', left: 8, bottom: 0, width: 14, height: 22, background: '#5b4636', borderRadius: '2px 2px 0 0' }} />}
                  />
                  <Box
                    w={38} h={18} d={30} x={roomX + 4} y={-H - roomH} z={roomZ}
                    colors={{ front: '#9ca3af', right: '#8b929c', left: '#959ca6', back: '#868d97', top: '#b3b9c1' }}
                  />
                </div>
              </div>
            )}

            <div className="absolute right-2 top-2 flex gap-1">
              {[
                canCustomize && { icon: Paintbrush, label: t('b3d_paint'), onClick: () => setDraft(draft ? null : { ...colours }), active: !!draft },
                { icon: RotateCcw, label: t('b3d_turn_left'), onClick: () => turn(-22) },
                { icon: Undo2, label: t('b3d_reset_view'), onClick: resetView },
                { icon: RotateCw, label: t('b3d_turn_right'), onClick: () => turn(22) },
              ]
                .filter(Boolean)
                .map(({ icon: Icon, label, onClick, active }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    aria-pressed={active ?? undefined}
                    title={label}
                    className={`rounded-lg border p-1.5 backdrop-blur ${active ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white/85 text-gray-600 hover:bg-white'}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
            </div>
            <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-gray-500">{t('b3d_hint')}</p>
          </div>
        )}
      </div>

      {layout.placed > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 px-3 py-2.5">
          {draft ? (
            <PaintPanel
              colors={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              onDefault={() => setDraft({ wall: null, stripe: null })}
              onCancel={() => setDraft(null)}
              onSave={saveColours}
              saving={savingColours}
              t={t}
            />
          ) : (
            <FlatPanel entry={selectedId ? entries.get(selectedId) : null} t={t} onOpen={openFlat} />
          )}
        </div>
      )}

      {layout.unplaced.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-sm font-medium text-amber-900">{t('b3d_unplaced_title', { count: layout.unplaced.length })}</p>
          <p className="mt-0.5 text-xs text-amber-800">{t('b3d_unplaced_hint')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {layout.unplaced.map(({ flat, reason }) => (
              <button
                key={flat.id}
                type="button"
                onClick={() => openFlat(flat.id)}
                className="rounded-md border border-amber-200 bg-white px-2 py-1 text-left text-xs hover:border-amber-400"
              >
                <span className="font-medium text-gray-800">{flat.name || flat.number || `#${flat.id}`}</span>
                <span className="text-gray-500">
                  {' · '}
                  {flat.number && reason !== 'no_number' ? `${flat.number} · ` : ''}
                  {t(`b3d_reason_${reason}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default HouseBuilding3D;
