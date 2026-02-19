import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp,
  Activity, PackageX, Crown, Clock, RefreshCw, CheckCircle // ✅ ADDED CheckCircle HERE
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import api from '../../api/axiosConfig';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DashboardScreen: React.FC = () => {
  const currency = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trendView, setTrendView] = useState<'7' | '30'>('7'); // Toggle State

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Dashboard Stats AND All Products simultaneously
      const [statsRes, productsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/products')
      ]);

      const dashboardData = statsRes.data;
      const products = productsRes.data;

      // Calculate Low & Out of Stock items directly from real product data
      const lowStockItems = products.filter((p: any) => p.stock <= (p.reorderLevel || 5));

      // Sort them so Out of Stock (0) items appear at the very top of the list
      lowStockItems.sort((a: any, b: any) => a.stock - b.stock);

      // Merge the computed stock alerts into the data state
      setData({ ...dashboardData, lowStockItems });

    } catch (e) {
      console.error("Dashboard Sync Failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="h-screen flex justify-center items-center text-gray-400 animate-pulse">Loading Analytics Engine...</div>;

  // Safety check to prevent crash if backend returns null
  if (!data) return (
    <div className="p-10 text-center text-red-500 flex flex-col items-center gap-4">
      <p>System Offline or Connection Failed</p>
      <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold">
        <RefreshCw size={18}/> Retry Connection
      </button>
    </div>
  );

  const { stats, trends, topProducts, topCustomers, peakTraffic, salesByCategory, lowStockItems } = data;

  // Filter trends based on selection (7 days or full 30 days)
  const visibleTrends = trendView === '7' ? trends.slice(-7) : trends;

  return (
    <div className="min-h-full bg-gray-50 p-6 space-y-6">

      {/* 1. HEADER & KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`${currency}${(stats.totalRevenue || 0).toLocaleString()}`}
          sub="All-Time Growth"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders Today"
          value={stats.ordersToday || 0}
          sub={`Today's Rev: ${currency}${stats.todayRevenue}`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Crown}
          label="Best Seller"
          value={stats.mostSoldItem || "N/A"}
          sub="Top Moving Product"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Attention Needed"
          value={`${lowStockItems?.length || 0} Items`}
          sub="Low / Out of Stock"
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* 2. MAIN REVENUE TREND CHART */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18}/> Revenue Analytics</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTrendView('7')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${trendView === '7' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>7 Days</button>
            <button onClick={() => setTrendView('30')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${trendView === '30' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>30 Days</button>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleTrends}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} tickFormatter={(val) => `${currency}${val}`}/>
              <Tooltip formatter={(val:any) => `${currency}${val}`} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. DETAILED ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TOP 10 PRODUCTS (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Crown size={18}/> Top 10 Best-Selling Items</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SALES BY CATEGORY (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity size={18}/> Sales by Category</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {salesByCategory.map((_:any, index:number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. TRAFFIC & CUSTOMERS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PEAK TRAFFIC HOURS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock size={18}/> Peak Customer Hours</h3>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={peakTraffic}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={50}/>
                 <Tooltip />
                 <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* TOP CUSTOMERS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={18}/> Loyal Customers</h3>
           <div className="space-y-4">
             {topCustomers && topCustomers.length > 0 ? topCustomers.slice(0, 5).map((c: any, i: number) => (
               <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-50 hover:border-blue-100 transition-colors">
                 <div className="flex items-center gap-3">
                   <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs rounded-full">{i + 1}</span>
                   <span className="text-sm font-bold text-gray-700 truncate w-24">{c.name}</span>
                 </div>
                 <span className="text-sm font-black text-gray-900">{currency}{c.value.toLocaleString()}</span>
               </div>
             )) : <p className="text-gray-400 text-sm text-center py-4">No customer data yet.</p>}
           </div>
        </div>

        {/* ✅ STOCK ALERTS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-800 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Stock Alerts</h3>
             <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-md">{lowStockItems?.length || 0} Issues</span>
           </div>

           <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
             {lowStockItems && lowStockItems.length > 0 ? lowStockItems.map((p: any, i: number) => (
               <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${p.stock <= 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-gray-800 truncate w-32">{p.name}</span>
                   <span className="text-[10px] text-gray-500 font-mono">{p.sku || 'No SKU'}</span>
                 </div>
                 <span className={`text-[11px] font-black px-2 py-1 rounded-md ${p.stock <= 0 ? 'text-red-600 bg-red-100' : 'text-orange-600 bg-orange-100'}`}>
                   {p.stock <= 0 ? 'Out of Stock' : `Low: ${p.stock}`}
                 </span>
               </div>
             )) : <p className="text-sm text-green-500 font-bold text-center py-4 flex flex-col items-center justify-center gap-2"><CheckCircle size={24}/> Inventory levels are healthy!</p>}
           </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
      <p className="text-[10px] font-bold text-gray-400 mt-2">{sub}</p>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}> <Icon size={24}/> </div>
  </div>
);

export default DashboardScreen;