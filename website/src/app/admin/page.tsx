"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore";
import { DollarSign, ShoppingBag, Package, TrendingUp, Clock, CheckCircle, BarChart3, LayoutGrid, PieChart } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: string | number;
}

interface Order {
  id: number;
  total_amount: string | number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_name: string | null;
  items?: OrderItem[];
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  // 🔥 Fetch the dynamic currency symbol from our new global store
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          api.get("/web/admin/orders"),
          api.get("/web/admin/products")
        ]);

        if (ordersRes.data.success) setOrders(ordersRes.data.orders || []);
        if (productsRes.data.success) setProductCount(productsRes.data.products?.length || 0);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

const safeParse = (val: string | number | null | undefined) => {
    if (!val) return 0;
    const parsed = parseFloat(val.toString().replace(/[^0-9.-]+/g,""));
    return isNaN(parsed) ? 0 : parsed;
  };

  // --- Calculations ---
  const validOrders = orders.filter(o => o.payment_status !== 'CANCELLED');
  const totalRevenue = validOrders.reduce((sum, order) => sum + safeParse(order.total_amount), 0);
  const pendingOrders = orders.filter(o => o.payment_status === 'PENDING').length;
  const recentOrders = orders.slice(0, 5);

  // --- High-Resolution Smooth Chart Data Generation ---
  const pastDays = Array.from({length: timeRange}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (timeRange - 1 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const revenueByDay = pastDays.map(date => {
    const dayOrders = validOrders.filter(o => o.created_at && o.created_at.startsWith(date));
    return dayOrders.reduce((sum, o) => sum + safeParse(o.total_amount), 0);
  });

  const rawMaxRev = Math.max(...revenueByDay, 10);
  const chartMax = rawMaxRev * 1.1;

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 250;

  const points = revenueByDay.map((rev, i) => {
    const yCalc = SVG_HEIGHT - (rev / chartMax) * SVG_HEIGHT;
    return {
      x: (i / (timeRange - 1)) * SVG_WIDTH,
      y: Math.max(0, Math.min(SVG_HEIGHT, yCalc || 0)),
      rev,
      date: pastDays[i]
    };
  });

  let linePath = points.length > 0 ? `M ${points[0].x},${points[0].y}` : "";
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const tension = 0.4;
    const cp1x = curr.x + (next.x - curr.x) * tension;
    const cp1y = curr.y;
    const cp2x = next.x - (next.x - curr.x) * tension;
    const cp2y = next.y;
    linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }

  const fillPath = `${linePath} L ${SVG_WIDTH},${SVG_HEIGHT} L 0,${SVG_HEIGHT} Z`;

  // 2. Bar Chart: Top Selling Products
  const allItems = validOrders.flatMap(o => o.items || []);
  const itemCounts = allItems.reduce((acc: Record<string, number>, item) => {
    if (!item || !item.name) return acc;
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {});
  const topProducts = Object.entries(itemCounts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);
  const maxQty = topProducts.length > 0 ? topProducts[0].qty : 1;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={32} />
          Store Overview
        </h1>
        <p className="text-gray-500 mt-1 font-medium">Welcome back. Here is what is happening with your store today.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <>
          {/* --- STAT CARDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</h3>
                <div className="bg-green-50 p-2 rounded-xl text-green-600"><DollarSign size={18} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900">{currencySymbol}{totalRevenue.toFixed(2)}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Orders</h3>
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><ShoppingBag size={18} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900">{orders.length}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Fulfillment</h3>
                <div className="bg-amber-50 p-2 rounded-xl text-amber-600"><Clock size={18} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900">{pendingOrders}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Products</h3>
                <div className="bg-purple-50 p-2 rounded-xl text-purple-600"><Package size={18} /></div>
              </div>
              <p className="text-3xl font-black text-gray-900">{productCount}</p>
            </div>
          </div>

          {/* --- BEAUTIFIED HIGH-RES CHART --- */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2">
                <BarChart3 size={18} className="text-gray-400" /> Revenue Analytics
              </h3>

              <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
                <button
                  onClick={() => setTimeRange(7)}
                  className={`text-xs font-bold px-4 py-1.5 rounded transition-all ${timeRange === 7 ? 'text-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900 bg-transparent'}`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTimeRange(30)}
                  className={`text-xs font-bold px-4 py-1.5 rounded transition-all ${timeRange === 30 ? 'text-blue-600 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900 bg-transparent'}`}
                >
                  30 Days
                </button>
              </div>
            </div>

            <div className="relative h-72 w-full pt-4 pr-4">

              {/* Horizontal Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {[chartMax, chartMax * 0.66, chartMax * 0.33, 0].map((val, i) => (
                  <div key={i} className="flex items-center w-full h-0">
                    <span className="text-[10px] font-bold text-gray-400 w-12 shrink-0">{currencySymbol}{val.toFixed(0)}</span>
                    <div className="flex-1 border-t border-gray-100"></div>
                  </div>
                ))}
              </div>

              {/* Chart Canvas */}
              <div className="absolute top-0 bottom-6 left-12 right-0">
                <div className="w-full h-full relative">

                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>

                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-blue-600" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-blue-600" />
                      </linearGradient>
                    </defs>

                    <path d={fillPath} fill="url(#chartGradient)" />

                    <path
                      d={linePath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-600"
                      strokeLinecap="round"
                    />

                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        fill="var(--theme-card, #ffffff)"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-blue-600 cursor-pointer transition-all duration-200"
                        onMouseEnter={(e) => (e.target as SVGCircleElement).setAttribute('r', '7')}
                        onMouseLeave={(e) => (e.target as SVGCircleElement).setAttribute('r', '4')}
                      >
                        <title>{formatDate(p.date)}: {currencySymbol}{p.rev.toFixed(2)}</title>
                      </circle>
                    ))}
                  </svg>
                </div>
              </div>

              {/* X-Axis Labels */}
              <div className="absolute bottom-0 left-12 right-0 flex justify-between text-[10px] font-bold text-gray-400">
                {timeRange === 7 ? (
                   pastDays.map(date => <span key={date}>{formatDate(date)}</span>)
                ) : (
                   [pastDays[0], pastDays[9], pastDays[19], pastDays[29]].map(date => (
                     <span key={date}>{date ? formatDate(date) : ''}</span>
                   ))
                )}
              </div>
            </div>
          </div>

          {/* --- BAR CHART & PIE CHART GRID --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Top Products Bar Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 mb-8">
                <LayoutGrid size={18} className="text-gray-400" /> Top Best-Selling Items
              </h3>
              <div className="space-y-6">
                {topProducts.length === 0 ? (
                   <p className="text-sm font-bold text-gray-400 text-center py-10">No sales data yet.</p>
                ) : topProducts.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-1/3 truncate" title={item.name}>{item.name}</span>
                    <div className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(item.qty / maxQty) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-8 text-right">{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales Categories Pie Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2 mb-8">
                <PieChart size={18} className="text-gray-400" /> Sales by Category
              </h3>
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path className="text-gray-100" fill="none" stroke="currentColor" strokeWidth="4" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-blue-600" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-gray-900">75%</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">General</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                  <span className="text-xs font-bold text-gray-600">General Goods</span>
                </div>
              </div>
            </div>

          </div>

          {/* --- RECENT ORDERS TABLE --- */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
              <a href="/admin/orders" className="text-blue-600 font-bold text-sm hover:underline">View All &rarr;</a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wider">
                    <th className="p-5 font-bold">Order ID</th>
                    <th className="p-5 font-bold">Customer</th>
                    <th className="p-5 font-bold">Date</th>
                    <th className="p-5 font-bold">Status</th>
                    <th className="p-5 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">No orders yet.</td></tr>
                  ) : recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 font-bold text-gray-900">#{order.id}</td>
                      <td className="p-5 font-medium text-gray-700">{order.customer_name || 'Guest'}</td>
                      <td className="p-5 text-gray-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex w-fit items-center gap-1.5 ${
                          order.payment_status === 'COMPLETED' ? 'bg-green-50 border border-green-200 text-green-700' :
                          order.payment_status === 'PENDING' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                          'bg-gray-50 border border-gray-200 text-gray-700'
                        }`}>
                          {order.payment_status === 'COMPLETED' && <CheckCircle size={10}/>}
                          {order.payment_status === 'PENDING' && <Clock size={10}/>}
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-gray-900">{currencySymbol}{parseFloat(order.total_amount.toString()).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}