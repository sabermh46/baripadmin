/**
 * How large the whole interface should be, as a user preference.
 *
 * Implemented by scaling the ROOT font size rather than by adding classes anywhere. Tailwind
 * sizes almost everything in rem — text, padding, gaps, heights, icon boxes — so moving
 * `html { font-size }` moves the entire layout together and stays in proportion. Adding a
 * text-size class per element would grow the words and leave the boxes around them behind.
 *
 * The scale is applied before React mounts (see main.jsx) so the first paint is already the
 * right size; doing it in a component would show one frame at the default and then jump.
 *
 * Every access is guarded — localStorage throws in Safari private mode — because a font
 * preference that cannot be read is not a reason to fail to render.
 */

export const FONT_SCALES = {
  small: { label: 'small', px: 14 },
  normal: { label: 'normal', px: 16 },
  large: { label: 'large', px: 18 },
  larger: { label: 'larger', px: 20 },
};

export const DEFAULT_SCALE = 'normal';

const KEY = 'barip:ui:fontScale';

export const readFontScale = () => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return FONT_SCALES[stored] ? stored : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
};

/**
 * 16px is the browser default and the value every rem in the app was designed against, so
 * "normal" clears the inline style rather than setting it — leaving the document exactly as
 * it would be if this feature did not exist.
 */
export const applyFontScale = (scale) => {
  const chosen = FONT_SCALES[scale] ? scale : DEFAULT_SCALE;
  const root = document.documentElement;

  if (chosen === DEFAULT_SCALE) {
    root.style.removeProperty('font-size');
  } else {
    root.style.fontSize = `${FONT_SCALES[chosen].px}px`;
  }

  // Exposed as an attribute so CSS can opt out of scaling for anything that must not move —
  // nothing needs it today, but a fixed-size chart or a print stylesheet would.
  root.setAttribute('data-font-scale', chosen);

  return chosen;
};

export const writeFontScale = (scale) => {
  const chosen = applyFontScale(scale);
  try {
    window.localStorage.setItem(KEY, chosen);
  } catch {
    // A preference that cannot be remembered still applies for this session.
  }
  return chosen;
};
