import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import {
  ShoppingCart, AlertCircle, DollarSign, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

// ✅ Import all charts
import { SalesChart } from './SalesChart';
import { CategoryPieChart } from './CategoryPieChart';
import { HourlyBarChart } from './HourlyBarChart';

// Configuration: Threshold for "Low Stock"
const LOW_STOCK_THRESHOLD = 10;

const DashboardScreen: React.FC = () => {
  const currency = useCurrency();

  // Fetch Data
  const data = useLiveQuery(async () => {
    const orders = await db.orders.toArray();
    const products = await db.products.toArray();

    // --- Date Logic ---
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    // --- Calculations ---

    // 1. Total Refunded Amount (All time)
    const totalRefunded = orders.reduce((sum, order) => sum + (order.refundedAmount || 0), 0);

    // 2. Today's Revenue (Net: Sales - Refunds)
    const todaysOrders = orders.filter(o => o.timestamp >= startOfDay.getTime());
    const todaysGross = todaysOrders.reduce((sum, o) => sum + o.total, 0);
    const todaysRefunds = todaysOrders.reduce((sum, o) => sum + (o.refundedAmount || 0), 0);
    const todaysNetRevenue = todaysGross - todaysRefunds;

    const todaysCount = todaysOrders.length;

    // 3. Stock Logic (Split Out vs Low)
    const outOfStockItems = products.filter(p => p.stock <= 0);
    const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);

    // Combine for the single list view
    const allAlertItems = [...outOfStockItems, ...lowStockItems];

    // 4. Recent Transactions (Last 5)
    const recentOrders = orders.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

    return {
      todaysNetRevenue,
      todaysCount,
      totalRefunded,
      outOfStockItems,
      lowStockItems,
      allAlertItems,
      recentOrders,
      allOrders: orders,
      allProducts: products, // ✅ Needed for Pie Chart (maps IDs to Categories)
      totalOrders: orders.length
    };
  });

  if (!data) return <div className="p-12 text-center text-gray-500">Loading Dashboard...</div>;

  const stats = [
    {
      label: "Today's Net Revenue",
      value: `${currency}${data.todaysNetRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-600",
      subtext: "After refunds deducted"
    },
    {
      label: "Orders Today",
      value: data.todaysCount,
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600"
    },
    {
      label: "Total Refunded",
      value: `${currency}${data.totalRefunded.toFixed(2)}`,
      icon: RefreshCw,
      color: "bg-red-100 text-red-600",
      subtext: "Lifetime returns value"
    },
    {
      label: "Stock Alerts",
      value: data.allAlertItems.length,
      icon: AlertCircle,
      color: data.allAlertItems.length > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Store Overview</h1>
        <p className="text-gray-500">Real-time insights from your local database.</p>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
              {stat.subtext && <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* ✅ 1. SALES TREND CHART */}
      <SalesChart orders={data.allOrders} />

      {/* ✅ 2. NEW CHARTS GRID (Pie + Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Categories Pie Chart */}
         <CategoryPieChart orders={data.allOrders} products={data.allProducts} />

         {/* Hourly Traffic Bar Chart */}
         <HourlyBarChart orders={data.allOrders} />
      </div>

      {/* --- DETAILED SECTIONS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No transactions yet.</div>
            ) : (
                data.recentOrders.map(order => (
                <div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col">
                        <span className="font-bold text-blue-600 text-sm">Order #{order.id}</span>
                        <span className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-right">
                        {order.status === 'refunded' ? (
                            <div>
                                <span className="block text-xs font-bold text-red-500 uppercase">Refunded</span>
                                <span className="font-medium text-gray-400 line-through text-sm">{currency}{order.total.toFixed(2)}</span>
                            </div>
                        ) : order.refundedAmount && order.refundedAmount > 0 ? (
                             <div>
                                <span className="block font-bold text-gray-800 text-sm">{currency}{(order.total - order.refundedAmount).toFixed(2)}</span>
                                <span className="text-xs text-red-500">Partially Refunded</span>
                             </div>
                        ) : (
                            <span className="font-bold text-gray-800 text-sm">{currency}{order.total.toFixed(2)}</span>
                        )}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Stock Alerts List (Consolidated) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Stock Alerts</h3>
            {/* ✅ UPDATED: Action Needed Badge - Transparent with border */}
            {data.allAlertItems.length > 0 &&
              <span className="text-xs bg-transparent border border-red-200 text-red-600 px-2 py-1 rounded-full font-bold">
                Action Needed
              </span>
            }
          </div>
          <div className="p-4 space-y-3">
            {data.allAlertItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                    <CheckCircle className="mx-auto mb-2 opacity-50" />
                    All stock levels healthy
                </div>
            ) : (
                data.allAlertItems.map(item => {
                  const isOutOfStock = item.stock <= 0;
                  return (
                    // ✅ UPDATED: Transparent BG, Border, Hover Ring
                    <div key={item.id} className={`flex justify-between items-center p-3 rounded-lg border transition-all hover:ring-1 hover:ring-gray-300 ${isOutOfStock ? 'bg-transparent border-red-200' : 'bg-transparent border-orange-200'}`}>
                        <div className="flex items-center gap-3">
                           {isOutOfStock ? <XCircle size={16} className="text-red-500"/> : <AlertCircle size={16} className="text-orange-500"/>}
                           <span className="text-sm font-medium text-gray-700 truncate w-28">{item.name}</span>
                        </div>
                        <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-600' : 'text-orange-600'}`}>
                            {isOutOfStock ? 'Out of Stock' : `${item.stock} left`}
                        </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardScreen;