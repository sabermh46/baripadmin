import {
  COLORS,
  PAGE,
  TYPE,
  createSurface,
  dataTable,
  documentHeader,
  factRow,
  footnote,
  pageFooter,
  sectionHeading,
} from './pdf';

/**
 * Always en-US, never the ambient locale.
 *
 * This used to be toLocaleString(undefined, ...). Under a Bengali locale it renders Bengali
 * digits, and the built-in Latin faces cannot draw those at all - the export came out as
 * boxes. Exported so the screen, the CSV and the PDF share one formatter and can never
 * disagree about a figure.
 */
export const fmt = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMonth = (ym) => {
  if (!ym) return '-';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
};

/**
 * Generate the financial report PDF.
 *
 * Ported off jsPDF onto the shared toolkit in utils/pdf for the same reason the rent receipt
 * was: jsPDF's built-in fonts are Latin-1, so an owner, a property or a scope named in
 * Bengali came out of the export as mojibake. Everything a person typed can arrive in
 * Bengali here - the owner name, the scope label, and every house name in the by-property
 * table - and the surface now picks the embedded Bengali face per string.
 *
 * Returns the surface rather than bytes so the caller decides what to do with it:
 * `.save(name)` to download, `.toBase64()` to hand to the send-by-email endpoint.
 *
 * @param {object}   data
 * @param {string}   data.ownerLabel
 * @param {string}   [data.ownerEmail]
 * @param {string}   data.scopeLabel
 * @param {string}   data.periodLabel
 * @param {object}   data.totals
 * @param {Array}    data.monthly    monthly_breakdown rows
 * @param {Array}    [data.byHouse]  per-property rows; the table is omitted below two
 */
export async function generateFinancialReportPdf({
  ownerLabel,
  ownerEmail,
  scopeLabel,
  periodLabel,
  totals,
  monthly = [],
  byHouse = [],
}) {
  const surface = await createSurface({
    content: { ownerLabel, ownerEmail, scopeLabel, periodLabel, byHouse },
  });

  const left = PAGE.marginX;
  const width = PAGE.width - PAGE.marginX * 2;

  const header = documentHeader(surface, {
    documentType: 'FINANCIAL REPORT',
    meta: periodLabel,
  });

  // This block used to print the HOUSE name under a "HOUSE OWNER:" label, so every exported
  // report attributed a property to itself and named no person at all.
  const facts = factRow(surface, {
    x: left,
    y: header.endY + 8,
    width,
    facts: [
      { label: 'OWNER', values: [ownerLabel, ownerEmail] },
      { label: 'SCOPE', values: [scopeLabel] },
      { label: 'GENERATED', values: [new Date().toLocaleDateString('en-US')] },
    ],
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  sectionHeading(surface, 'Summary', left, facts.endY + 10, {
    size: TYPE.sectionHeading + 2, color: COLORS.brand,
  });

  const emphasis = new Set(['Total income', 'NET PROFIT']);
  const summary = dataTable(surface, {
    x: left,
    y: facts.endY + 14,
    width,
    variant: 'filled',
    head: ['', 'Amount (BDT)'],
    headFontSize: TYPE.bodySmall,
    columns: [{ width: 0.62, align: 'left' }, { align: 'right' }],
    rowHeight: 7.6,
    rows: [
      ['Rent collected', fmt(totals.rent_collected)],
      ['Advance received', fmt(totals.advance_received)],
      // Shown as a deduction, in muted grey, because it is money already counted inside
      // "Rent collected" above rather than a separate loss.
      { cells: ['Less: advance applied to rent', `(${fmt(totals.advance_applied)})`], color: COLORS.muted },
      ['Total income', fmt(totals.total_income)],
      ['Expenses', `(${fmt(totals.expenses)})`],
      ['NET PROFIT', fmt(totals.net_profit)],
      ['Rent outstanding (unpaid)', fmt(totals.rent_outstanding)],
    ],
    rowStyle: (row) => {
      const label = Array.isArray(row) ? row[0] : row.cells[0];
      return emphasis.has(label) ? { bold: true, fill: COLORS.tint } : {};
    },
  });

  // The note this table's whole layout exists for. Anyone re-adding the two figures by hand
  // will get a bigger number than the report shows, so the report says why.
  const caveat = footnote(
    surface,
    'Advance already spent on rent is shown inside "Rent collected" and deducted above, so it is counted once, not twice.',
    left,
    summary.endY + 4,
    { width },
  );

  // ── Monthly breakdown ────────────────────────────────────────────────────
  let flowY = summary.endY + 4 + caveat.height + 8;
  sectionHeading(surface, 'Monthly breakdown', left, flowY, {
    size: TYPE.sectionHeading + 2, color: COLORS.brand,
  });

  const monthlyColumns = [{ width: 0.2, align: 'left' }, {}, {}, {}, {}, {}];
  const monthlyTable = dataTable(surface, {
    x: left,
    y: flowY + 4,
    width,
    variant: 'filled',
    striped: true,
    head: ['Month', 'Rent', 'Adv. net', 'Income', 'Expenses', 'Net profit'],
    columns: monthlyColumns,
    fontSize: TYPE.bodySmall,
    headFontSize: TYPE.bodySmall - 0.5,
    rowHeight: 7.2,
    padding: 3.5,
    rows: monthly.map((r) => [
      fmtMonth(r.month), fmt(r.rent_collected), fmt(r.advance_net),
      fmt(r.total_income), fmt(r.expenses), fmt(r.net_profit),
    ]),
    foot: [
      'Total', fmt(totals.rent_collected), fmt(totals.advance_net),
      fmt(totals.total_income), fmt(totals.expenses), fmt(totals.net_profit),
    ],
  });
  flowY = monthlyTable.endY;

  // ── By property ──────────────────────────────────────────────────────────
  // One property is the scope already named at the top of the page; the table only earns
  // its space once there is more than one to compare.
  if (byHouse.length > 1) {
    sectionHeading(surface, `By property (${byHouse.length})`, left, flowY + 12, {
      size: TYPE.sectionHeading + 2, color: COLORS.brand,
    });
    flowY = dataTable(surface, {
      x: left,
      y: flowY + 16,
      width,
      variant: 'filled',
      striped: true,
      headFill: COLORS.ink,
      head: ['Property', 'Income', 'Expenses', 'Net profit', 'Outstanding'],
      columns: [{ width: 0.32, align: 'left' }, {}, {}, {}, {}],
      fontSize: TYPE.bodySmall,
      headFontSize: TYPE.bodySmall - 0.5,
      rowHeight: 7.2,
      padding: 3.5,
      rows: byHouse.map((h) => [
        h.house_name, fmt(h.total_income), fmt(h.expenses), fmt(h.net_profit), fmt(h.rent_outstanding),
      ]),
    }).endY;
  }

  pageFooter(surface, {
    caption: `${ownerLabel} — ${scopeLabel} — ${periodLabel}`,
  });

  return surface;
}

/** The filename the export downloads as. */
export function financialReportFileName({ scopeLabel, period }) {
  const scope = String(scopeLabel).replace(/[^\w]+/g, '_');
  return `Financial_Report_${scope}_${period.start_month}_${period.end_month}.pdf`;
}
