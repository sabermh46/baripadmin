/**
 * Design tokens for every PDF this app produces.
 *
 * These live apart from any one document so a second document type (a lease, a statement,
 * an expense report) inherits the same palette, rhythm and corner radius without copying
 * numbers around. Before this existed the receipt wrote greys inline as bare numbers —
 * setTextColor(120), setTextColor(80), setTextColor(40) — and drifted between four or five
 * unrelated greys.
 *
 * Colours are hex strings because that is how they are written in the app's CSS; the
 * surface converts them to pdf-lib's 0..1 RGB at the point of use.
 */

export const COLORS = {
  brand: '#f9873c',
  brandDeep: '#e8722a',

  ink: '#181e28',      // headings and figures
  body: '#404854',     // ordinary text
  muted: '#828a96',    // labels, captions, footer

  line: '#e3e6eb',     // hairlines and panel borders
  tint: '#fff7f1',     // brand-tinted panel fill
  tintBorder: '#f6e0cd',
  tintBorderStrong: '#f5cdac',
  panel: '#fafafb',    // neutral panel fill

  successBg: '#e8f7ed',
  successInk: '#168049',
  warnBg: '#fff4e5',
  warnInk: '#9a5b00',
  dangerBg: '#fdecec',
  dangerInk: '#b42318',

  white: '#ffffff',
};

/** One corner radius everywhere, so no two cards round differently. */
export const RADIUS = 3;

/** A4, in millimetres. */
export const PAGE = {
  width: 210,
  height: 297,
  marginX: 14,
  marginTop: 24,
  /** The footer rule sits here; body content must stop above it. */
  footerRuleY: 284,
  footerTextY: 288,
  /** Content may not extend past this without taking a new page. */
  contentBottom: 278,
};

export const TYPE = {
  title: 16,
  documentType: 13,
  figure: 17,
  sectionHeading: 9,
  body: 9,
  bodySmall: 8,
  caption: 7.5,
  micro: 7,
  label: 6.8,
};

/** Baseline-to-baseline step for stacked body lines, in mm. */
export const LINE_STEP = 7;
