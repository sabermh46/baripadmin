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
 * Receipt for an advance payment (a security deposit) the renter has handed over.
 *
 * Its own document rather than the rent receipt with different wording. An advance is money
 * held against FUTURE rent, so the figures that matter are what was received and what is still
 * available - not a month, a due date or a balance owed. Handing a renter a "RENT RECEIPT" for
 * their deposit tells them something untrue about what they have paid off.
 *
 * Bengali is handled by the surface exactly as everywhere else; see utils/pdf/fonts.js.
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

/** 'mobile_banking' -> 'Mobile banking'. */
function humanise(value) {
  if (!value) return null;
  return String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * @param {object}  data
 * @param {string}  data.renterName
 * @param {string}  data.houseName
 * @param {string}  [data.houseAddress]
 * @param {string}  [data.ownerName]
 * @param {string}  [data.ownerEmail]
 * @param {string}  [data.ownerPhone]
 * @param {string}  data.flatNumber
 * @param {number}  data.amount            what the renter handed over
 * @param {number}  [data.remainingAmount] what is still unspent, when it differs
 * @param {string}  data.paymentDate       ISO date
 * @param {string}  [data.paymentMethod]
 * @param {string}  [data.transactionId]
 * @param {number}  [data.advanceId]       for the receipt number
 * @param {string}  [data.note]
 *
 * @returns {Promise<string>} raw base64 (no data: prefix)
 */
export async function generateAdvanceReceiptPdf(data) {
  const {
    renterName = 'N/A',
    houseName = 'N/A',
    houseAddress,
    ownerName,
    ownerEmail,
    ownerPhone,
    flatNumber = 'N/A',
    amount = 0,
    remainingAmount,
    paymentDate,
    paymentMethod,
    transactionId,
    advanceId,
    note,
  } = data;

  const surface = await createSurface({ content: data });

  const left = PAGE.marginX;
  const right = PAGE.width - PAGE.marginX;
  const contentWidth = right - left;

  const received = Number(amount) || 0;
  const remaining = Number.isFinite(Number(remainingAmount)) ? Number(remainingAmount) : received;
  const applied = Math.max(0, received - remaining);
  const dateStr = formatDate(paymentDate);

  const header = documentHeader(surface, {
    documentType: 'ADVANCE RECEIPT',
    badge: { label: 'RECEIVED', background: COLORS.successBg, color: COLORS.successInk },
    meta: advanceId
      ? `Receipt #ADV-${String(advanceId).padStart(6, '0')}   ·   ${dateStr}`
      : dateStr,
  });

  const propertyRows = [
    houseAddress && { text: houseAddress },
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

  // ── Where the advance stands ─────────────────────────────────────────────
  sectionHeading(surface, 'Advance summary', left, panelY + panelHeight + 10);

  // Only what is true of this advance. On a freshly recorded one, "applied" and a separate
  // "available" line would both restate the amount received in three different ways.
  const rows = [['Advance received', `BDT ${formatMoney(received)}`]];
  if (applied > 0) {
    rows.push(['Applied to rent so far', `(BDT ${formatMoney(applied)})`]);
    rows.push(['Available for future rent', `BDT ${formatMoney(remaining)}`]);
  }

  const tableTop = panelY + panelHeight + 14;
  const summary = dataTable(surface, {
    x: left, y: tableTop, width: 104,
    head: ['DESCRIPTION', 'AMOUNT'],
    rows,
  });

  const cardX = left + 110;
  const card = highlightCard(surface, {
    x: cardX, y: tableTop - 1, width: right - cardX, minHeight: (summary.endY - tableTop) + 2,
    label: 'ADVANCE RECEIVED',
    value: formatMoney(received),
    unit: 'BDT',
    rows: [
      paymentMethod && { text: humanise(paymentMethod) },
      transactionId && { text: `Ref: ${transactionId}`, size: TYPE.micro, color: COLORS.muted },
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
      'Computer-generated receipt — no signature required',
      `Generated ${formatDate()}`,
    ],
  });

  return surface.toBase64();
}
