import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useGetOwnerHistoryQuery } from '../../../../store/api/authApi';

/**
 * The shell every history list on the owner page shares: fetch on approach, one page at a
 * time, real totals.
 *
 * These lists (app fees, rent, advances, expenses, loans, loan payments) are the part of an
 * owner's record that grows every month, and they sit below the houses, out of view when the
 * page opens. They used to arrive in the page's single request at 50 rows each, whether or
 * not anyone scrolled down to them. Now each asks for its own first page once it comes within
 * a screen of the viewport, and never before. An admin who opens the page to check a flat
 * costs the server nothing for the history.
 */

/** True once the element has come within `margin` of the viewport. Latches: never goes back to false. */
const useSeen = (margin = '400px') => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: margin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [seen, margin]);

  return [ref, seen];
};

const PagerButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="p-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
  >
    {children}
  </button>
);

/**
 * One paginated list. `columns` is [{ header, cell: (row) => node, className? }].
 * Renders its own heading when `title` is given, so a section can stack several of these.
 */
export const HistoryList = ({ ownerId, section, columns, emptyText, title, icon: Icon, subheading, action }) => {
  const [ref, seen] = useSeen();
  const [page, setPage] = useState(1);

  const { data, isFetching, isError, refetch } = useGetOwnerHistoryQuery(
    { ownerId, section, page },
    { skip: !seen || !ownerId }
  );

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total;
  const totalPages = meta?.totalPages ?? 1;

  const heading = title ? (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {title} {total != null && `(${total.toLocaleString()})`}
      </h3>
      {/* An optional control beside the heading, e.g. the app-fee timeline. */}
      {action}
    </div>
  ) : subheading ? (
    <div className="text-xs font-medium text-gray-600 uppercase mb-2">
      {subheading} {total != null && `(${total.toLocaleString()})`}
    </div>
  ) : null;

  let body;
  if (!data && (isFetching || !seen)) {
    body = <div className="h-16 rounded-lg bg-gray-50 animate-pulse" aria-busy="true" />;
  } else if (isError && !data) {
    body = (
      <p className="text-sm text-red-600 py-2">
        Could not load this list.{' '}
        <button type="button" onClick={() => refetch()} className="underline">
          Retry
        </button>
      </p>
    );
  } else if (!rows.length) {
    body = <p className="text-sm text-gray-500 py-2">{emptyText}</p>;
  } else {
    body = (
      <>
        <div
          className={`border border-gray-200 rounded-lg overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : ''}`}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className="text-left py-2 px-3 font-medium text-gray-700 whitespace-nowrap">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  {columns.map((c) => (
                    <td key={c.header} className={`py-2 px-3 ${c.className ?? 'text-gray-600'}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-gray-600">
            {/* The range, not just "page 3 of 216": it says how far into the history the
                admin is, which is what they are actually looking for. */}
            <span className="tabular-nums">
              {((meta.page - 1) * meta.limit + 1).toLocaleString()}–
              {Math.min(meta.page * meta.limit, total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              {/* First/last as well as prev/next: five years of rent is over 200 pages,
                  and the oldest record is a common thing to go looking for. */}
              <PagerButton label="First page" onClick={() => setPage(1)} disabled={page <= 1 || isFetching}>
                <ChevronsLeft size={16} />
              </PagerButton>
              <PagerButton label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
                <ChevronLeft size={16} />
              </PagerButton>
              <span className="px-2 tabular-nums">
                Page {meta.page} of {totalPages}
              </span>
              <PagerButton
                label="Next page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                <ChevronRight size={16} />
              </PagerButton>
              <PagerButton label="Last page" onClick={() => setPage(totalPages)} disabled={page >= totalPages || isFetching}>
                <ChevronsRight size={16} />
              </PagerButton>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div ref={ref}>
      {heading}
      {body}
    </div>
  );
};

/** The card around one or more HistoryLists. */
export const HistoryCard = ({ children }) => (
  <section className="bg-surface rounded-xl border border-subdued/20 p-4">{children}</section>
);
