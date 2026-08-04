import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Single CSS border-spin — GPU-composited via `transform` only (no SMIL, no filters),
// and memoized since it never takes props that change across mounts.
const Spinner = React.memo(function Spinner({ size = 40 }) {
    return (
        <div
            className="rounded-full border-4 border-primary/20 border-t-primary animate-spin"
            style={{ width: size, height: size }}
        />
    );
});

/**
 * Full-screen blocking overlay loader.
 * Use for: auth gates, ProtectedRoute, PersistGate, component-level data loading.
 * The overlay prevents interaction while content is unavailable.
 */
export function LoaderMinimal() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
            <Spinner />
        </div>
    );
}

/**
 * Non-blocking center indicator for route transitions.
 * No background overlay — content stays visible underneath.
 * pointer-events-none so it never blocks clicks.
 */
function RouteLoaderSpinner() {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <Spinner size={32} />
        </div>
    );
}

/**
 * Mounts once inside <Router>. Responds to pathname changes:
 *   - Starts the NProgress top bar immediately.
 *   - Shows the center spinner only after 200ms (avoids flash on instant/cached navigations).
 *   - Completes both after 600ms.
 *
 * Only [location.pathname] in the dep array — no state variables that would
 * cause the effect to re-trigger mid-navigation.
 */
const RouteLoader = () => {
    const location = useLocation();
    const [show, setShow] = useState(false);
    const showTimerRef = useRef(null);
    const doneTimerRef = useRef(null);

    useEffect(() => {
        // Cancel any timers from a previous navigation that hasn't completed yet.
        clearTimeout(showTimerRef.current);
        clearTimeout(doneTimerRef.current);

        // Top bar starts immediately on every navigation.
        NProgress.start();

        // Delay the center spinner so fast/cached routes don't flash it at all.
        showTimerRef.current = setTimeout(() => setShow(true), 200);

        // Finish both after a period that covers typical lazy-chunk load times.
        doneTimerRef.current = setTimeout(() => {
            NProgress.done();
            setShow(false);
        }, 600);

        return () => {
            clearTimeout(showTimerRef.current);
            clearTimeout(doneTimerRef.current);
            // Hide the spinner immediately on rapid back-to-back navigations.
            // Do NOT call NProgress.done() here — let the new effect's start() continue
            // the bar smoothly rather than flashing complete → restart.
            setShow(false);
        };
    }, [location.pathname]);

    return show ? <RouteLoaderSpinner /> : null;
};

export default RouteLoader;
