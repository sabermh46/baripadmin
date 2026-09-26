// Shared by the history sections on the owner page. Separate from HistorySection.jsx so that
// file exports components only (fast refresh).

export const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

export const formatAmount = (v) => (v != null ? `৳${Number(v).toLocaleString()}` : '–');
