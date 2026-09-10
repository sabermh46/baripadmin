import React, { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Is the viewport narrower than `maxWidth` CSS pixels?
 *
 * Subtracting a hundredth makes it a true "less than": `(max-width: 470px)` would still
 * match at exactly 470.
 */
const useNarrowerThan = (maxWidth) => {
  const query = `(max-width: ${maxWidth - 0.01}px)`;

  // useSyncExternalStore rather than useState + useEffect: matchMedia *is* an external
  // store, and this reads it during render, so there is no first frame at a stale answer
  // and no window between mounting and subscribing where a resize could be missed.
  const subscribe = useCallback(
    (onStoreChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server snapshot: assume the wide path, which needs no measurement to be correct.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

/**
 * A figure that is measured against its own box and sized to fit it on one line.
 *
 * The stepped size ladder this replaces on narrow screens could only ever be approximately
 * right: it guessed a character width, assumed the tile was the width the layout maths said
 * it was, and knew nothing about the Profile font-size preference, which moves
 * `html { font-size }` (see utils/fontScale) and therefore every rem of padding around the
 * figure. Measuring the rendered text instead makes the fit exact for whatever the value,
 * the tile width and the reader's font preference actually are.
 *
 * Only below `below` px, because that is the only place the problem exists — a wider tile has
 * room for the design sizes, and a measured size there would shrink text that had no need to
 * shrink. Above the threshold the inline size is removed and the `className`'s own Tailwind
 * text-size classes take back over.
 *
 * `maxRem` is a ceiling, not a target: short values are drawn at it, longer ones scale down
 * from it. It is in rem so the ceiling itself follows the reader's font preference.
 */
const FitNumber = ({
  children,
  maxRem = 1.25,
  minPx = 7,
  below = 470,
  className = '',
  title,
}) => {
  const boxRef = useRef(null);
  const spanRef = useRef(null);
  // The last size written, so a stray observer callback cannot start a feedback walk.
  const lastRef = useRef(null);
  const active = useNarrowerThan(below);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = spanRef.current;
    if (!box || !span) return;

    if (!active) {
      span.style.removeProperty('font-size');
      lastRef.current = null;
      return;
    }

    const fit = () => {
      // clientWidth, so the box's own padding is already out of the budget.
      const available = box.clientWidth;
      if (!available) return;

      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const maxPx = maxRem * rootPx;

      // Measured at the ceiling every time, never at the current size. Scaling from the
      // previous answer would feed the ResizeObserver below its own output, and the size
      // walks a little further every callback.
      span.style.fontSize = `${maxPx}px`;
      const natural = span.getBoundingClientRect().width;
      if (!natural) return;

      // Half a pixel of slack: the ratio is fractional, and sub-pixel rounding can leave the
      // final glyph a hair past the edge where overflow-hidden would shave it.
      const target = Math.max(minPx, Math.min(maxPx, ((available - 0.5) / natural) * maxPx));

      if (lastRef.current != null && Math.abs(lastRef.current - target) < 0.01) {
        span.style.fontSize = `${lastRef.current}px`;
        return;
      }
      lastRef.current = target;
      span.style.fontSize = `${target}px`;
    };

    fit();

    // The box is w-full inside a fixed grid track, so its width never depends on the span —
    // this fires for viewport changes and for rem-based padding moving, not for our own write.
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    // The Profile preference writes html{font-size} directly, outside React, so nothing here
    // would re-render. Surrounding padding is rem-based so the box usually resizes and the
    // observer catches it; this covers the case where it does not.
    const mo = new MutationObserver(fit);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-font-scale'],
    });

    // Google Sans Code is a webfont. Measuring against the monospace fallback on a cold load
    // and never measuring again would size every figure to the wrong metrics.
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      mo.disconnect();
    };
  }, [children, maxRem, minPx, active]);

  return (
    <div ref={boxRef} title={title} className={`w-full overflow-hidden ${className}`}>
      <span ref={spanRef} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </div>
  );
};

export default FitNumber;
