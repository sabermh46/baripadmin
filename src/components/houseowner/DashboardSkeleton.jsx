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
    {/* Greeting + refresh */}
    <div className="flex justify-between items-center">
      <Block className="h-5 w-48" />
      <Block className="h-10 w-12 rounded-lg" />
    </div>

    {/* Four stat cards: 2-up on a phone, 4-up from md — same as StatsCardGrid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-3">
          <Block className="h-10 w-10 rounded-lg" />
          <Block className="h-3 w-20" />
          <Block className="h-7 w-10" />
        </div>
      ))}
    </div>

    <div className="flex flex-col mt-4">
      {/* Three money cards */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border-2 border-gray-200 p-2 flex flex-col items-center gap-2">
            <Block className="h-3 w-16" />
            <Block className="h-6 w-24" />
            <Block className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Rent collection progress: a month header and one row per house */}
      <div className="rounded-xl border border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <Block className="h-6 w-6 rounded-full" />
          <Block className="h-4 w-32" />
          <Block className="h-6 w-6 rounded-full" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-2 items-center mb-3">
            <Block className="h-4 w-20 md:w-40 lg:w-56" />
            <Block className="h-6 flex-1 rounded-full" />
            <Block className="h-6 w-6 rounded-full" />
          </div>
        ))}
      </div>
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
