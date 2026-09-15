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
 * Always en-US, never the ambient locale.
 *
 * This was toLocaleString(undefined, ...). On a machine set to Bengali that returns Bengali
 * numerals, which the built-in Latin faces cannot draw at all - so every amount on every
 * receipt came out as replacement boxes, not just the names and notes.
 */
function formatMoney(val) {
  return parseFloat(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonth(rawMonth) {
  if (!rawMonth) return 'N/A';
  // Accepts "YYYY-MM" or full date strings.
  try {
    const d = new Date(rawMonth + (rawMonth.length === 7 ? '-02' : ''));
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    // Unparseable month string: fall through and show it as given.
  }
  return rawMonth;
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * The status pill in the header.
 *
 * This used to be `Number(totalAmount) > 0 ? 'PAID' : null`, which says PAID about any
 * document carrying a figure - including a reminder for rent nobody has paid, and a receipt
 * for a part payment that still leaves a balance. The payment's own status decides it now,
 * and the amount is only consulted when no status was passed.
 */
function statusBadge({ kind, status, totalAmount, amountDue, dueDate }) {
  if (kind === 'reminder') {
    const overdue = dueDate ? new Date(dueDate) < new Date() : false;
    return overdue
      ? { label: 'OVERDUE', background: COLORS.dangerBg, color: COLORS.dangerInk }
      : { label: 'DUE', background: COLORS.warnBg, color: COLORS.warnInk };
  }

  const paid = Number(totalAmount) || 0;
  const billed = Number(amountDue);
  const settled = status
    ? status === 'paid'
    : (Number.isFinite(billed) && billed > 0 ? paid >= billed : paid > 0);

  if (settled) return { label: 'PAID', background: COLORS.successBg, color: COLORS.successInk };
  if (paid > 0) return { label: 'PART PAID', background: COLORS.warnBg, color: COLORS.warnInk };
  return null;
}

/**
 * Generate a styled rent receipt PDF.
 *
 * Every field below may arrive in Bengali - owner and renter names, the house name, the
 * address, the flat number, service names, and the note the admin types at send time. The
 * surface picks the embedded Bengali face per string, so none of them need special handling
 * here; see utils/pdf/fonts.js for what makes that work.
 *
 * @param {object} data
 * @param {string} data.renterName
 * @param {string} data.houseName
 * @param {string} [data.houseAddress]
 * @param {string} [data.ownerName]
 * @param {string} [data.ownerEmail]
 * @param {string} [data.ownerPhone]
 * @param {string} data.flatNumber
 * @param {number} data.totalAmount
 * @param {string} data.paymentDate   ISO date string
 * @param {string} [data.transactionId]
 * @param {number} data.baseRent
 * @param {number} data.amenitiesTotal
 * @param {number} data.lateFee
 * @param {Array<{name:string,charge:number}>} [data.amenities]
 * @param {string} [data.forMonth]    e.g. "2026-04"
 * @param {string} [data.paymentMethod]
 * @param {number} [data.paymentId]
 * @param {string} [data.note]
 * @param {'receipt'|'reminder'} [data.kind]
 * @param {string} [data.status]      the payment's own status: paid / partial / pending
 * @param {number} [data.amountDue]   what was billed, when it differs from what was paid
 * @param {string} [data.dueDate]     ISO date; a reminder past it is OVERDUE rather than DUE
 *
 * @returns {Promise<string>} raw base64 string (no data: prefix)
 */
export async function generateRentReceiptPdf(data) {
  return buildRentDocument({ ...data, kind: 'receipt' });
}

/**
 * The same document, addressed to money that has NOT arrived.
 *
 * It is the reminder rather than the receipt that made the status badge worth getting right:
 * the badge used to read PAID whenever the amount was above zero, which is true of every
 * reminder ever sent. A tenant being chased for rent was handed a notice stamped PAID.
 *
 * @param {object} data  as generateRentReceiptPdf, with `amountDue` and `dueDate`
 * @returns {Promise<string>} raw base64 string (no data: prefix)
 */
export async function generateRentReminderPdf(data) {
  return buildRentDocument({ ...data, kind: 'reminder' });
}

async function buildRentDocument(data) {
  const {
    renterName = 'N/A',
    houseName = 'N/A',
    houseAddress,
    ownerName,
    ownerEmail,
    ownerPhone,
    flatNumber = 'N/A',
    totalAmount = 0,
    paymentDate,
    transactionId,
    baseRent = 0,
    amenitiesTotal = 0,
    lateFee = 0,
    amenities = [],
    forMonth,
    paymentMethod,
    paymentId,
    note,
    kind = 'receipt',
    status,
    amountDue,
    dueDate,
  } = data;

  const isReminder = kind === 'reminder';

  // The whole payload is scanned once for Bengali; the typefaces are fetched and embedded
  // only if some is found, so an all-Latin receipt costs no extra bytes and no extra
  // network request.
  const surface = await createSurface({ content: data });

  const left = PAGE.marginX;
  const right = PAGE.width - PAGE.marginX;
  const contentWidth = right - left;

  const dateStr = formatDate(paymentDate);
  const headline = isReminder ? Number(amountDue ?? totalAmount) : Number(totalAmount);

  const header = documentHeader(surface, {
    documentType: isReminder ? 'RENT REMINDER' : 'RENT RECEIPT',
    badge: statusBadge({ kind, status, totalAmount, amountDue, dueDate }),
    meta: paymentId
      ? `${isReminder ? 'Invoice' : 'Receipt'} #${paymentId}   ·   ${dateStr}`
      : dateStr,
  });

  // Both panels share a height so their tops and bottoms line up, and it is driven by
  // whichever side has more lines.
  const propertyRows = [
    houseAddress && { text: houseAddress },
    forMonth && { text: `For Month: ${formatMonth(forMonth)}` },
    isReminder && dueDate && { text: `Due Date: ${formatDate(dueDate)}` },
    // The landlord, so the receipt says who took the money and how to reach them. A receipt
    // that names only the tenant leaves them nobody to ask about it.
    ownerName && { text: `Owner: ${ownerName}` },
    ownerPhone && { text: `Phone: ${ownerPhone}` },
    ownerEmail && { text: `Email: ${ownerEmail}`, size: TYPE.caption },
  ].filter(Boolean);

  // Method and transaction reference used to be repeated here as well; they now appear once,
  // beside the amount on the total card, which is where they belong.
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

  // ── Payment breakdown, with the total card beside it ─────────────────────
  sectionHeading(surface, 'Payment breakdown', left, panelY + panelHeight + 10);

  const breakdownRows = [['Base Rent', `BDT ${formatMoney(baseRent)}`]];
  if (amenitiesTotal > 0) breakdownRows.push(['Service Charges', `BDT ${formatMoney(amenitiesTotal)}`]);
  if (lateFee > 0) breakdownRows.push(['Late Fee', `BDT ${formatMoney(lateFee)}`]);

  const tableTop = panelY + panelHeight + 14;
  const breakdown = dataTable(surface, {
    x: left, y: tableTop, width: 104,
    head: ['DESCRIPTION', 'AMOUNT'],
    rows: breakdownRows,
  });

  const cardX = left + 110;
  const card = highlightCard(surface, {
    // Matches the breakdown table's height unless its own contents need more.
    x: cardX, y: tableTop - 1, width: right - cardX, minHeight: (breakdown.endY - tableTop) + 2,
    label: isReminder ? 'AMOUNT DUE' : 'TOTAL PAID',
    value: formatMoney(headline),
    unit: 'BDT',
    rows: (isReminder
      ? [
        dueDate && { text: `Due ${formatDate(dueDate)}` },
        Number(totalAmount) > 0 && {
          text: `Paid so far: BDT ${formatMoney(totalAmount)}`,
          size: TYPE.micro,
          color: COLORS.muted,
        },
      ]
      : [
        paymentMethod && {
          text: paymentMethod.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
        },
        transactionId && { text: `Ref: ${transactionId}`, size: TYPE.micro, color: COLORS.muted },
      ]
    ).filter(Boolean),
  });

  // The card can hang below the table when the breakdown is only one or two rows, so the
  // flow continues from whichever ends lower.
  let flowY = Math.max(breakdown.endY, card.endY);

  // ── Service charges detail ───────────────────────────────────────────────
  const filledAmenities = amenities.filter((a) => a.name && parseFloat(a.charge) > 0);
  if (filledAmenities.length > 0) {
    sectionHeading(surface, 'Service charges detail', left, flowY + 12);
    const serviceCharges = dataTable(surface, {
      x: left, y: flowY + 16, width: contentWidth,
      head: ['SERVICE', 'CHARGE'],
      rows: filledAmenities.map((a) => [a.name, `BDT ${formatMoney(a.charge)}`]),
    });
    flowY = serviceCharges.endY;
  }

  // ── Note / notice ────────────────────────────────────────────────────────
  if (note && note.trim()) {
    noteBlock(surface, {
      x: left, y: flowY + 12, width: contentWidth,
      heading: 'Note', text: note.trim(),
    });
  }

  pageFooter(surface, {
    parts: [
      `Computer-generated ${isReminder ? 'notice' : 'receipt'} — no signature required`,
      `Generated ${formatDate()}`,
    ],
  });

  return surface.toBase64();
}
