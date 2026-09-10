import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import StatsCardModal from "./StatsCardModal";

/**
 * One accent per card, keyed by the same `cardFor` the modal themes itself with.
 *
 * Deliberately the modal's palette (see THEMES in StatsCardModal) rather than the four
 * colours in the mockup, which had houses blue and flats orange — the reverse of ours. A
 * card and the panel it opens have to be the same colour or the accent is decoration
 * instead of a thread you can follow.
 */
/**
 * Whole class names, never `border-${accent}-200`.
 *
 * Tailwind finds classes by scanning the source for complete literal strings — it does not
 * evaluate the template, so an interpolated name is never generated. The colour then falls
 * through to v4's preflight, which resets borders to `border: 0 solid` with no colour, so
 * `border` alone paints in `currentColor`: the card's dark text, which reads as black.
 *
 * It half-worked, which is what made it confusing. `border-amber-200` and
 * `border-emerald-200` exist in the bundle only because other files happen to write them
 * literally (StaleDataNotice, CreateHouseForm), so houses and renters were tinted while
 * flats and caretakers came out black. Nothing to do with those two colours — only with
 * whether some unrelated component had already spelled them out.
 */
const ACCENTS = {
  houses: { border: "border-amber-100 hover:border-amber-300", tile: "bg-amber-100" },
  flats: { border: "border-sky-100 hover:border-sky-300", tile: "bg-sky-100" },
  renters: { border: "border-emerald-100 hover:border-emerald-300", tile: "bg-emerald-100" },
  caretakers: { border: "border-violet-100 hover:border-violet-300", tile: "bg-violet-100" },
};

// Was the string "bg-slate-100", which the template turned into `border-bg-slate-100-200`
// for any card whose `cardFor` is not in the map above — a colour name was expected, not a
// finished class. Now the same shape as a real accent, so the fallback renders.
const FALLBACK_ACCENT = {
  border: "border-slate-200 hover:border-slate-300",
  tile: "bg-slate-100",
};

export default function StatsCardGrid({ stats = [] }) {
  // Which card's modal is open, by index — the card owns the data it hands over.
  const [openIdx, setOpenIdx] = useState(null);
  const { i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');

  const active = openIdx == null ? null : stats[openIdx];

  return (
    <>
      {/* Four across at every width, so the whole summary is one glance with no scroll.
          That leaves each card about 57px of content on a 320px screen and about 73px on a
          390px one, which is the budget everything below is sized against. */}
      <div className={`grid grid-cols-4 gap-1.5 sm:gap-3 ${isBengali ? 'font-hind-siliguri' : 'font-mooli'}`}>
        {stats.map(({ label, shortLabel, value, icon: Icon, subtext, hover }, idx) => {
          const accent = ACCENTS[hover?.cardFor] ?? FALLBACK_ACCENT;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setOpenIdx(idx)}
              aria-haspopup="dialog"
              className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl bg-white p-2 text-center outline-none transition-all border-2 ${accent.border} hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-2 sm:rounded-2xl sm:p-4`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 sm:rounded-2xl ${accent.tile}`}
              >
                <img className="h-5 w-5 sm:h-7 sm:w-7" src={Icon} alt="" aria-hidden="true" />
              </span>

              {/* Count above label, so the Bengali labels read as one phrase down the card:
                  the short forms are measure-word-first ("টি বাড়ি", "জন ভাড়াটিয়া"), which is
                  where the number belongs in Bengali — "2" then "টি বাড়ি" is "2টি বাড়ি". */}
              <p className="text-2xl font-bold leading-none text-slate-700 tabular-nums sm:text-4xl font-google-sans-code">
                {value}
              </p>

              {/* break-words because the labels are Bengali compounds — "ভাড়াটিয়া" is one
                  unbreakable word close to the width of a 57px card, and without this it
                  would overflow the track rather than wrap into the second line that
                  line-clamp-2 allows it.

                  `shortLabel` on the card, `label` in the modal: a measure-word-first form
                  reads as a fragment on its own, so the panel keeps the full wording. */}
              <p
                title={label}
                className={`text-[10px] leading-tight text-slate-600 break-words line-clamp-2 sm:text-xs sm:leading-snug ${isBengali ? 'font-hind-siliguri' : 'font-roboto'}`}
              >
                {shortLabel || label}
              </p>

              {/* Hidden on phones, where four across leaves no room for a two-clause
                  sentence — "2টি সক্রিয়, 0টি নিষ্ক্রিয়" in 57px is four clipped lines, not
                  information. Tapping the card opens the modal, which says the same thing
                  with room to say it. */}
              {subtext && (
                <p title={subtext} className="hidden text-[11px] leading-snug text-slate-400 line-clamp-2 sm:block">
                  {subtext}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <StatsCardModal
        open={active != null}
        onClose={() => setOpenIdx(null)}
        cardFor={active?.hover?.cardFor}
        label={active?.label}
        value={active?.value}
        houses={active?.hover?.houses ?? []}
        renters={active?.hover?.renters ?? []}
        caretakers={active?.hover?.caretakers ?? []}
      />
    </>
  );
}
