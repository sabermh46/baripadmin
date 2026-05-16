import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import appLogo from '../assets/icons/logo.svg';

const BRAND = [249, 135, 60]; // orange

function loadLogoBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
  });
}

function formatMoney(val) {
  return parseFloat(val || 0).toLocaleString(undefined, {
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
  } catch (_) {}
  return rawMonth;
}

/**
 * Generate a styled rent receipt PDF.
 *
 * @param {object} data
 * @param {string} data.renterName
 * @param {string} data.houseName
 * @param {string} [data.houseAddress]
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

  const doc = new jsPDF();

  // ── Header ──────────────────────────────────────────────────────────────
  try {
    const logoData = await loadLogoBase64(appLogo);
    if (logoData) doc.addImage(logoData, 'PNG', 14, 10, 12, 12);
  } catch (_) {
    doc.setFillColor(...BRAND);
    doc.circle(20, 16, 6, 'F');
  }

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bari Porichalona', 30, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Smart Property Management Platform', 30, 22);

  // Title block (right-aligned)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RENT RECEIPT', 196, 14, { align: 'right' });

  if (paymentId) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Receipt #${paymentId}`, 196, 19, { align: 'right' });
  }

  const dateStr = paymentDate
    ? new Date(paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`Date: ${dateStr}`, 196, 24, { align: 'right' });

  // Orange divider
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(14, 28, 196, 28);

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
    (ownerEmail ? 1 : 0) +
    (ownerPhone ? 1 : 0);
  // 7 title + 7 first-line gap + remaining lines at 7px each + 4 bottom padding
  const BOX_H = Math.max(38, 7 + 7 + (rightLineCount * 7) + 4);

  // Left box: Renter details
  doc.setFillColor(255, 248, 242);
  doc.roundedRect(14, boxY, 86, BOX_H, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('RENTER DETAILS', 18, boxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  doc.setFontSize(9);
  doc.text(renterName, 18, boxY + 14);

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`Flat: ${flatNumber}`, 18, boxY + 21);
  if (transactionId) {
    doc.text(`Txn: ${transactionId}`, 18, boxY + 27);
  }
  if (paymentMethod) {
    doc.text(`Method: ${paymentMethod.replace(/_/g, ' ')}`, 18, boxY + (transactionId ? 33 : 27));
  }

  // Right box: Property details
  doc.setFillColor(255, 248, 242);
  doc.roundedRect(104, boxY, 92, BOX_H, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('PROPERTY DETAILS', 108, boxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40);
  doc.setFontSize(9);
  doc.text(houseName, 108, boxY + 14);

  doc.setFontSize(8);
  doc.setTextColor(80);
  let rY = boxY + 21;
  if (forMonth) {
    doc.text(`For Month: ${formatMonth(forMonth)}`, 108, rY);
    rY += 7;
  }
  if (addrLines.length > 0) {
    addrLines.forEach(line => {
      doc.text(line, 108, rY);
      rY += 7;
    });
  }
  if (ownerEmail) {
    doc.setFontSize(7.5);
    doc.text(`Email: ${ownerEmail}`, 108, rY);
    doc.setFontSize(8);
    rY += 7;
  }
  if (ownerPhone) {
    doc.text(`Phone: ${ownerPhone}`, 108, rY);
  }

  // ── Payment Breakdown Table ──────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('Payment Breakdown', 14, boxY + BOX_H + 10);

  const breakdownRows = [
    ['Base Rent', `BDT ${formatMoney(baseRent)}`],
  ];
  if (amenitiesTotal > 0) {
    breakdownRows.push(['Service Charges', `BDT ${formatMoney(amenitiesTotal)}`]);
  }
  if (lateFee > 0) {
    breakdownRows.push(['Late Fee', `BDT ${formatMoney(lateFee)}`]);
  }

  autoTable(doc, {
    startY: boxY + BOX_H + 14,
    margin: { left: 14, right: 14 },
    tableWidth: 100,
    head: [['Description', 'Amount']],
    body: breakdownRows,
    foot: [['TOTAL PAID', `BDT ${formatMoney(totalAmount)}`]],
    theme: 'striped',
    headStyles: { fillColor: BRAND, halign: 'left', fontSize: 9 },
    footStyles: { fillColor: [249, 135, 60], textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    alternateRowStyles: { fillColor: [255, 248, 242] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // ── Amenities Detail Table (if present) ─────────────────────────────────
  const filledAmenities = amenities.filter(a => a.name && parseFloat(a.charge) > 0);
  if (filledAmenities.length > 0) {
    const prevY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('Service Charges Detail', 14, prevY + 12);

    autoTable(doc, {
      startY: prevY + 16,
      margin: { left: 14, right: 14 },
      tableWidth: 100,
      head: [['Service', 'Charge']],
      body: filledAmenities.map(a => [a.name, `BDT ${formatMoney(a.charge)}`]),
      theme: 'striped',
      headStyles: { fillColor: [100, 100, 100], halign: 'left', fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // ── Note / Notice ────────────────────────────────────────────────────────
  if (note && note.trim()) {
    const noteY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : boxY + 110;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('Note', 14, noteY);

    doc.setFillColor(255, 248, 242);
    const noteLines = doc.splitTextToSize(note.trim(), 172);
    const noteBoxH = noteLines.length * 5 + 8;
    doc.roundedRect(14, noteY + 3, 182, noteBoxH, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(noteLines, 18, noteY + 9);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount} | Bari Porichalona`,
      105,
      288,
      { align: 'center' }
    );
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(14, 284, 196, 284);
  }

  return doc.output('datauristring').split(',')[1];
}
