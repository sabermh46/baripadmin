import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGetProfitReportQuery } from '../../store/api/reportApi';
import { useGetHousesQuery } from '../../store/api/houseApi';
import { useAuth } from '../../hooks';
import Table from '../../components/common/Table';
import Btn from '../../components/common/Button';
import {
  FileText, Calculator, User, Loader2, ChevronDown, Check, Building2,
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Download, Info,
} from 'lucide-react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';

import appLogo from '../../assets/icons/logo.svg';
import useOwnerOptions from '../../hooks/useOwnerOptions';

const BRAND_HEX = '#f9873c';
const BRAND_RGB = [249, 135, 60];

/**
 * Always en-US, never the ambient locale.
 *
 * This used to be toLocaleString(undefined, …). Under a Bengali locale that renders
 * Bengali digits (১২,৩৪৫), which the PDF's helvetica cannot draw — the export came out as
 * boxes. The screen and the PDF now share one formatter so they can never disagree either.
 */
const fmt = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtMonth = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
};

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Presets are computed from today, never written down.
 *
 * The page previously opened on a hardcoded 2026-01-01 → 2026-12-31. That is not a default,
 * it is a date that stops being true, and every report generated in another year silently
 * covered the wrong period.
 */
const buildPresets = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    this_month: { label: 'This month', start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) },
    last_month: { label: 'Last month', start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) },
    last_6: { label: 'Last 6 months', start: iso(new Date(y, m - 5, 1)), end: iso(new Date(y, m + 1, 0)) },
    ytd: { label: 'Year to date', start: iso(new Date(y, 0, 1)), end: iso(new Date(y, m + 1, 0)) },
    last_year: { label: `Last year (${y - 1})`, start: iso(new Date(y - 1, 0, 1)), end: iso(new Date(y - 1, 11, 31)) },
  };
};

export const ReportGenPage = () => {
  const { user, isHouseOwner, isCaretaker, isStaff, isWebOwner, isDeveloper } = useAuth();

  const presets = useMemo(() => buildPresets(), []);

  const [preset, setPreset] = useState('ytd');
  const [filters, setFilters] = useState(() => ({
    ownerId: '',
    houseId: '',
    startDate: presets.ytd.start,
    endDate: presets.ytd.end,
  }));

  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);

  /**
   * Who gets the owner picker.
   *
   * Caretakers were in this list and should never have been — a caretaker is scoped to the
   * houses assigned to them, so offering a directory of every house owner on the platform
   * showed them names they have no relationship with and produced a 403 on selection.
   * Developers were missing, which was worse: with no picker and no owner of their own, the
   * page could never resolve a house and the report never loaded at all for them.
   */
  const canSeeAllOwners = isWebOwner || isDeveloper || isStaff;

  const { owners: ownersList = [], isLoading: ownersLoading } = useOwnerOptions({
    search: ownerSearch,
    skip: !canSeeAllOwners,
  });

  const effectiveOwnerId = isHouseOwner ? (user?.id ?? '') : filters.ownerId;
  const effectiveOwner = isHouseOwner ? user : selectedOwner;

  /**
   * Houses are already role-scoped by the server (HouseController::scopeToAccessibleHouses),
   * so this runs for every role with `ownerId` as an optional narrowing filter rather than a
   * precondition. That is what lets a caretaker — who has no single owner — populate the
   * property list at all.
   */
  const { data: housesResponse, isFetching: housesLoading } = useGetHousesQuery({
    ownerId: effectiveOwnerId || undefined,
    limit: 100,
  });
  // Memoised: `?? []` allocates a new array each render, which would make every
  // downstream useMemo that depends on it re-run on every render.
  const houses = useMemo(() => housesResponse?.data ?? [], [housesResponse]);

  // "" means every accessible house, which the API now supports. No implicit first-house
  // default: silently reporting on one of an owner's properties while the heading said
  // nothing about which is how a portfolio gets mistaken for a single building.
  const { data, isLoading, isFetching, isError, error, refetch } = useGetProfitReportQuery({
    houseId: filters.houseId || undefined,
    ownerId: !filters.houseId && effectiveOwnerId ? effectiveOwnerId : undefined,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const report = data?.data;
  const totals = report?.totals;
  const rows = report?.monthly_breakdown || [];
  const byHouse = useMemo(() => report?.by_house ?? [], [report]);
  const categories = report?.expenses_by_category || [];

  const scopeLabel = useMemo(() => {
    if (filters.houseId) {
      return houses.find((h) => String(h.id) === String(filters.houseId))?.name || 'Property';
    }
    // Named from the houses list rather than from by_house: the API stops computing a
    // per-house breakdown when only one house is in scope (it would just restate the
    // totals), so there is no row to read the name off.
    if (report?.house_count === 1 && houses.length === 1) return houses[0].name;
    return `All properties${report?.house_count ? ` (${report.house_count})` : ''}`;
  }, [filters.houseId, houses, report?.house_count]);

  const ownerLabel = effectiveOwner?.name || (canSeeAllOwners ? 'All owners' : user?.name) || '—';
  const periodLabel = report?.period
    ? `${fmtMonth(report.period.start_month)} – ${fmtMonth(report.period.end_month)}`
    : '—';

  const applyPreset = useCallback((key) => {
    setPreset(key);
    if (key === 'custom') return;
    const p = presets[key];
    if (p) setFilters((prev) => ({ ...prev, startDate: p.start, endDate: p.end }));
  }, [presets]);

  const setDate = (field) => (e) => {
    setPreset('custom');
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ── Exports ────────────────────────────────────────────────────────────────
  const getLogoBase64 = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  const handleExportPDF = async () => {
    if (!report) return;
    const doc = new jsPDF();

    const logo = await getLogoBase64(appLogo);
    if (logo) doc.addImage(logo, 'PNG', 20, 14, 12, 12);
    else {
      doc.setFillColor(...BRAND_RGB);
      doc.circle(26, 20, 6, 'F');
    }

    doc.setTextColor(0, 0, 0).setFontSize(16).setFont('helvetica', 'bold');
    doc.text('Bari Porichalona', 36, 20);
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(120);
    doc.text('Smart Property Management Platform', 36, 25);

    doc.setTextColor(0, 0, 0).setFontSize(13).setFont('helvetica', 'bold');
    doc.text('FINANCIAL REPORT', 190, 19, { align: 'right' });
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(90);
    doc.text(periodLabel, 190, 25, { align: 'right' });

    doc.setDrawColor(...BRAND_RGB).setLineWidth(0.6);
    doc.line(20, 31, 190, 31);

    // This block used to print the HOUSE name under a "HOUSE OWNER:" label, so every
    // exported report attributed a property to itself and named no person at all.
    doc.setTextColor(0, 0, 0).setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OWNER', 20, 40);
    doc.text('SCOPE', 80, 40);
    doc.text('GENERATED', 150, 40);
    doc.setFont('helvetica', 'normal').setTextColor(70);
    doc.text(String(ownerLabel), 20, 45, { maxWidth: 55 });
    if (effectiveOwner?.email) doc.text(String(effectiveOwner.email), 20, 50, { maxWidth: 55 });
    doc.text(String(scopeLabel), 80, 45, { maxWidth: 65 });
    doc.text(new Date().toLocaleDateString('en-US'), 150, 45);

    doc.setTextColor(...BRAND_RGB).setFontSize(11).setFont('helvetica', 'bold');
    doc.text('Summary', 20, 62);

    autoTable(doc, {
      startY: 66,
      margin: { left: 20, right: 20 },
      head: [['', 'Amount (BDT)']],
      body: [
        ['Rent collected', fmt(totals.rent_collected)],
        ['Advance received', fmt(totals.advance_received)],
        ['Less: advance applied to rent', `(${fmt(totals.advance_applied)})`],
        ['Total income', fmt(totals.total_income)],
        ['Expenses', `(${fmt(totals.expenses)})`],
        ['NET PROFIT', fmt(totals.net_profit)],
        ['Rent outstanding (unpaid)', fmt(totals.rent_outstanding)],
      ],
      theme: 'plain',
      headStyles: { fillColor: BRAND_RGB, textColor: 255, halign: 'left', fontSize: 9 },
      columnStyles: { 0: { cellWidth: 110 }, 1: { halign: 'right' } },
      styles: { fontSize: 9, cellPadding: 2.5 },
      didParseCell: (d) => {
        if (d.section !== 'body') return;
        const label = d.row.raw[0];
        if (label === 'NET PROFIT' || label === 'Total income') {
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.fillColor = [255, 245, 236];
        }
        if (label === 'Less: advance applied to rent') d.cell.styles.textColor = [130, 130, 130];
      },
    });

    // The note the whole rewrite exists for. Anyone re-adding the two figures by hand will
    // get a bigger number than the report shows, so the report says why.
    let y = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(7.5).setFont('helvetica', 'italic').setTextColor(120);
    doc.text(
      'Advance already spent on rent is shown inside "Rent collected" and deducted above, so it is counted once, not twice.',
      20, y, { maxWidth: 170 },
    );

    y += 10;
    doc.setTextColor(...BRAND_RGB).setFontSize(11).setFont('helvetica', 'bold');
    doc.text('Monthly breakdown', 20, y);

    autoTable(doc, {
      startY: y + 4,
      margin: { left: 20, right: 20 },
      head: [['Month', 'Rent', 'Adv. net', 'Income', 'Expenses', 'Net profit']],
      body: rows.map((r) => [
        fmtMonth(r.month), fmt(r.rent_collected), fmt(r.advance_net),
        fmt(r.total_income), fmt(r.expenses), fmt(r.net_profit),
      ]),
      foot: [[
        'Total', fmt(totals.rent_collected), fmt(totals.advance_net),
        fmt(totals.total_income), fmt(totals.expenses), fmt(totals.net_profit),
      ]],
      theme: 'striped',
      headStyles: { fillColor: BRAND_RGB, halign: 'right', fontSize: 8.5 },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'right', fontSize: 8.5 },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [255, 248, 242] },
      styles: { fontSize: 8.5, cellPadding: 3, halign: 'right' },
      didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; },
    });

    if (byHouse.length > 1) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        margin: { left: 20, right: 20 },
        head: [['Property', 'Income', 'Expenses', 'Net profit', 'Outstanding']],
        body: byHouse.map((h) => [
          h.house_name, fmt(h.total_income), fmt(h.expenses), fmt(h.net_profit), fmt(h.rent_outstanding),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [70, 70, 70], halign: 'right', fontSize: 8.5 },
        columnStyles: { 0: { halign: 'left' } },
        styles: { fontSize: 8.5, cellPadding: 3, halign: 'right' },
        didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; },
      });
    }

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5).setFont('helvetica', 'normal').setTextColor(150);
      doc.text(`${ownerLabel} — ${scopeLabel} — ${periodLabel}`, 20, 288);
      doc.text(`Page ${i} of ${pages}`, 190, 288, { align: 'right' });
    }

    doc.save(`Financial_Report_${String(scopeLabel).replace(/[^\w]+/g, '_')}_${report.period.start_month}_${report.period.end_month}.pdf`);
  };

  const handleExportCSV = () => {
    if (!report) return;
    const head = ['Month', 'Rent charged', 'Rent collected', 'Rent outstanding', 'Advance received',
      'Advance applied', 'Advance net', 'Total income', 'Expenses', 'Net profit'];
    const line = (a) => a.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    const body = rows.map((r) => line([
      r.month, r.rent_charged, r.rent_collected, r.rent_outstanding, r.advance_received,
      r.advance_applied, r.advance_net, r.total_income, r.expenses, r.net_profit,
    ]));
    const foot = line(['TOTAL', totals.rent_charged, totals.rent_collected, totals.rent_outstanding,
      totals.advance_received, totals.advance_applied, totals.advance_net,
      totals.total_income, totals.expenses, totals.net_profit]);

    const csv = [line(head), ...body, foot].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${report.period.start_month}_${report.period.end_month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const monthColumns = [
    { title: 'Month', dataIndex: 'month', render: (r) => <span className="font-medium">{fmtMonth(r.month)}</span> },
    { title: 'Rent collected', dataIndex: 'rent_collected', className: 'text-right', render: (r) => <span className="tabular-nums">{fmt(r.rent_collected)}</span> },
    {
      title: 'Advance (net)', dataIndex: 'advance_net', className: 'text-right',
      render: (r) => (
        <span className={`tabular-nums ${r.advance_net < 0 ? 'text-amber-600' : ''}`} title={r.advance_applied > 0 ? `৳${fmt(r.advance_received)} received − ৳${fmt(r.advance_applied)} applied to rent` : undefined}>
          {fmt(r.advance_net)}
        </span>
      ),
    },
    { title: 'Total income', dataIndex: 'total_income', className: 'text-right', render: (r) => <span className="tabular-nums font-semibold">{fmt(r.total_income)}</span> },
    { title: 'Expenses', dataIndex: 'expenses', className: 'text-right', render: (r) => <span className="tabular-nums text-red-500">{fmt(r.expenses)}</span> },
    { title: 'Outstanding', dataIndex: 'rent_outstanding', className: 'text-right', render: (r) => <span className={`tabular-nums ${r.rent_outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{fmt(r.rent_outstanding)}</span> },
    { title: 'Net profit', dataIndex: 'net_profit', className: 'text-right', render: (r) => <span className={`tabular-nums font-bold ${r.net_profit < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(r.net_profit)}</span> },
  ];

  const houseColumns = [
    { title: 'Property', dataIndex: 'house_name', render: (r) => <span className="font-medium">{r.house_name}</span> },
    { title: 'Income', dataIndex: 'total_income', className: 'text-right', render: (r) => <span className="tabular-nums">{fmt(r.total_income)}</span> },
    { title: 'Expenses', dataIndex: 'expenses', className: 'text-right', render: (r) => <span className="tabular-nums text-red-500">{fmt(r.expenses)}</span> },
    { title: 'Outstanding', dataIndex: 'rent_outstanding', className: 'text-right', render: (r) => <span className={`tabular-nums ${r.rent_outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{fmt(r.rent_outstanding)}</span> },
    { title: 'Net profit', dataIndex: 'net_profit', className: 'text-right', render: (r) => <span className={`tabular-nums font-bold ${r.net_profit < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(r.net_profit)}</span> },
  ];

  const hasRows = rows.length > 0;

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="" className="w-11 h-11" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calculator style={{ color: BRAND_HEX }} size={22} /> Financial Report
            </h1>
            <p className="text-xs text-gray-500">
              {ownerLabel} · {scopeLabel} · {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={handleExportCSV} disabled={!hasRows} className="flex gap-2 !px-4">
            <Download size={16} /> CSV
          </Btn>
          <Btn onClick={handleExportPDF} disabled={!hasRows} className="flex gap-2 !px-4 bg-gray-900 hover:bg-black text-white">
            <FileText size={16} /> PDF
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {canSeeAllOwners && (
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">House owner</label>
              <Combobox
                value={effectiveOwner}
                onChange={(owner) => {
                  setSelectedOwner(owner);
                  setFilters((prev) => ({ ...prev, ownerId: owner?.id || '', houseId: '' }));
                }}
              >
                <div className="relative">
                  <ComboboxInput
                    className="w-full p-2.5 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-200 text-sm"
                    placeholder="All owners"
                    displayValue={(o) => o?.name || ''}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                  />
                  <ComboboxButton className="absolute right-2 top-2.5">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </ComboboxButton>
                  <ComboboxOptions className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
                    <ComboboxOption value={null} className={({ active }) => `px-4 py-2 text-sm cursor-pointer ${active ? 'bg-orange-50 text-orange-700' : 'text-gray-600'}`}>
                      All owners
                    </ComboboxOption>
                    {ownersLoading ? (
                      <div className="px-4 py-3 text-center"><Loader2 className="animate-spin h-4 w-4 mx-auto text-gray-400" /></div>
                    ) : ownersList.length === 0 ? (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">No owners found</div>
                    ) : (
                      ownersList.map((o) => (
                        <ComboboxOption key={o.id} value={o} className={({ active }) => `px-4 py-2 text-sm cursor-pointer ${active ? 'bg-orange-50 text-orange-700' : 'text-gray-900'}`}>
                          {({ selected }) => (
                            <div className="flex justify-between items-center">
                              <span className={selected ? 'font-bold' : ''}>{o.name}</span>
                              {selected && <Check className="h-4 w-4" />}
                            </div>
                          )}
                        </ComboboxOption>
                      ))
                    )}
                  </ComboboxOptions>
                </div>
              </Combobox>
            </div>
          )}

          {!canSeeAllOwners && (
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                {isCaretaker ? 'Caretaker' : 'House owner'}
              </label>
              <div className="p-2.5 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 border border-gray-100 flex items-center gap-2 truncate">
                <User size={14} className="text-orange-500 shrink-0" /> {user?.name}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Property</label>
            <div className="relative">
              <select
                className="w-full p-2.5 bg-gray-100 rounded-lg outline-none appearance-none text-sm disabled:opacity-50"
                value={filters.houseId}
                disabled={housesLoading}
                onChange={(e) => setFilters((prev) => ({ ...prev, houseId: e.target.value }))}
              >
                <option value="">All properties{houses.length ? ` (${houses.length})` : ''}</option>
                {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {housesLoading
                ? <Loader2 className="absolute right-3 top-3 animate-spin text-gray-400" size={16} />
                : <ChevronDown className="absolute right-2.5 top-3 text-gray-400" size={16} />}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Period</label>
            <div className="relative">
              <select
                className="w-full p-2.5 bg-gray-100 rounded-lg outline-none appearance-none text-sm"
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
              >
                {Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                <option value="custom">Custom</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 text-gray-400" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">From</label>
            <input type="date" className="w-full p-2.5 bg-gray-100 rounded-lg outline-none text-sm" value={filters.startDate} onChange={setDate('startDate')} />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">To</label>
            <input type="date" className="w-full p-2.5 bg-gray-100 rounded-lg outline-none text-sm" value={filters.endDate} onChange={setDate('endDate')} />
          </div>
        </div>

        {/* Reports are month-granular by necessity — a partial payment has money but no
            paid_date — so say so rather than implying day precision the data cannot honour. */}
        <p className="mt-3 text-[11px] text-gray-400 flex items-center gap-1.5">
          <Info size={12} className="shrink-0" />
          Whole calendar months are always included, so rent, advances and expenses cover the same period.
          {report?.period && ` Reporting ${periodLabel}.`}
        </p>
      </div>

      {/* States */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-semibold text-red-900">Could not load the report</p>
            <p className="text-red-700 mt-0.5">
              {String(error?.data?.message || error?.message || 'Please try again.').split('||')[0]}
            </p>
            <button onClick={refetch} className="mt-2 text-red-700 underline font-medium">Retry</button>
          </div>
        </div>
      )}

      {!isError && isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      )}

      {!isError && !isLoading && report && !hasRows && (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <Building2 className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="font-semibold text-gray-700">Nothing recorded for this period</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            No rent, advances or approved expenses fall within {periodLabel}
            {report.house_count === 0
              ? '. You do not currently have access to any property.'
              : ` for ${scopeLabel}.`}
          </p>
        </div>
      )}

      {/* Results */}
      {!isError && !isLoading && hasRows && (
        <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total income" value={totals.total_income} icon={TrendingUp} tone="neutral" />
            <StatCard label="Expenses" value={totals.expenses} icon={TrendingDown} tone="expense" />
            <StatCard
              label="Net profit" value={totals.net_profit} icon={Wallet}
              tone={totals.net_profit < 0 ? 'expense' : 'profit'}
              sub={`${totals.margin_pct}% margin`}
            />
            <StatCard
              label="Rent outstanding" value={totals.rent_outstanding} icon={AlertTriangle}
              tone={totals.rent_outstanding > 0 ? 'warn' : 'muted'}
              sub={`${totals.invoice_count} invoice${totals.invoice_count === 1 ? '' : 's'}`}
            />
          </div>

          {/* The reconciliation. This is the whole point of the rewrite: it shows the two
              income lines and the deduction that keeps advance money from being counted
              twice, so the total can be checked by eye. */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5">
            <h3 className="font-bold text-gray-700 text-sm mb-3">How total income is made up</h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
              <Term label="Rent collected" value={totals.rent_collected} />
              <Op>+</Op>
              <Term label="Advance received" value={totals.advance_received} />
              <Op>−</Op>
              <Term label="Advance applied to rent" value={totals.advance_applied} muted />
              <Op>=</Op>
              <Term label="Total income" value={totals.total_income} strong />
            </div>
            {totals.advance_applied > 0 && (
              <p className="mt-3 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                ৳{fmt(totals.advance_applied)} of advance was used to settle rent in this period. That money
                is already inside <span className="font-medium">Rent collected</span>, so it is deducted here
                to avoid counting it twice — the renter only handed it over once. Cash rent excluding advance
                was <span className="font-medium">৳{fmt(totals.rent_cash)}</span>.
              </p>
            )}
          </div>

          <Section title="Monthly breakdown">
            <Table columns={monthColumns} data={rows} hoverable className="mt-0" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
              <Total label="Rent" value={totals.rent_collected} />
              <Total label="Income" value={totals.total_income} />
              <Total label="Expenses" value={totals.expenses} tone="text-red-600" />
              <Total label="Net profit" value={totals.net_profit} tone={totals.net_profit < 0 ? 'text-red-600' : 'text-green-600'} />
            </div>
          </Section>

          {byHouse.length > 1 && (
            <Section title={`By property (${byHouse.length})`}>
              <Table columns={houseColumns} data={byHouse} rowKey="house_id" hoverable className="mt-0" />
            </Section>
          )}

          {categories.length > 0 && (
            <Section title="Expenses by category">
              <div className="p-4 space-y-2">
                {categories.map((c) => {
                  const pct = totals.expenses > 0 ? (c.total / totals.expenses) * 100 : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm capitalize text-gray-700">{c.category}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1.5)}%`, backgroundColor: BRAND_HEX }} />
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs text-gray-400 tabular-nums">{pct.toFixed(0)}%</span>
                      <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">৳{fmt(c.total)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-4 md:px-5 py-3 border-b border-gray-100">
      <h3 className="font-bold text-gray-700 text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const TONES = {
  neutral: 'text-gray-900',
  expense: 'text-red-500',
  profit: 'text-green-600',
  warn: 'text-amber-600',
  muted: 'text-gray-400',
};

const StatCard = ({ label, value, icon: Icon, tone = 'neutral', sub }) => (
  <div className="bg-white p-3 lg:p-4 rounded-xl border border-gray-100 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      {Icon && <Icon size={15} className={TONES[tone]} />}
    </div>
    <p className={`text-lg lg:text-2xl font-bold mt-1 tabular-nums ${TONES[tone]}`}>৳{fmt(value)}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const Term = ({ label, value, strong, muted }) => (
  <div className={`px-3 py-2 rounded-lg ${strong ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
    <p className={`tabular-nums ${strong ? 'font-bold text-gray-900' : muted ? 'text-gray-500' : 'text-gray-800'}`}>
      ৳{fmt(value)}
    </p>
  </div>
);

const Op = ({ children }) => <span className="text-gray-400 font-semibold px-0.5">{children}</span>;

const Total = ({ label, value, tone = 'text-gray-900' }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
    <p className={`font-bold tabular-nums ${tone}`}>৳{fmt(value)}</p>
  </div>
);

export default ReportGenPage;
