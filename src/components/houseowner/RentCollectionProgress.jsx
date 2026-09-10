import { Check, ChevronLeft, ChevronRight, Info, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * The status dot's tone, by how much of the house has paid.
 *
 * Kept as the original eight-step tiering rather than collapsed to three: it is the scale
 * this dashboard has always used, and the dot is the only place on the row that reads at a
 * glance from across a table.
 */
const getIconColorClass = (percent) => {
  if (percent <= 12.5) return "bg-red-500";
  if (percent <= 25) return "bg-red-400";
  if (percent <= 37.5) return "bg-yellow-400";
  if (percent <= 50) return "bg-yellow-300";
  if (percent <= 62.5) return "bg-sky-400";
  if (percent <= 75) return "bg-blue-400";
  if (percent <= 87.5) return "bg-green-400";
  return "bg-green-600";
};

export default function RentCollectionProgress({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  houses = [],
  onMonthChange = () => {},
  maxDate = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
}) {
  const { t, i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');

  // Was toLocaleString("default", …), which is the *browser's* locale — so the header read
  // "September" to someone using the app in Bengali, next to Bengali everything else.
  const monthLabel = new Date(year, month - 1).toLocaleString(i18n.language || undefined, {
    month: "long",
    year: "numeric",
  });

  // Check if right arrow should be disabled
  const isCurrentMonth = month === maxDate.month && year === maxDate.year;

  // Calculate previous and next month/year
  const handlePrevious = () => {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    onMonthChange(prevMonth, prevYear);
  };

  const handleNext = () => {
    if (isCurrentMonth) return; // Disabled for current month

    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    onMonthChange(nextMonth, nextYear);
  };

  return (
    <section className="my-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className={`flex min-w-0 items-center gap-2 text-base font-bold text-slate-900 sm:text-lg ${isBengali ? 'font-hind-siliguri' : 'font-mooli'}`}>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Target className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="truncate">{t('rent_collection_progress')}</span>
        </h2>

        {/* The month nav is one control group now, rather than two oversized chevrons pushed
            to the far edges of the card with the month floating between them. */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label={t('previous')}
            className="rounded-md p-1 text-slate-500 outline-none transition-colors hover:bg-gray-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-1 text-[11px] font-semibold text-slate-700 whitespace-nowrap sm:px-1.5 sm:text-xs">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={isCurrentMonth}
            aria-label={t('next')}
            className={`rounded-md p-1 text-slate-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isCurrentMonth
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-gray-100 hover:text-slate-700 active:bg-gray-200"
            }`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {houses.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t('no_houses_found')}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {houses.map((house, idx) => {
            // `rent_collected` is a count of flats that paid, not a currency amount — the
            // analytics service computes it as `count(distinct flat_id)` and says so. So the
            // row reports flats, not taka; a "৳9,000 / ৳14,000" reading would be invented.
            const totalFlats = house.totalFlats || house.total_flat || 0;
            const paidFlats = house.rentCollected || house.rent_collected || 0;

            // Handle case when totalFlats is 0 to avoid division by zero
            const collectedPercent = totalFlats > 0
              ? Math.round((paidFlats / totalFlats) * 100)
              : 0;

            const barColor = collectedPercent === 100 ? "bg-green-500" : "bg-primary-500";
            const name = house.name || `House ${idx + 1}`;

            return (
              <div key={house.houseId || idx} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500"
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>

                  {/* Truncated in CSS only. It used to be cut twice: slice(0, 8) threw the
                      characters away in JavaScript before CSS ever got a say, so "Sabers
                      Kutir" read "Sabers..." however much room the row had — and the row had
                      plenty, because w-[80px] pinned the width and no breakpoint lifted it
                      (only max-w grew, and max-width cannot widen an element fixed at 80px). */}
                  <div className="min-w-0 flex-1">
                    <p
                      title={name}
                      className="truncate text-sm font-semibold text-slate-800 sm:text-base font-poppins"
                    >
                      {name}
                    </p>
                    <p className={`truncate text-[11px] text-slate-500 ${isBengali ? 'font-hind-siliguri' : 'font-roboto'}`}>
                      {t('flats_paid_of_total', { paid: paidFlats, total: totalFlats })}
                    </p>
                  </div>

                  <span
                    title={t('percent_collected', { percent: collectedPercent })}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${getIconColorClass(collectedPercent)}`}
                  >
                    {collectedPercent === 100 ? <Check className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={collectedPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${name} — ${t('percent_collected', { percent: collectedPercent })}`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                      style={{ width: `${collectedPercent}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-700 tabular-nums">
                    {collectedPercent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
