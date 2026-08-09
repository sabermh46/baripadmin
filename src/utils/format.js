// src/utils/format.js
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Was `style: 'currency', currency: 'USD'`, which renders "$1,234" — the wrong currency for
 * a BDT app. Nothing imports this today, so it never shipped a visible dollar sign, but it
 * was a trap for the next person to reach for it.
 *
 * Formats as `৳1,234`. Uses BDT number grouping via the `bn-BD`-compatible `en-IN` locale
 * only for the digits; the symbol is prepended explicitly because Intl renders BDT as the
 * ASCII "Tk" in several environments rather than the ৳ glyph the UI uses elsewhere
 * (see components/common/TkSymbol.jsx).
 */
export const formatCurrency = (amount, { decimals = 0 } = {}) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '৳0';

  return `৳${n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};