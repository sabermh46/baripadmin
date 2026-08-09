import React from 'react';

/**
 * The app's only page-level loading primitives.
 *
 * A `RouteLoader` component used to live here too: on every pathname change it started an
 * NProgress bar, showed a full-viewport `fixed inset-0` spinner on a 200 ms timer, and
 * cleared both on a 600 ms timer. Those timers were fixed delays with no relationship to
 * whether the route had actually finished loading — a cached, instant navigation still
 * mounted and unmounted a viewport-sized overlay and ran a progress-bar animation for
 * 600 ms. That is invented latency plus two extra renders and two forced layouts per
 * navigation (it is the `nprogress.js` entry in the Lighthouse forced-reflow table).
 *
 * Suspense already knows exactly when a lazy chunk resolves, so the boundary inside
 * `Layout` around `<Outlet/>` does this job correctly and for free.
 */

// Single CSS border-spin, composited via `transform` only — no SMIL, no filters, no
// backdrop-blur. Memoized because its only prop is a constant at each call site.
const Spinner = React.memo(function Spinner({ size = 40 }) {
  return (
    <div
      className="rounded-full border-4 border-primary/20 border-t-primary animate-spin"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
});

/**
 * Full-screen blocking overlay.
 * Use only where interaction genuinely must be blocked: the auth gate and PersistGate,
 * before the shell exists. Anything rendered inside the Layout should use ContentLoader.
 */
export function LoaderMinimal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
      <Spinner />
    </div>
  );
}

/**
 * Fills only the container it is placed in, leaving the sidebar and header visible.
 * This is the Suspense fallback around Layout's <Outlet/> and the in-page loading state
 * for data-fetching views.
 */
export function ContentLoader() {
  return (
    <div className="flex items-center justify-center w-full min-h-[60vh]">
      <Spinner />
    </div>
  );
}

export { Spinner };
