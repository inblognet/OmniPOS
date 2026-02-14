import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, AlertCircle, DollarSign, RefreshCw, Users, TrendingUp, BarChart3, LineChart, Download
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

// ✅ PDF Export Libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Cloud Services
import { dashboardService, DashboardStats } from '../../services/dashboardService';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';

// Chart Components
import { SalesChart } from './SalesChart';
import { CategoryPieChart } from './CategoryPieChart';
import { HourlyBarChart } from './HourlyBarChart';

const LOW_STOCK_THRESHOLD = 10;

const DashboardScreen: React.FC = () => {
  const currency = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const cloudStats = await dashboardService.getStats();
      setStats(cloudStats);

      const allOrders = await orderService.getAllOrders();
      const sortedRecent = allOrders
        .sort((a: any, b: any) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime())
        .slice(0, 5);
      setRecentOrders(sortedRecent);

      const products = await productService.getAll();
      setStockAlerts(products.filter((p: any) => p.stock <= LOW_STOCK_THRESHOLD));
    } catch (error) {
      console.error("Cloud Sync Failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  // ✅ PDF Export Logic
  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard-report-content');
    if (!element) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff' // Ensure white background for PDF
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`OmniPOS_Report_${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error("Export Failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !stats) {
    return <div className="p-12 text-center text-gray-500 animate-pulse">Syncing Cloud Intelligence...</div>;
  }

  return (
    // ✅ 1. Outer Container: Gray Background for the whole screen
    <div className="min-h-full bg-gray-100 p-6">

      {/* ✅ 2. Inner Container: The "White Box" Sheet */}
      <div
        id="dashboard-report-content"
        className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
      >

        {/* --- HEADER SECTION --- */}
        <div className="mb-8 flex justify-between items-center border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Store Overview</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Cloud-synced business intelligence
            </p>
          </div>

          <div className="flex items-center gap-3">
              {/* Export PDF Button */}
              <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-lg text-sm font-bold"
              >
                  {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                  <span>{isExporting ? 'Generating...' : 'Export PDF'}</span>
              </button>

              <button onClick={loadDashboardData} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg border border-gray-200">
                  <RefreshCw size={20} />
              </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard label="Today's Net Revenue" value={`${currency}${stats.revenue.toFixed(2)}`} icon={DollarSign} color="bg-emerald-50 text-emerald-600" sub="ALL-TIME" />
          <MetricCard label="Orders Today" value={stats.orders} icon={ShoppingCart} color="bg-blue-50 text-blue-600" sub="LIVE" />
          <MetricCard label="Unique Customers" value={stats.customers} icon={Users} color="bg-purple-50 text-purple-600" sub="LIVE" />
          <MetricCard label="Stock Alerts" value={stockAlerts.length} icon={AlertCircle} color={stockAlerts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-500"} sub="LIVE" />
        </div>

        {/* Row 1: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-sm uppercase tracking-wide">
              <LineChart size={18} /> Revenue Trend (7 Days)
            </div>
            <SalesChart data={stats.daily || []} isDaily={true} />
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold text-sm uppercase tracking-wide">
              <TrendingUp size={18} /> Hourly Performance
            </div>
            <SalesChart data={stats.hourly} isDaily={false} />
          </div>
        </div>

        {/* Row 2: Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-sm uppercase tracking-wide">
              <BarChart3 size={18} /> Peak Traffic
            </div>
            <HourlyBarChart data={stats.hourly} />
          </div>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-sm uppercase tracking-wide">
              <TrendingUp size={18} /> Sales by Category
            </div>
            <CategoryPieChart data={stats.categories} />
          </div>
        </div>

        {/* Row 3: Transactions & Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Recent Transactions</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">SYNCED</span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOrders.map(order => (
                <div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-sm">Order #{order.id}</span>
                    <span className="text-xs text-gray-400">{new Date(order.created_at || order.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600 text-sm">
                      {currency}{(Number(order.total_amount) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Inventory Status</h3>
              <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-full font-bold">Action Needed</span>
            </div>
            <div className="p-4 space-y-3">
              {stockAlerts.map(item => (
                <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border ${item.stock <= 0 ? 'border-red-100 bg-red-50/10' : 'border-orange-100 bg-orange-50/10'}`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle size={16} className={item.stock <= 0 ? "text-red-500" : "text-orange-500"}/>
                    <span className="text-sm font-medium text-gray-700 truncate w-28">{item.name}</span>
                  </div>
                  <span className={`text-xs font-black ${item.stock <= 0 ? 'text-red-600' : 'text-orange-600'}`}>{item.stock} LEFT</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color, sub }: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{value}</h3>
      <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-wider">{sub}</p>
    </div>
    <div className={`p-4 rounded-xl ${color} bg-opacity-20`}>
        <Icon size={28} />
    </div>
  </div>
);

export default DashboardScreen;