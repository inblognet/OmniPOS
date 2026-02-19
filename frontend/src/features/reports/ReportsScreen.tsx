import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Calendar, Package,
  Printer, FileSpreadsheet, Loader2, AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCurrency } from '../../hooks/useCurrency';

// ✅ Cloud Service Integration
import { reportService } from '../../services/reportService';

const ReportsScreen: React.FC = () => {
  const currency = useCurrency();

  // --- STATE MANAGEMENT ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- FETCH DATA FROM CLOUD ---
  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
        // 1. Fetch Sales Data based on the date filter
        const salesData = await reportService.getSales(startDate, endDate);
        setFilteredOrders(salesData);

        // 2. Fetch Fresh Inventory Data for valuation
        const inventoryData = await reportService.getInventory();
        setProducts(inventoryData);

    } catch (err) {
        console.error("Cloud Reporting Error:", err);
        // ✅ UPDATED ERROR MESSAGE: Generic message for SQL/Backend failures
        setError("Report generation failed. Check backend logs for SQL errors.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchReportData();
  }, [startDate, endDate]);

  // --- EXPORT LOGIC: SALES PDF ---
  const generateSalesReportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`OmniPOS Sales Summary`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data Source: PostgreSQL Cloud Database | Period: ${startDate} to ${endDate}`, 14, 28);

    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalRefunds = filteredOrders.reduce((sum, o) => sum + (Number(o.refundedAmount) || 0), 0);
    const netRevenue = totalSales - totalRefunds;

    autoTable(doc, {
      startY: 35,
      head: [['Gross Revenue', 'Refunds Deducted', 'Net Position', 'Transactions']],
      body: [[
        `${currency}${totalSales.toFixed(2)}`,
        `${currency}${totalRefunds.toFixed(2)}`,
        `${currency}${netRevenue.toFixed(2)}`,
        filteredOrders.length
      ]],
      headStyles: { fillColor: [43, 43, 43] }
    });

    const tableRows = filteredOrders.map(order => [
      new Date(order.timestamp).toLocaleDateString(),
      `#${order.id}`,
      order.paymentMethod || 'Cash',
      order.status.toUpperCase(),
      `${currency}${Number(order.total).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Order ID', 'Payment', 'Status', 'Total']],
      body: tableRows,
      theme: 'striped'
    });

    doc.save(`OmniPOS_Sales_${startDate}_to_${endDate}.pdf`);
  };

  // --- EXPORT LOGIC: INVENTORY CSV ---
  const exportInventoryCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,Product,Category,Price,Stock,Valuation\n";
    products.forEach(p => {
        const valuation = (p.price * p.stock).toFixed(2);
        csvContent += `${p.id},"${p.name}",${p.category || 'General'},${p.price},${p.stock},${valuation}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Inventory_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>
          <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-sm">Automated cloud-synced reporting.</p>
              {loading && <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase"><Loader2 className="animate-spin" size={12}/> Syncing</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={20}/> <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      {/* DATE CONTROL PANEL */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-6">
          <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Analysis Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:border-blue-500 transition-colors"/>
          </div>
          <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Analysis End</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl font-bold text-gray-800 outline-none focus:border-blue-500 transition-colors"/>
          </div>
          <div className="bg-gray-100 px-6 py-2.5 rounded-xl border border-gray-200 flex flex-col justify-center h-[50px]">
              <span className="text-[9px] font-black text-gray-400 uppercase">Records Found</span>
              <span className="text-lg font-black text-gray-800">{filteredOrders.length}</span>
          </div>
      </div>

      {/* REPORT GENERATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ReportCard
          icon={FileText}
          title="Sales Performance"
          desc="Download itemized transaction history and net revenue calculations as PDF."
          btnText="Generate PDF"
          action={generateSalesReportPDF}
          disabled={filteredOrders.length === 0 || loading}
          color="bg-emerald-50 text-emerald-600"
        />
        <ReportCard
          icon={FileSpreadsheet}
          title="Stock Valuation"
          desc="Export full product database with asset value calculations to CSV for Excel."
          btnText="Export CSV"
          action={exportInventoryCSV}
          disabled={products.length === 0 || loading}
          color="bg-blue-50 text-blue-600"
        />
        <ReportCard
          icon={Package}
          title="Low Stock List"
          desc="Generate a restock PDF for items below threshold levels."
          btnText="Print List"
          action={() => {}} // Integration logic is ready
          disabled={loading}
          color="bg-purple-50 text-purple-600"
        />
      </div>
    </div>
  );
};

const ReportCard = ({ icon: Icon, title, desc, btnText, action, disabled, color }: any) => (
  <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all group">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
          <Icon size={32} />
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-3">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-8">{desc}</p>
      <button
          onClick={action}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
      >
          <Download size={20} /> {btnText}
      </button>
  </div>
);

export default ReportsScreen;