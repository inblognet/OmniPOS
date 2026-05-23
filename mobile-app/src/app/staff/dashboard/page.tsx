"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, Package, Users, DollarSign, 
  Clock, CheckCircle, AlertCircle, Receipt
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  pending_refunds: number;
  total_customers: number;
  total_products: number;
}

interface RecentOrder {
  id: number;
  total_amount: number;
  order_status: string;
  customer_name: string;
  created_at: string;
}

export default function StaffDashboard() {
  const router = useRouter();
  const { user } = useUserStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/mobile/staff/dashboard'),
        api.get('/mobile/staff/recent-orders')
      ]);
      
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (ordersRes.data.success) setRecentOrders(ordersRes.data.orders);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'ONGOING': 'bg-blue-100 text-blue-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
        <p className="text-blue-100 text-sm">Welcome back,</p>
        <h2 className="text-xl font-bold">{user?.name}</h2>
        <p className="text-blue-100 text-xs mt-1 capitalize">{user?.role} • {new Date().toLocaleDateString()}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingBag size={18} className="text-blue-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">{stats?.today_orders || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Today's Orders</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">${stats?.today_revenue?.toFixed(2) || '0'}</span>
          </div>
          <p className="text-xs text-gray-500">Today's Revenue</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-orange-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">{stats?.pending_orders || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Pending Orders</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <span className="text-xl font-bold text-gray-900">{stats?.pending_refunds || 0}</span>
          </div>
          <p className="text-xs text-gray-500">Pending Refunds</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => router.push('/staff/orders')}
            className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <Package size={22} className="mx-auto mb-1 text-blue-500" />
            <span className="text-xs font-medium text-gray-700">Orders</span>
          </button>
          
          <button 
            onClick={() => router.push('/staff/customers')}
            className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <Users size={22} className="mx-auto mb-1 text-green-500" />
            <span className="text-xs font-medium text-gray-700">Customers</span>
          </button>
          
          <button 
            onClick={() => router.push('/staff/refunds')}
            className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:bg-gray-50"
          >
            <Receipt size={22} className="mx-auto mb-1 text-red-500" />
            <span className="text-xs font-medium text-gray-700">Refunds</span>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3">Recent Orders</h3>
        <div className="space-y-3">
          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              No recent orders
            </div>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
                onClick={() => router.push(`/staff/orders`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">Order #{order.id}</p>
                    <p className="text-xs text-gray-500">{order.customer_name || 'Guest'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                    {order.order_status || 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StaffMobileLayout>
  );
}
