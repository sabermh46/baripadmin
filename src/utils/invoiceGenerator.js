import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import appLogo from '../assets/icons/logo.svg';

const BRAND = [249, 135, 60]; // orange

// One palette for the whole document. Grey values were previously written inline as bare
// numbers (`setTextColor(120)`, `setTextColor(80)`, `setTextColor(40)`), which made the
// receipt drift between four or five different greys with no relationship to each other.
const INK = [24, 30, 40];        // headings and figures
const BODY = [64, 72, 84];       // ordinary text
const MUTED = [130, 138, 150];   // labels, captions, footer
const LINE = [227, 230, 235];    // hairlines and panel borders
const TINT = [255, 247, 241];    // brand-tinted panel fill
const PANEL = [250, 250, 251];   // neutral panel fill

const RADIUS = 3;                // one corner radius everywhere

/** A rounded panel with an optional hairline border. Kept in one place so every card matches. */
function panel(doc, x, y, w, h, { fill = PANEL, border = LINE } = {}) {
  if (fill) {
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, w, h, RADIUS, RADIUS, 'F');
  }
  if (border) {
    doc.setDrawColor(...border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, w, h, RADIUS, RADIUS, 'S');
  }
}

// CSS pixels per millimetre. Used to size canvases against jsPDF's mm coordinate space.
const PX_PER_MM = 96 / 25.4;

// Supersampling factor for anything rasterised into the PDF. The page is laid out in mm and
// printed at ~300dpi, so a bitmap generated at CSS-pixel scale is roughly a quarter of the
// resolution it needs and prints visibly soft.
const RASTER_SCALE = 4;

/**
 * Rasterise the logo at print resolution, and report its real shape.
 *
 * Two bugs lived in the old version of this:
 *
 *   1. It returned only a data URL, and the caller drew it into a hardcoded 12x12mm box.
 *      logo.svg is 42x50 (aspect 0.84), so forcing it square stretched it horizontally by
 *      about 19% — the "scale-x" look.
 *   2. It sized the canvas from `img.width`, which for an SVG is its intrinsic 42px. That
 *      42px bitmap was then blown up into a 12mm slot (~142px at 300dpi), so the mark was
 *      soft no matter how clean the source vector was.
 *
 * Drawing the SVG into an oversized canvas re-rasterises it from the vector at that size,
 * so the result is genuinely sharp rather than an upscaled thumbnail.
 */
function loadLogoBase64(url, targetHeightMm) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const naturalW = img.naturalWidth || img.width || 1;
      const naturalH = img.naturalHeight || img.height || 1;
      const aspect = naturalW / naturalH;

      const heightPx = Math.max(1, Math.round(targetHeightMm * PX_PER_MM * RASTER_SCALE));
      const widthPx = Math.max(1, Math.round(heightPx * aspect));

      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, widthPx, heightPx);

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        widthMm: targetHeightMm * aspect,
        heightMm: targetHeightMm,
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Bengali (U+0980–U+09FF). Also catches the Bengali digits an owner may type in a note.
const COMPLEX_SCRIPT = /[ঀ-৿]/;

export function hasComplexScript(text) {
  return typeof text === 'string' && COMPLEX_SCRIPT.test(text);
}

/**
 * Split into user-perceived characters.
 *
 * Intl.Segmenter keeps a Bangla consonant together with its matra, hasant and any conjunct
 * that follows; iterating a string directly yields code points, which would let a hard break
 * land in the middle of one. Falls back to code points where Segmenter is unavailable —
 * still better than UTF-16 units, and the fallback only affects where a very long unbroken
 * word wraps, never whether it renders.
 */
function graphemes(str) {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(str), (s) => s.segment);
    }
  } catch {
    // Segmenter unsupported for this locale — fall through.
  }
  return Array.from(str);
}

/**
 * Render text through the BROWSER's text engine and hand jsPDF a picture of it.
 *
 * jsPDF's built-in fonts are Latin-1 only, so Bengali written into a note came out as
 * replacement boxes and random glyphs. Embedding a Bengali TTF does not fix it either:
 * jsPDF writes glyphs in logical order with no shaping engine, and Bengali needs shaping —
 * conjuncts have to fuse, and pre-base vowel signs (ি, ে, ৈ) are typed after their consonant
 * but must be drawn before it. Without that the text is still wrong, just wrong in a
 * different way.
 *
 * Canvas2D fillText goes through the same shaping stack as the rest of the page, so it gets
 * all of that right for free. The cost is that this run of text becomes an image: no longer
 * selectable or searchable in the PDF. That is why the caller only reaches for this when the
 * text actually needs it — Latin notes stay real, selectable text.
 *
 * @returns {Promise<{dataUrl: string, widthMm: number, heightMm: number}|null>}
 */
export async function renderTextToImage(text, {
  widthMm,
  fontPt = 9,
  lineHeight = 1.5,
  color = '#3c3c3c',
  fontFamily = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
  weight = 400,
  // 2x, not the logo's 4x. A body-text bitmap spans the full width of the page, so the
  // pixel count grows with the square of this — and at 9pt, 2x is already ~190dpi. The
  // first version used 4x here and produced a 2630px-wide image for a two-line note, which
  // jsPDF then embedded uncompressed. That is what pushed the PDF past the 1MB the email
  // outbox INSERT can accept.
  scale = 2,
} = {}) {
  const body = String(text ?? '').trim();
  if (!body) return null;

  const pxPerMm = PX_PER_MM * scale;
  const fontPx = fontPt * (25.4 / 72) * pxPerMm; // pt -> mm -> device px
  const maxWidthPx = widthMm * pxPerMm;
  const font = `${weight} ${fontPx}px ${fontFamily}`;

  // Without this the first render can fall back to a default face — the webfont is loaded
  // lazily and canvas does not trigger or wait for it the way DOM layout does.
  try {
    if (document.fonts?.load) {
      await document.fonts.load(`${weight} ${Math.round(fontPx)}px 'Hind Siliguri'`, body);
      await document.fonts.ready;
    }
  } catch {
    // Font loading unavailable or blocked — fall through and use whatever resolves.
  }

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;

  // Wrap on whitespace, then hard-break any single token that still overflows (a long URL,
  // or Bengali written without spaces).
  const lines = [];
  for (const paragraph of body.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure.measureText(candidate).width <= maxWidthPx) { line = candidate; continue; }
      if (line) lines.push(line);
      if (measure.measureText(word).width <= maxWidthPx) { line = word; continue; }
      let chunk = '';
      // Grapheme clusters, not code points. Splitting Bangla by code point can cut a
      // consonant away from its matra or hasant, so a hard-broken line would end in a
      // dangling vowel sign and the next would start with an orphaned mark.
      for (const ch of graphemes(word)) {
        if (measure.measureText(chunk + ch).width > maxWidthPx && chunk) { lines.push(chunk); chunk = ch; }
        else chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }

  const linePx = fontPx * lineHeight;

  // Crop to the longest line actually drawn rather than always allocating the full column
  // width. A one-line note was producing a full-width bitmap that was mostly empty pixels,
  // and every one of them still costs bytes in the PDF.
  const widestPx = lines.reduce((w, l) => Math.max(w, measure.measureText(l).width), 0);
  const canvasW = Math.max(1, Math.ceil(Math.min(widestPx, maxWidthPx)));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = Math.max(1, Math.ceil(lines.length * linePx));

  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    // Baseline sits ~0.8em down the line box; Bengali descenders and the matra above the
    // line both need room, which the 1.5 line-height provides.
    ctx.fillText(line, 0, i * linePx + fontPx * 0.85);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    // Derived from the cropped canvas, so the caller places it at its true size instead of
    // stretching a narrow bitmap across the whole column.
    widthMm: canvas.width / pxPerMm,
    heightMm: canvas.height / pxPerMm,
  };
}

/**
 * Always en-US, never the ambient locale.
 *
 * This was toLocaleString(undefined, ...). On a machine set to Bengali that returns
 * `১৯,০০০.০০`, and jsPDF's built-in helvetica cannot draw Bengali digits — so every amount
 * on every receipt came out as replacement boxes, not just notes the owner typed in Bangla.
 */
function formatMoney(val) {
  return parseFloat(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMonth(rawMonth) {
  if (!rawMonth) return 'N/A';
  // Accepts "YYYY-MM" or full date strings
  try {
    const d = new Date(rawMonth + (rawMonth.length === 7 ? '-02' : ''));
    if (!isNaN(d)) return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    // Unparseable month string: fall through and show it as given.
  }
  return rawMonth;
}

/**
 * Generate a styled rent receipt PDF.
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
 *
 * @returns {Promise<string>} raw base64 string (no data: prefix)
 */
export async function generateRentReceiptPdf(data) {
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
  } = data;

  // compress: true is not the default. Without it every embedded bitmap is written as a
  // raw uncompressed stream, which is the difference between a receipt that fits in the
  // email outbox row and one that does not.
  const doc = new jsPDF({ compress: true });

  // ── Header ──────────────────────────────────────────────────────────────
  try {
    // Height is what is fixed by the header layout; width follows the logo's real aspect
    // instead of being forced to match, which is what was squashing it.
    const logo = await loadLogoBase64(appLogo, 13);
    if (logo) doc.addImage(logo.dataUrl, 'PNG', 14, 9, logo.widthMm, logo.heightMm);
  } catch {
    doc.setFillColor(...BRAND);
    doc.circle(20, 16, 6, 'F');
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('Bari Porichalona', 30, 16.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Smart Property Management Platform', 30, 21);

  // Title block (right-aligned)
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('RENT RECEIPT', 196, 14, { align: 'right' });

  // A receipt should say at a glance that it IS one. Previously the only way to tell a
  // settled payment from a partial was to compare two numbers in the breakdown table.
  const isSettled = Number(totalAmount) > 0;
  if (isSettled) {
    const pillW = 17;
    const pillX = 196 - pillW;
    doc.setFillColor(232, 247, 237);
    doc.roundedRect(pillX, 16.5, pillW, 5.4, 2.7, 2.7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 128, 73);
    doc.text('PAID', pillX + pillW / 2, 20.3, { align: 'center' });
  }

  const dateStr = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    paymentId ? `Receipt #${paymentId}  ·  ${dateStr}` : dateStr,
    196, 26, { align: 'right' },
  );

  // Two-weight rule: a short brand stroke over a full hairline reads as deliberate, where a
  // single heavy orange line across the page reads as a divider someone forgot to style.
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(14, 29, 196, 29);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1.1);
  doc.line(14, 29, 46, 29);

  // ── Info Boxes ───────────────────────────────────────────────────────────
  const boxY = 34;

  // Pre-compute right box address lines (max 2) for dynamic height
  const addrLines = houseAddress
    ? doc.splitTextToSize(houseAddress, 78).slice(0, 2)
    : [];
  const rightLineCount =
    1 + // house name
    (forMonth ? 1 : 0) +
    addrLines.length +
    (ownerName ? 1 : 0) +
    (ownerEmail ? 1 : 0) +
    (ownerPhone ? 1 : 0);
  // 7 title + 7 first-line gap + remaining lines at 7px each + 4 bottom padding
  const BOX_H = Math.max(38, 7 + 7 + (rightLineCount * 7) + 4);

  // Left box: Renter details
  panel(doc, 14, boxY, 86, BOX_H, { fill: TINT, border: [246, 224, 205] });

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('RENTER DETAILS', 18, boxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.setFontSize(9.5);
  doc.text(renterName, 18, boxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BODY);
  // Method and transaction reference used to be repeated here as well; they now appear once,
  // beside the amount on the total card, which is where they belong.
  doc.text(`Flat: ${flatNumber}`, 18, boxY + 21);

  // Right box: Property details
  panel(doc, 104, boxY, 92, BOX_H, { fill: TINT, border: [246, 224, 205] });

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('PROPERTY DETAILS', 108, boxY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.setFontSize(9.5);
  doc.text(houseName, 108, boxY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BODY);
  let rY = boxY + 21;
  if (addrLines.length > 0) {
    addrLines.forEach(line => {
      doc.text(line, 108, rY);
      rY += 7;
    });
  }
  if (forMonth) {
    doc.text(`For Month: ${formatMonth(forMonth)}`, 108, rY);
    rY += 7;
  }
  // The landlord, so the receipt says who took the money and how to reach them. A receipt
  // that names only the tenant leaves them nobody to ask about it.
  if (ownerName) {
    doc.text(`Owner: ${ownerName}`, 108, rY);
    rY += 7;
  }
  if (ownerPhone) {
    doc.text(`Phone: ${ownerPhone}`, 108, rY);
    rY += 7;
  }
  if (ownerEmail) {
    doc.setFontSize(7.5);
    doc.text(`Email: ${ownerEmail}`, 108, rY);
    doc.setFontSize(8);
    rY += 7;
  }

  // ── Payment Breakdown Table ──────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text('Payment breakdown', 14, boxY + BOX_H + 10);

  const breakdownRows = [
    ['Base Rent', `BDT ${formatMoney(baseRent)}`],
  ];
  if (amenitiesTotal > 0) {
    breakdownRows.push(['Service Charges', `BDT ${formatMoney(amenitiesTotal)}`]);
  }
  if (lateFee > 0) {
    breakdownRows.push(['Late Fee', `BDT ${formatMoney(lateFee)}`]);
  }

  const tableStartY = boxY + BOX_H + 14;
  const pagesAtBreakdown = doc.internal.getNumberOfPages();

  // No cell fills anywhere — only horizontal rules. That is what lets the rounded frame
  // below sit cleanly around the table: a solid header or a striped body would paint square
  // corners inside the curve. The total has moved out to its own card on the right, which
  // also fills the empty half-page the 100mm table used to leave behind.
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    tableWidth: 104,
    head: [['DESCRIPTION', 'AMOUNT']],
    body: breakdownRows,
    theme: 'plain',
    headStyles: {
      fillColor: false, textColor: MUTED, fontSize: 6.8, fontStyle: 'bold',
      lineColor: LINE, lineWidth: { bottom: 0.4 },
      cellPadding: { top: 3.5, bottom: 2.5, left: 5, right: 5 },
    },
    bodyStyles: {
      textColor: BODY, fontSize: 9,
      lineColor: LINE, lineWidth: { bottom: 0.2 },
      cellPadding: { top: 3.2, bottom: 3.2, left: 5, right: 5 },
    },
    columnStyles: { 1: { halign: 'right', textColor: INK } },
  });

  const breakdownEndY = doc.lastAutoTable.finalY;

  // Frame drawn after the fact, because the table's height is only known once it has run —
  // and only if it stayed on one page. autoTable splits long tables itself, in which case
  // finalY refers to the LAST page and a frame drawn from tableStartY would be a tall
  // rectangle spanning nothing.
  if (doc.internal.getNumberOfPages() === pagesAtBreakdown) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(14, tableStartY - 1, 104, (breakdownEndY - tableStartY) + 2, RADIUS, RADIUS, 'S');
  }

  // ── Total card ───────────────────────────────────────────────────────────
  const cardX = 124;
  const cardW = 72;
  const cardY = tableStartY - 1;
  const cardH = Math.max(30, (breakdownEndY - tableStartY) + 2);

  panel(doc, cardX, cardY, cardW, cardH, { fill: TINT, border: [245, 205, 172] });

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('TOTAL PAID', cardX + 6, cardY + 8);

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INK);
  doc.text(formatMoney(totalAmount), cardX + 6, cardY + 18);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('BDT', cardX + 6, cardY + 23);

  // Method and reference sit with the amount, where someone reconciling a payment looks —
  // rather than buried in the renter panel at the top.
  let cardLineY = cardY + 30;
  if (paymentMethod) {
    doc.setTextColor(...BODY);
    doc.setFontSize(8);
    doc.text(paymentMethod.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), cardX + 6, cardLineY);
    cardLineY += 5;
  }
  if (transactionId && cardLineY < cardY + cardH - 2) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text(`Ref: ${transactionId}`, cardX + 6, cardLineY);
  }

  // ── Amenities Detail Table (if present) ─────────────────────────────────
  // The card can hang below the table when the breakdown is only one or two rows, so the
  // flow continues from whichever ends lower. Previously everything below chained off
  // doc.lastAutoTable.finalY alone and would have collided with the card.
  let flowY = Math.max(breakdownEndY, cardY + cardH);

  const filledAmenities = amenities.filter(a => a.name && parseFloat(a.charge) > 0);
  if (filledAmenities.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('Service charges detail', 14, flowY + 12);

    const amenStartY = flowY + 16;
    const pagesAtAmenities = doc.internal.getNumberOfPages();
    autoTable(doc, {
      startY: amenStartY,
      margin: { left: 14, right: 14 },
      tableWidth: 182,
      head: [['SERVICE', 'CHARGE']],
      body: filledAmenities.map(a => [a.name, `BDT ${formatMoney(a.charge)}`]),
      theme: 'plain',
      headStyles: {
        fillColor: false, textColor: MUTED, fontSize: 6.8, fontStyle: 'bold',
        lineColor: LINE, lineWidth: { bottom: 0.4 },
        cellPadding: { top: 3.5, bottom: 2.5, left: 5, right: 5 },
      },
      bodyStyles: {
        textColor: BODY, fontSize: 9,
        lineColor: LINE, lineWidth: { bottom: 0.2 },
        cellPadding: { top: 3.2, bottom: 3.2, left: 5, right: 5 },
      },
      columnStyles: { 1: { halign: 'right', textColor: INK } },
    });

    if (doc.internal.getNumberOfPages() === pagesAtAmenities) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.25);
      doc.roundedRect(14, amenStartY - 1, 182, (doc.lastAutoTable.finalY - amenStartY) + 2, RADIUS, RADIUS, 'S');
    }
    flowY = doc.lastAutoTable.finalY;
  }

  // ── Note / Notice ────────────────────────────────────────────────────────
  if (note && note.trim()) {
    const NOTE_TEXT_W = 174; // 182mm box less 4mm padding each side

    // Bengali cannot go through doc.text(): jsPDF's built-in fonts are Latin-1, so an owner
    // writing a note in Bangla got a row of replacement boxes on the tenant's receipt.
    // Latin notes keep the normal path so they stay selectable text in the PDF.
    const noteImage = hasComplexScript(note)
      ? await renderTextToImage(note, { widthMm: NOTE_TEXT_W, fontPt: 9, color: '#3c3c3c' })
      : null;

    // Measure BEFORE drawing, so the block can be moved to a new page as a unit.
    //
    // autoTable page-breaks its own tables, but this panel is drawn by hand and had no such
    // check — with enough service charges above it, the note ran straight through the footer
    // rule and off the bottom of the page.
    const noteLines = noteImage ? null : doc.splitTextToSize(note.trim(), NOTE_TEXT_W);
    const noteBoxH = noteImage ? noteImage.heightMm + 9 : noteLines.length * 5 + 9;

    const FOOTER_TOP = 278;  // the rule sits at 284; leave it clear
    let noteY = flowY + 12;
    if (noteY + 3 + noteBoxH > FOOTER_TOP) {
      doc.addPage();
      noteY = 24;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text('Note', 14, noteY);

    panel(doc, 14, noteY + 3, 182, noteBoxH, { fill: PANEL, border: LINE });

    if (noteImage) {
      doc.addImage(noteImage.dataUrl, 'PNG', 18, noteY + 7.5, noteImage.widthMm, noteImage.heightMm);
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BODY);
      doc.text(noteLines, 18, noteY + 10);
    }
    flowY = noteY + 3 + noteBoxH;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Computer-generated receipt — no signature required`
      + `   ·   Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
      + `   ·   Page ${i} of ${pageCount}`,
      105,
      288,
      { align: 'center' }
    );
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(14, 284, 196, 284);
  }

  return doc.output('datauristring').split(',')[1];
}
