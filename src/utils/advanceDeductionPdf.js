import {
  COLORS,
  PAGE,
  TYPE,
  createSurface,
  dataTable,
  detailPanel,
  documentHeader,
  highlightCard,
  noteBlock,
  pageFooter,
  panelHeightFor,
  sectionHeading,
} from './pdf';

/**
 * Notice that part of a renter's advance has been applied to their rent.
 *
 * The document exists because the deposit otherwise shrinks silently: the renter handed over a
 * lump sum, and months later the balance is lower with nothing on record saying when, how much,
 * or which month it paid for. So the figures here are the deduction and what survives it - not
 * the original deposit, which is the one number the renter already knows.
 */

/** Always en-US: under a Bengali locale the built-in Latin faces cannot draw the digits. */
function formatMoney(val) {
  return parseFloat(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(rawMonth) {
  if (!rawMonth) return null;
  try {
    const d = new Date(rawMonth + (rawMonth.length === 7 ? '-02' : ''));
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    // Unparseable month string: show it as given.
  }
  return rawMonth;
}

/**
 * @param {object} data
 * @param {string} data.renterName
 * @param {string} data.houseName
 * @param {string} [data.houseAddress]
 * @param {string} [data.ownerName]
 * @param {string} [data.ownerEmail]
 * @param {string} [data.ownerPhone]
 * @param {string} data.flatNumber
 * @param {number} data.deductedAmount
 * @param {number} data.remainingAfter
 * @param {number} [data.advanceTotal]  the original deposit, for context
 * @param {string} [data.forMonth]
 * @param {string} data.date
 * @param {number} [data.advanceId]
 * @param {string} [data.note]
 *
 * @returns {Promise<string>} raw base64 (no data: prefix)
 */
export async function generateAdvanceDeductionPdf(data) {
  const {
    renterName = 'N/A',
    houseName = 'N/A',
    houseAddress,
    ownerName,
    ownerEmail,
    ownerPhone,
    flatNumber = 'N/A',
    deductedAmount = 0,
    remainingAfter = 0,
    advanceTotal,
    forMonth,
    date,
    advanceId,
    note,
  } = data;

  const surface = await createSurface({ content: data });

  const left = PAGE.marginX;
  const right = PAGE.width - PAGE.marginX;
  const contentWidth = right - left;

  const deducted = Number(deductedAmount) || 0;
  const remaining = Number(remainingAfter) || 0;
  const dateStr = formatDate(date);

  const header = documentHeader(surface, {
    documentType: 'ADVANCE APPLIED',
    // Neutral rather than green: nothing was paid and nothing is owed. This is a statement of
    // an adjustment, and a PAID-style badge would misrepresent it as a settlement.
    badge: { label: 'ADJUSTMENT', background: COLORS.panel, color: COLORS.body },
    meta: advanceId
      ? `Advance #ADV-${String(advanceId).padStart(6, '0')}   ·   ${dateStr}`
      : dateStr,
  });

  const propertyRows = [
    houseAddress && { text: houseAddress },
    forMonth && { text: `For Month: ${formatMonth(forMonth)}` },
    ownerName && { text: `Owner: ${ownerName}` },
    ownerPhone && { text: `Phone: ${ownerPhone}` },
    ownerEmail && { text: `Email: ${ownerEmail}`, size: TYPE.caption },
  ].filter(Boolean);

  const renterRows = [{ text: `Flat: ${flatNumber}` }];

  const panelY = header.endY + 5;
  const panelHeight = Math.max(
    panelHeightFor(renterRows.length),
    panelHeightFor(propertyRows.length),
  );

  detailPanel(surface, {
    x: left, y: panelY, width: 86, height: panelHeight,
    label: 'RENTER DETAILS', heading: renterName, rows: renterRows,
  });

  detailPanel(surface, {
    x: left + 90, y: panelY, width: 92, height: panelHeight,
    label: 'PROPERTY DETAILS', heading: houseName, rows: propertyRows,
  });

  sectionHeading(surface, 'Adjustment detail', left, panelY + panelHeight + 10);

  const rows = [];
  if (Number.isFinite(Number(advanceTotal)) && Number(advanceTotal) > 0) {
    rows.push(['Advance originally paid', `BDT ${formatMoney(advanceTotal)}`]);
  }
  rows.push(['Applied to rent', `(BDT ${formatMoney(deducted)})`]);
  rows.push(['Advance remaining', `BDT ${formatMoney(remaining)}`]);

  const tableTop = panelY + panelHeight + 14;
  const summary = dataTable(surface, {
    x: left, y: tableTop, width: 104,
    head: ['DESCRIPTION', 'AMOUNT'],
    rows,
  });

  const cardX = left + 110;
  const card = highlightCard(surface, {
    x: cardX, y: tableTop - 1, width: right - cardX, minHeight: (summary.endY - tableTop) + 2,
    label: 'APPLIED TO RENT',
    value: formatMoney(deducted),
    unit: 'BDT',
    rows: [
      forMonth && { text: formatMonth(forMonth) },
      { text: `Remaining: BDT ${formatMoney(remaining)}`, size: TYPE.micro, color: COLORS.muted },
    ].filter(Boolean),
  });

  const flowY = Math.max(summary.endY, card.endY);

  if (note && note.trim()) {
    noteBlock(surface, {
      x: left, y: flowY + 12, width: contentWidth,
      heading: 'Note', text: note.trim(),
    });
  }

  pageFooter(surface, {
    parts: [
      'Computer-generated notice — no signature required',
      `Generated ${formatDate()}`,
    ],
  });

  return surface.toBase64();
}
