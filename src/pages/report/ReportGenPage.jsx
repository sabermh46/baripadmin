import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { useGetProfitReportQuery } from '../../store/api/reportApi';
import { useGetHousesQuery, useGetManagedOwnersQuery } from '../../store/api/houseApi'; 
import { useAuth } from '../../hooks';
import Table from '../../components/common/Table';
import Btn from '../../components/common/Button';
import { FileText, Calculator, User } from 'lucide-react';

import appLogo from '../../assets/icons/logo.svg';

export const ReportGenPage = () => {
    const { user, isHouseOwner, isCaretaker, isStaff, isWebOwner } = useAuth();
    
    // 1. STATE FOR FILTERS
    const [filters, setFilters] = useState({
        ownerId: '', // Added to support multiple owners for staff/admins
        houseId: '',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
    });

    // 2. FETCH OWNERS (For Admin/Staff roles)
    const canSeeAllOwners = isStaff || isWebOwner || isCaretaker;
    const { data: managedOwnersResponse } = useGetManagedOwnersQuery(
        { search: "", limit: 50, page: 1 }, 
        { skip: !canSeeAllOwners }
    );
    
    const ownersList = managedOwnersResponse?.data || [];

    // Set default owner if current user is a House Owner
    useEffect(() => {
        if (isHouseOwner && user?.id) {
            setFilters(prev => ({ ...prev, ownerId: user.id }));
        }
    }, [isHouseOwner, user]);

    // 3. FETCH HOUSES based on selected Owner
    const { data: housesResponse } = useGetHousesQuery(
        { ownerId: filters.ownerId }, 
        { skip: !filters.ownerId }
    );
    const houses = housesResponse?.data || [];

    // 4. FETCH REPORT DATA
    const { data, isLoading, refetch } = useGetProfitReportQuery({
        houseId: filters.houseId,
        startDate: filters.startDate,
        endDate: filters.endDate
    }, { skip: !filters.houseId });

    const reportData = data?.data;

    // 5. HELPER DATA FOR PDF/UI
    const currentOwnerInfo = useMemo(() => {
        if (isHouseOwner) return user;
        return ownersList.find(o => o.id == filters.ownerId);
    }, [isHouseOwner, user, ownersList, filters.ownerId]);

    const selectedHouseName = houses.find(h => h.id == filters.houseId)?.name || 'Property';

    const primaryColorRGB = [249, 135, 60]; 
    const primaryColorHex = '#f9873c';

    const formatCurrency = (val) => {
        return parseFloat(val || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = 'Anonymous'; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
        });
    };

    const handleExportPDF = async () => {
        if (!reportData) return;

        const doc = new jsPDF();
        
        // --- 1. HEADER & LOGO ---
        try {
            const logoData = await getLogoBase64(appLogo);
            if (logoData) doc.addImage(logoData, 'PNG', 20, 15, 12, 12);
        } catch (e) {
            doc.setFillColor(...primaryColorRGB);
            doc.circle(26, 21, 6, 'F');
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Bari Porichalona", 36, 21);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Smart Property Management Platform", 36, 26);

        // --- OWNER INFO (New Section) ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("HOUSE OWNER:", 20, 45);
        doc.setFont("helvetica", "normal");
        doc.text(`${currentOwnerInfo?.name || 'N/A'}`, 55, 45);
        doc.text(`Email: ${currentOwnerInfo?.email || 'N/A'}`, 55, 50);

        // --- REPORT METADATA ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FINANCIAL PROFIT REPORT", 130, 20);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Property: ${selectedHouseName}`, 130, 26);
        doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 130, 31);

        doc.setDrawColor(...primaryColorRGB);
        doc.line(20, 36, 190, 36);

        // --- 2. EXECUTIVE SUMMARY ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColorRGB);
        doc.text("Executive Summary", 20, 65);
        
        autoTable(doc, {
            startY: 70,
            margin: { left: 20 },
            tableWidth: 90,
            head: [['Description', 'Amount (BDT)']],
            body: [
                ['Total Rent Income', formatCurrency(reportData.totals.rent_income)],
                ['Total Advance Income', formatCurrency(reportData.totals.advance_income)],
                ['Total Expenses', formatCurrency(reportData.totals.expenses)],
                ['Net Profit', formatCurrency(reportData.totals.profit)],
            ],
            theme: 'striped',
            headStyles: { fillColor: primaryColorRGB, halign: 'left' },
            columnStyles: { 1: { halign: 'right' } },
            styles: { fontSize: 9, font: 'helvetica' }
        });

        // --- 3. MONTHLY BREAKDOWN ---
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColorRGB);
        doc.text("Monthly Breakdown", 20, finalY + 15);

        const tableRows = reportData.monthly_breakdown.map(row => [
            row.month,
            formatCurrency(row.rent_income),
            formatCurrency(row.advance_income),
            formatCurrency(row.expenses),
            formatCurrency(row.profit)
        ]);

        autoTable(doc, {
            startY: finalY + 20,
            margin: { left: 20, right: 20 },
            head: [['Month', 'Rent', 'Advance', 'Expenses', 'Net Profit']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: primaryColorRGB, halign: 'center' },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
            },
            didParseCell: function (data) {
                if (data.section === 'head' && data.column.index > 0) {
                    data.cell.styles.halign = 'right';
                }
            },
            alternateRowStyles: { fillColor: [255, 248, 242] },
            styles: { fontSize: 9, cellPadding: 4 }
        });

        // --- 4. FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`Profit_Report_${selectedHouseName.replace(/\s+/g, '_')}.pdf`);
    };

    const columns = [
        { 
            title: 'Month', 
            dataIndex: 'month', 
            render: (row) => new Date(row.month + "-02").toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
        },
        { title: 'Rent', dataIndex: 'rent_income', className: 'text-right', render: (row) => formatCurrency(row.rent_income) },
        { title: 'Advance', dataIndex: 'advance_income', className: 'text-right', render: (row) => formatCurrency(row.advance_income) },
        { title: 'Expenses', dataIndex: 'expenses', className: 'text-right', cellClassName: 'text-red-500', render: (row) => formatCurrency(row.expenses) },
        { title: 'Net Profit', dataIndex: 'profit', className: 'text-right', cellClassName: 'font-bold text-green-600', render: (row) => formatCurrency(row.profit) },
    ];

    return (
        <div className=" min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <img src={appLogo} alt="Logo" className="w-12 h-12" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Calculator style={{ color: primaryColorHex }} /> Financial Reports
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Bari Porichalona Platform</p>
                    </div>
                </div>
                {reportData && (
                    <Btn onClick={handleExportPDF} className="flex gap-2 bg-gray-900 hover:bg-black transition-all">
                        <FileText size={18} /> Download PDF
                    </Btn>
                )}
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    {/* Role-based Owner Selection */}
                    {canSeeAllOwners && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">House Owner</label>
                            <select 
                                className="w-full p-2.5 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-orange-200"
                                value={filters.ownerId}
                                onChange={(e) => setFilters(prev => ({ ...prev, ownerId: e.target.value, houseId: '' }))}
                            >
                                <option value="">Select Owner</option>
                                {ownersList.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Property</label>
                        <select 
                            className="w-full p-2.5 bg-gray-100 rounded-lg outline-none disabled:opacity-50"
                            disabled={!filters.ownerId}
                            value={filters.houseId}
                            onChange={(e) => setFilters(prev => ({ ...prev, houseId: e.target.value }))}
                        >
                            <option value="">Select a House</option>
                            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Start</label>
                        <input type="date" className="w-full p-2.5 bg-gray-100  rounded-lg" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">End</label>
                        <input type="date" className="w-full p-2.5 bg-gray-100 rounded-lg" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                    </div>

                    <Btn onClick={refetch} className="w-full py-3" style={{ backgroundColor: primaryColorHex }} disabled={isLoading || !filters.houseId}>
                        Generate
                    </Btn>
                </div>
            </div>

            {/* Results */}
            {reportData && (
                <div className="animate-in fade-in duration-500 space-y-1">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
                        <SummaryCard className='rounded-b-sm rounded-tr-none' title="Total Rent" amount={reportData.totals.rent_income} format={formatCurrency} />
                        <SummaryCard className='!rounded-sm' title="Total Advance" amount={reportData.totals.advance_income} format={formatCurrency} />
                        <SummaryCard className='!rounded-sm' title="Total Expenses" amount={reportData.totals.expenses} format={formatCurrency} isExpense />
                        <SummaryCard className='rounded-b-sm rounded-tl-none' title="Net Profit" amount={reportData.totals.profit} format={formatCurrency} isProfit bgColor={primaryColorHex} />
                    </div>

                    {/* Table */}
                    <div className="rounded-xl rounded-t-none shadow-sm overflow-hidden pb-4">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Monthly Breakdown</h3>
                            {currentOwnerInfo && (
                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                    <User size={14}/> {currentOwnerInfo.name}
                                </span>
                            )}
                        </div>
                        <Table className='mt-4' columns={columns} data={reportData.monthly_breakdown} hoverable={true} />
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal Small Component for cleaner JSX
const SummaryCard = ({ title, amount, format, isExpense, isProfit, bgColor, className= "" }) => (
    <div className={`p-2 lg:p-4 rounded-xl border border-gray-100 shadow-sm bg-white ${className}`} >
        <p className={`text-xs font-bold uppercase mb-1 ${isProfit ? 'opacity-80' : 'text-gray-400'}`}>{title}</p>
        <p className={`text-sm lg:text-xl font-bold ${isExpense ? 'text-red-500' : isProfit ? 'text-green-500' : 'text-gray-900'}`}>
            ৳{format(amount)}
        </p>
    </div>
);