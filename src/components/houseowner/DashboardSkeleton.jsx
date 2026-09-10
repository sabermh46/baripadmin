import React from 'react';

/**
 * The dashboard's own shape, greyed out, while the data loads.
 *
 * It replaces a centred spinner in a 16rem box. The spinner was honest but told you nothing
 * and, worse, occupied a completely different amount of space than the thing that replaced
 * it — so the page jumped when the data arrived, on every load.
 *
 * The block layout here is not decorative: it mirrors Dashboard.jsx exactly, including the
 * breakpoints, because the whole benefit is that the greyed shape sits where the real
 * content will. If the dashboard's layout changes, this has to change with it.
 */

const Block = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-gray-200/70 ${className}`} />
);

const DashboardSkeleton = () => (
  // aria-busy + a label, so a screen reader says "loading" rather than reading out
  // a dozen meaningless empty boxes.
  <div className="" aria-busy="true" aria-label="Loading dashboard">
    {/* Greeting banner */}
    <Block className="h-[120px] w-full rounded-2xl sm:h-[148px]" />

    {/* Summary heading, month chip and refresh */}
    <div className="mt-4 mb-3 flex items-center justify-between gap-2">
      <Block className="h-5 w-28" />
      <div className="flex items-center gap-2">
        <Block className="h-8 w-28 rounded-lg" />
        <Block className="h-10 w-12 rounded-lg" />
      </div>
    </div>

    {/* Four stat cards, four across at every width — same as StatsCardGrid. The subtext
        block is sm-only there, so it is sm-only here too. */}
    <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-gray-200 p-2 sm:gap-2 sm:rounded-2xl sm:p-4">
          <Block className="h-8 w-8 rounded-lg sm:h-11 sm:w-11 sm:rounded-2xl" />
          <Block className="h-5 w-8 sm:h-7 sm:w-12" />
          <Block className="h-2.5 w-full sm:h-3 sm:w-20" />
          <Block className="hidden h-2.5 w-24 sm:block" />
        </div>
      ))}
    </div>

    {/* Financial summary: a header row and three tinted money tiles */}
    <div className="mt-4 rounded-2xl border border-gray-200 p-2.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Block className="h-8 w-8 rounded-lg" />
          <Block className="h-4 w-32" />
        </div>
        <Block className="h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-2 sm:p-3">
            <Block className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
            <Block className="mt-2 h-3 w-14" />
            <Block className="mt-1.5 h-5 w-16" />
            <Block className="mt-1.5 h-2.5 w-12" />
          </div>
        ))}
      </div>
    </div>

    {/* Rent collection progress: a header with month nav, then one block per house */}
    <div className="my-4 rounded-2xl border border-gray-200 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Block className="h-8 w-8 rounded-lg" />
          <Block className="h-4 w-40" />
        </div>
        <Block className="h-8 w-32 rounded-lg" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="py-3">
          <div className="flex items-center gap-2.5">
            <Block className="h-9 w-9 rounded-full" />
            <div className="flex-1">
              <Block className="h-3.5 w-28" />
              <Block className="mt-1.5 h-2.5 w-36" />
            </div>
            <Block className="h-6 w-6 rounded-full" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Block className="h-2 flex-1 rounded-full" />
            <Block className="h-3 w-9" />
          </div>
        </div>
      ))}
    </div>

    {/* Quick actions — 2×2 */}
    <div className="rounded-xl border border-gray-200 p-4 mt-4">
      <Block className="h-3 w-24 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <Block className="h-9 w-9 rounded-lg" />
            <div className="flex-1">
              <Block className="h-3.5 w-24" />
              <Block className="h-3 w-32 mt-1.5 hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Upcoming / overdue lists */}
    {[0, 1].map((i) => (
      <div key={i} className="rounded-xl border border-gray-200 mt-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <Block className="h-5 w-36" />
            <Block className="h-3 w-48 mt-1.5" />
          </div>
          <Block className="h-7 w-24 rounded-full" />
        </div>
        <div className="px-6 py-4">
          <Block className="h-4 w-2/3" />
          <Block className="h-3 w-1/3 mt-2" />
        </div>
      </div>
    ))}
  </div>
);

export default DashboardSkeleton;
