import { Building2, Code2, Crown, KeyRound, Wrench } from 'lucide-react';

/**
 * A visual identity per role.
 *
 * Full class strings, never interpolated. Tailwind scans source for complete class names, so
 * `from-${accent}-500` compiles to nothing and the gradient silently vanishes — the same trap
 * that left every icon on the old admin dashboard unstyled.
 */
const THEMES = {
  developer: {
    cover: 'from-slate-700 via-slate-800 to-slate-900',
    chip: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-200',
    tile: 'bg-slate-50 text-slate-700',
    icon: Code2,
  },
  web_owner: {
    cover: 'from-orange-500 via-orange-600 to-amber-700',
    chip: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-200',
    tile: 'bg-orange-50 text-orange-700',
    icon: Crown,
  },
  staff: {
    cover: 'from-blue-500 via-blue-600 to-indigo-700',
    chip: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-200',
    tile: 'bg-blue-50 text-blue-700',
    icon: KeyRound,
  },
  house_owner: {
    cover: 'from-emerald-500 via-emerald-600 to-teal-700',
    chip: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-200',
    tile: 'bg-emerald-50 text-emerald-700',
    icon: Building2,
  },
  caretaker: {
    cover: 'from-violet-500 via-violet-600 to-purple-700',
    chip: 'bg-violet-100 text-violet-700',
    ring: 'ring-violet-200',
    tile: 'bg-violet-50 text-violet-700',
    icon: Wrench,
  },
};

const FALLBACK = {
  cover: 'from-gray-600 via-gray-700 to-gray-800',
  chip: 'bg-gray-100 text-gray-700',
  ring: 'ring-gray-200',
  tile: 'bg-gray-50 text-gray-700',
  icon: Building2,
};

export const roleTheme = (slug) => THEMES[slug] ?? FALLBACK;

export default roleTheme;
