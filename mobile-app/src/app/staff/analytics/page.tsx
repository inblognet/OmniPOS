"use client";

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, Calendar, RefreshCw } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AnalyticsData {
  daily_sales: { date: string; amount: number }[];
  top_products: { name: string; quantity: number }[];
  category_sales: { name: string; value: number }[];
  stats: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    total_customers: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StaffAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/mobile/staff/analytics?days=${timeRange}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StaffMobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StaffMobileLayout>
    );
  }

  return (
    <StaffMobileLayout>
      <div className="pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Business performance insights</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button onClick={fetchAnalytics} className="p-2 bg-gray-100 rounded-xl">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-green-600" />
              <span className="text-xs text-gray-500">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${data?.stats.total_revenue.toFixed(2) || '0'}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={18} className="text-blue-600" />
              <span className="text-xs text-gray-500">Total Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data?.stats.total_orders || 0}</p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-purple-600" />
              <span className="text-xs text-gray-500">Avg Order Value</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${data?.stats.avg_order_value.toFixed(2) || '0'}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-orange-600" />
              <span className="text-xs text-gray-500">Total Customers</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data?.stats.total_customers || 0}</p>
          </div>
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.daily_sales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Selling Products</h3>
          <div className="space-y-3">
            {(data?.top_products || []).slice(0, 5).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${(product.quantity / (data?.top_products[0]?.quantity || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 ml-3">{product.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Sales Pie Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.category_sales || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(data?.category_sales || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </StaffMobileLayout>
  );
}
