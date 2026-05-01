import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Shared animated SVG — extracted so both loaders reuse the same shape.
function InfinityLoader({ strokeColor = '#f9873c' }) {
    return (
        <div className="w-[120px] h-[60px]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150">
                <path
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeDasharray="300 385"
                    strokeDashoffset="0"
                    d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        calcMode="spline"
                        dur="2s"
                        values="685;-685"
                        keySplines="0 0 1 1"
                        repeatCount="indefinite"
                    />
                </path>
            </svg>
        </div>
    );
}

/**
 * Full-screen blocking overlay loader.
 * Use for: auth gates, ProtectedRoute, PersistGate, component-level data loading.
 * The overlay prevents interaction while content is unavailable.
 */
export function LoaderMinimal({ strokeColor = '#f9873c' }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
            <InfinityLoader strokeColor={strokeColor} />
        </div>
    );
}

/**
 * Non-blocking center indicator for route transitions.
 * No background overlay — content stays visible underneath.
 * pointer-events-none so it never blocks clicks.
 */
function RouteLoaderSVG() {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <InfinityLoader />
        </div>
    );
}

/**
 * Mounts once inside <Router>. Responds to pathname changes:
 *   - Starts the NProgress top bar immediately.
 *   - Shows the center SVG only after 200ms (avoids flash on instant/cached navigations).
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

        // Delay the center SVG so fast/cached routes don't flash it at all.
        showTimerRef.current = setTimeout(() => setShow(true), 200);

        // Finish both after a period that covers typical lazy-chunk load times.
        doneTimerRef.current = setTimeout(() => {
            NProgress.done();
            setShow(false);
        }, 600);

        return () => {
            clearTimeout(showTimerRef.current);
            clearTimeout(doneTimerRef.current);
            // Hide the SVG immediately on rapid back-to-back navigations.
            // Do NOT call NProgress.done() here — let the new effect's start() continue
            // the bar smoothly rather than flashing complete → restart.
            setShow(false);
        };
    }, [location.pathname]);

    return show ? <RouteLoaderSVG /> : null;
};

export default RouteLoader;
