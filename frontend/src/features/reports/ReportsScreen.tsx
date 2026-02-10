import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  FileText, Download, Calendar, Package,
  Printer, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCurrency } from '../../hooks/useCurrency';

const ReportsScreen: React.FC = () => {
  const currency = useCurrency();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch Data
  const orders = useLiveQuery(() => db.orders.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  // --- LOGIC: Filter Orders by Date ---
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
    return orderDate >= startDate && orderDate <= endDate;
  });

  // --- REPORT 1: SALES REPORT (PDF) ---
  const generateSalesReportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(`Sales Report`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);

    // Summary Calculations
    const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalRefunds = filteredOrders.reduce((sum, o) => sum + (o.refundedAmount || 0), 0);
    const netRevenue = totalSales - totalRefunds;

    // Summary Table
    autoTable(doc, {
      startY: 35,
      head: [['Total Revenue', 'Refunds Deducted', 'Net Profit', 'Orders Count']],
      body: [[
        `${currency}${totalSales.toFixed(2)}`,
        `${currency}${totalRefunds.toFixed(2)}`,
        `${currency}${netRevenue.toFixed(2)}`,
        filteredOrders.length
      ]],
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Detailed Table
    const tableRows = filteredOrders.map(order => [
      new Date(order.timestamp).toLocaleDateString(),
      `#${order.id}`,
      order.paymentMethod,
      order.status,
      `${currency}${order.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Order ID', 'Payment', 'Status', 'Amount']],
      body: tableRows,
      theme: 'striped'
    });

    doc.save(`Sales_Report_${startDate}_${endDate}.pdf`);
  };

  // --- REPORT 2: INVENTORY EXPORT (CSV) ---
  const exportInventoryCSV = () => {
    // 1. Create CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Product Name,Category,Price,Stock Level,Total Asset Value\n";

    // 2. Add Data Rows
    products.forEach(p => {
        const assetValue = (p.price * p.stock).toFixed(2);
        const row = `${p.id},"${p.name}",${p.category},${p.price},${p.stock},${assetValue}`;
        csvContent += row + "\r\n";
    });

    // 3. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- REPORT 3: LOW STOCK LIST (PDF) ---
  const generateLowStockPDF = () => {
    const lowStockItems = products.filter(p => p.stock <= 10);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Restock List (Low Inventory)`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const rows = lowStockItems.map(p => [
        p.name,
        p.category,
        p.stock.toString(),
        p.stock === 0 ? "URGENT" : "Low"
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['Product Name', 'Category', 'Current Stock', 'Status']],
        body: rows,
        headStyles: { fillColor: [220, 38, 38] }, // Red header for urgency
    });

    doc.save(`Restock_List_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500">Generate accounting summaries and inventory lists.</p>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600"/> Report Period
        </h3>
        <div className="flex flex-wrap items-end gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {/* ✅ UPDATED: Changed background to gray-50 to match page theme */}
            <div className="bg-gray-50 px-4 py-2 rounded-lg text-gray-700 text-sm font-bold border border-gray-200 h-[42px] flex items-center">
                Orders Found: {filteredOrders.length}
            </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. Sales Report Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
                <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Sales Report</h3>
            <p className="text-sm text-gray-500 mb-6">Detailed list of all transactions within the selected date range, including refunds and net revenue.</p>
            <button
                onClick={generateSalesReportPDF}
                disabled={filteredOrders.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={18} /> Download PDF
            </button>
        </div>

        {/* 2. Inventory Valuation Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Inventory Valuation</h3>
            <p className="text-sm text-gray-500 mb-6">Export current stock levels and total asset value to CSV (Excel). Useful for accounting.</p>
            <button
                onClick={exportInventoryCSV}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
                <Download size={18} /> Export CSV
            </button>
        </div>

        {/* 3. Restock List Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4">
                <Package size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Low Stock Alert</h3>
            <p className="text-sm text-gray-500 mb-6">Generate a "Shopping List" PDF of items running low (below 10 units) to send to suppliers.</p>
            <button
                onClick={generateLowStockPDF}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
                <Printer size={18} /> Print List
            </button>
        </div>

      </div>
    </div>
  );
};

export default ReportsScreen;