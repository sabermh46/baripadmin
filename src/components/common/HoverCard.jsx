import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const EDGE = 8;
// Long enough for the pointer to cross the gap into the card, short enough that the card
// does not linger over whatever row the pointer lands on next.
const CLOSE_DELAY_MS = 140;

/**
 * A small panel that appears beside its trigger on hover and stays put long enough to be
 * used — the point of these cards is the link at the bottom, so a tooltip that died the
 * moment the pointer left the trigger would be decoration.
 *
 * Rendered into document.body rather than in place. Tables clip: the flats list sits inside
 * rounded `overflow-hidden` containers, and an in-flow card would be sliced at the row
 * boundary or would widen the table and start it scrolling sideways.
 *
 * Three ways in, because "hover" is only one of them:
 *  - mouse: pointerenter opens, pointerleave closes, click toggles.
 *  - touch: there is no hover at all, so the tap itself opens it. This is why `onFocus`
 *    checks :focus-visible — a tap focuses the button before it clicks it, and an
 *    unconditional open-on-focus would have the click arrive with the card already open and
 *    toggle it straight back shut. The card would flash and vanish on every phone.
 *  - keyboard: :focus-visible is exactly the "arrived here by keyboard" signal, so Tab opens.
 */
const HoverCard = ({ children, card, className = '', cardClassName = '', ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const closeTimer = useRef(null);
  const panelId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const hide = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const hideNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Measured after the card exists but before the browser paints, so it never flashes at the
  // wrong coordinates; `pos === null` keeps it invisible for that one frame.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = cardRef.current;
    if (!trigger || !panel) return;

    const t = trigger.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = panel;

    // Below by default; above only when there is no room below and there is room above.
    const placeAbove = window.innerHeight - t.bottom < h + GAP && t.top > h + GAP;

    setPos({
      top: placeAbove ? t.top - h - GAP : t.bottom + GAP,
      left: Math.min(Math.max(EDGE, t.left), Math.max(EDGE, window.innerWidth - w - EDGE)),
    });
  }, [open]);

  // Fixed coordinates go stale as soon as anything moves, and a card stranded beside the
  // wrong row is worse than no card.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => { if (e.key === 'Escape') hideNow(); };
    const onOutside = (e) => {
      if (triggerRef.current?.contains(e.target) || cardRef.current?.contains(e.target)) return;
      hideNow();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hideNow, true);
    window.addEventListener('resize', hideNow);
    document.addEventListener('pointerdown', onOutside);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hideNow, true);
      window.removeEventListener('resize', hideNow);
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [open, hideNow]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') hide(); }}
        onFocus={(e) => {
          // Keyboard arrivals only. See the note above on why a tap must not open here.
          if (e.target.matches?.(':focus-visible')) show();
        }}
        onBlur={(e) => {
          if (cardRef.current?.contains(e.relatedTarget)) return;
          hide();
        }}
        onClick={() => (open ? hideNow() : show())}
        className={`text-left underline decoration-dotted decoration-gray-300 underline-offset-4 hover:decoration-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded ${className}`}
      >
        {children}
      </button>

      {open &&
        createPortal(
          <div
            id={panelId}
            ref={cardRef}
            role="dialog"
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') hide(); }}
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className={`z-60 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${cardClassName}`}
          >
            {card}
          </div>,
          document.body
        )}
    </>
  );
};

export default HoverCard;
