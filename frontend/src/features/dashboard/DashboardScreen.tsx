import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp,
  Activity, PackageX, Crown, Clock, RefreshCw, CheckCircle
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import api from '../../api/axiosConfig';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DashboardScreen: React.FC = () => {
  const currency = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // ✅ ADDED 'all' and set it as the default
  const [trendView, setTrendView] = useState<'7' | '30' | 'all'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);

      let dashboardData: any = null;
      let products: any[] = [];

      // 🌐 NETWORK INTERCEPTOR
      if (navigator.onLine) {
        // 🟢 ONLINE: Fetch fresh from Render
        const [statsRes, productsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/products')
        ]);
        dashboardData = statsRes.data;
        products = productsRes.data;
      } else {
        // 🔴 OFFLINE: Load from local SQLite Cache!
        if (window.electronAPI) {
          const cachedStats = await window.electronAPI.getCache('dashboard_stats');
          const cachedProducts = await window.electronAPI.getCache('products');

          if (cachedStats.success && cachedStats.data) dashboardData = cachedStats.data;
          if (cachedProducts.success && cachedProducts.data) products = cachedProducts.data;
        }
      }

      // If we successfully got data (either from cloud or local cache), map it to the UI
      if (dashboardData && products) {
        const lowStockItems = products.filter((p: any) => p.stock <= (p.reorderLevel || 5));
        lowStockItems.sort((a: any, b: any) => a.stock - b.stock);
        setData({ ...dashboardData, lowStockItems });
      } else {
        // Failsafe if offline but no cache exists yet
        setData(null);
      }

    } catch (e) {
      console.error("Dashboard Sync Failed:", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="h-screen flex justify-center items-center text-[var(--sub-text-color,#9ca3af)] animate-pulse font-bold text-lg">Loading Analytics Engine...</div>;

  if (!data) return (
    <div className="p-10 text-center text-red-500 flex flex-col items-center gap-4">
      <p className="font-bold text-xl">System Offline or Cache Empty</p>
      <button onClick={fetchData} className="flex items-center gap-2 px-6 py-3 bg-[var(--primary-color,#3b82f6)] text-white rounded-xl font-bold shadow-lg hover:brightness-110 transition-all active:scale-95">
        <RefreshCw size={18}/> Retry Connection
      </button>
    </div>
  );

  const { stats, trends, topProducts, topCustomers, peakTraffic, salesByCategory, lowStockItems } = data;

  // ✅ LOGIC FOR THE NEW 'all' VIEW
  const visibleTrends =
    trendView === '7' ? trends.slice(-7) :
    trendView === '30' ? trends.slice(-30) :
    trends;

  return (
    <div className="min-h-full bg-[var(--background-color,#f9fafb)] p-6 space-y-8 transition-colors">

      {/* 1. HEADER & KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={`${currency}${(stats?.totalRevenue || 0).toLocaleString()}`} sub="All-Time Growth" iconColor={{ bg: 'bg-emerald-500/10', text: 'text-emerald-500' }} />
        <StatCard icon={ShoppingBag} label="Orders Today" value={stats?.ordersToday || 0} sub={`Today's Rev: ${currency}${stats?.todayRevenue || 0}`} iconColor={{ bg: 'bg-blue-500/10', text: 'text-blue-500' }} />
        <StatCard icon={Crown} label="Best Seller" value={stats?.mostSoldItem || "N/A"} sub="Top Moving Product" iconColor={{ bg: 'bg-purple-500/10', text: 'text-purple-500' }} />
        <StatCard icon={AlertTriangle} label="Attention Needed" value={`${lowStockItems?.length || 0} Items`} sub="Low / Out of Stock" iconColor={{ bg: 'bg-red-500/10', text: 'text-red-500' }} />
      </div>

      {/* 2. MAIN REVENUE TREND CHART */}
      <div className="bg-[var(--card-color,#ffffff)] p-8 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] transition-colors">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <h3 className="text-xl font-black text-[var(--text-color,#1f2937)] flex items-center gap-3">
              <TrendingUp size={24} className="text-[var(--primary-color,#3b82f6)]"/> Revenue Analytics
          </h3>

          {/* ✅ MODERNIZED TOGGLE SWITCH WITH 'ALL TIME' */}
          <div className="flex bg-[var(--background-color,#f3f4f6)] p-1.5 rounded-xl border border-[var(--sidebar-color,#e5e7eb)]">
            {['7', '30', 'all'].map((view) => (
                <button
                    key={view}
                    onClick={() => setTrendView(view as any)}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${trendView === view ? 'bg-[var(--primary-color,#3b82f6)] text-white shadow-md' : 'text-[var(--sub-text-color,#6b7280)] hover:text-[var(--text-color,#1f2937)]'}`}
                >
                    {view === 'all' ? 'All Time' : `${view} Days`}
                </button>
            ))}
          </div>
        </div>

        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleTrends || []}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-color, #3b82f6)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary-color, #3b82f6)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              {/* Subtle grid lines that work in dark mode */}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05}/>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--sub-text-color, #9ca3af)'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--sub-text-color, #9ca3af)'}} tickFormatter={(val) => `${currency}${val}`} dx={-10}/>
              <Tooltip
                formatter={(val:any) => [`${currency}${val}`, 'Revenue']}
                contentStyle={{ borderRadius: '12px', border:'none', boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', backgroundColor: 'var(--card-color, #ffffff)', color: 'var(--text-color, #1f2937)', fontWeight: 'bold' }}
                itemStyle={{ color: 'var(--primary-color, #3b82f6)' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--primary-color, #3b82f6)" strokeWidth={4} fill="url(#colorRev)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. DETAILED ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TOP 10 PRODUCTS (Bar Chart) */}
        <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] lg:col-span-2 transition-colors">
          <h3 className="text-lg font-bold text-[var(--text-color,#1f2937)] mb-6 flex items-center gap-2"><Crown size={20} className="text-purple-500"/> Top 10 Best-Selling Items</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts || []} layout="vertical" margin={{left: 20}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" strokeOpacity={0.05}/>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fill: 'var(--sub-text-color, #9ca3af)'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'currentColor', opacity: 0.05}} contentStyle={{ borderRadius: '12px', border:'none', backgroundColor: 'var(--card-color, #ffffff)', color: 'var(--text-color, #1f2937)', fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={24} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SALES BY CATEGORY (Pie Chart) */}
        <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] transition-colors">
          <h3 className="text-lg font-bold text-[var(--text-color,#1f2937)] mb-6 flex items-center gap-2"><Activity size={20} className="text-blue-500"/> Sales by Category</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByCategory || []} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                  {(salesByCategory || []).map((_:any, index:number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border:'none', backgroundColor: 'var(--card-color, #ffffff)', color: 'var(--text-color, #1f2937)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px', color: 'var(--sub-text-color, #9ca3af)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. TRAFFIC & CUSTOMERS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* PEAK TRAFFIC HOURS */}
        <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] transition-colors">
           <h3 className="text-lg font-bold text-[var(--text-color,#1f2937)] mb-6 flex items-center gap-2"><Clock size={20} className="text-orange-500"/> Peak Customer Hours</h3>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={peakTraffic || []}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05}/>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: 'var(--sub-text-color, #9ca3af)'}} interval={0} angle={-45} textAnchor="end" height={50}/>
                 <Tooltip cursor={{fill: 'currentColor', opacity: 0.05}} contentStyle={{ borderRadius: '12px', border:'none', backgroundColor: 'var(--card-color, #ffffff)', color: 'var(--text-color, #1f2937)', fontWeight: 'bold' }} />
                 <Bar dataKey="value" fill="#f59e0b" radius={[6,6,0,0]} animationDuration={1500} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* TOP CUSTOMERS */}
        <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] transition-colors">
           <h3 className="text-lg font-bold text-[var(--text-color,#1f2937)] mb-6 flex items-center gap-2"><Users size={20} className="text-emerald-500"/> Loyal Customers</h3>
           <div className="space-y-3">
             {topCustomers && topCustomers.length > 0 ? topCustomers.slice(0, 5).map((c: any, i: number) => (
               <div key={i} className="flex justify-between items-center p-3 bg-[var(--background-color,#f9fafb)] rounded-xl border border-[var(--sidebar-color,#f3f4f6)] hover:border-[var(--primary-color,#3b82f6)] transition-colors">
                 <div className="flex items-center gap-3">
                   <span className="w-7 h-7 flex items-center justify-center bg-[var(--primary-color)]/10 text-[var(--primary-color,#3b82f6)] font-black text-xs rounded-full">{i + 1}</span>
                   <span className="text-sm font-bold text-[var(--text-color,#1f2937)] truncate w-32">{c.name}</span>
                 </div>
                 <span className="text-sm font-black text-[var(--text-color,#1f2937)]">{currency}{c.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
               </div>
             )) : <p className="text-[var(--sub-text-color,#9ca3af)] text-sm font-medium text-center py-10">No customer data yet.</p>}
           </div>
        </div>

        {/* STOCK ALERTS */}
        <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] transition-colors flex flex-col h-full">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-[var(--text-color,#1f2937)] flex items-center gap-2"><AlertTriangle size={20} className="text-red-500"/> Stock Alerts</h3>
             <span className="bg-red-500/10 text-red-500 text-xs font-black px-2.5 py-1 rounded-lg">{lowStockItems?.length || 0} Issues</span>
           </div>

           <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-[200px]">
             {lowStockItems && lowStockItems.length > 0 ? lowStockItems.map((p: any, i: number) => (
               <div key={i} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${p.stock <= 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                 <div className="flex flex-col">
                   <span className="text-sm font-bold text-[var(--text-color,#1f2937)] truncate w-36">{p.name}</span>
                   <span className="text-[10px] text-[var(--sub-text-color,#9ca3af)] font-mono font-bold mt-0.5">{p.sku || 'No SKU'}</span>
                 </div>
                 <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${p.stock <= 0 ? 'text-red-500 bg-red-500/10' : 'text-orange-500 bg-orange-500/10'}`}>
                   {p.stock <= 0 ? 'Out of Stock' : `Low: ${p.stock}`}
                 </span>
               </div>
             )) : (
                 <div className="h-full flex flex-col items-center justify-center gap-3 text-emerald-500 py-10">
                     <CheckCircle size={40} className="opacity-80"/>
                     <p className="text-sm font-bold">Inventory levels are healthy!</p>
                 </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

// ✅ MODERNIZED STAT CARD WITH CSS VARIABLES
const StatCard = ({ icon: Icon, label, value, sub, iconColor }: any) => (
  <div className="bg-[var(--card-color,#ffffff)] p-6 rounded-3xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] flex items-center justify-between hover:shadow-md transition-all group cursor-default">
    <div>
      <p className="text-xs font-bold text-[var(--sub-text-color,#9ca3af)] uppercase tracking-wider">{label}</p>
      <h3 className="text-3xl font-black text-[var(--text-color,#1f2937)] mt-2 tracking-tight">{value}</h3>
      <p className="text-[10px] font-bold text-[var(--sub-text-color,#9ca3af)] mt-2 bg-[var(--background-color,#f3f4f6)] inline-block px-2 py-1 rounded-md">{sub}</p>
    </div>
    <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${iconColor.bg}`}>
        <Icon size={28} className={iconColor.text}/>
    </div>
  </div>
);

export default DashboardScreen;