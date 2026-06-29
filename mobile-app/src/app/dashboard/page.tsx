'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Package, Award, Clock, Bell, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import api from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';

interface DashboardStats {
  total_spent: number;
  total_orders: number;
  loyalty_points: number;
  loyalty_joined: boolean;
}

interface RecentOrder {
  id: number;
  total_amount: string;
  status: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { user } = useUserStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/mobile/customer/dashboard');
      if (res.data.success) {
        setStats(res.data.stats);
        setRecentOrders(res.data.recent_orders);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'DELIVERED': return 'text-green-600 bg-green-50';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'PROCESSING': return 'text-blue-600 bg-blue-50';
      case 'CANCELLED': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 pt-12 pb-8 rounded-b-3xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-white/80 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-bold">{user?.name?.split(' ')[0] || 'Customer'}</h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <ShoppingBag size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.total_orders || 0}</p>
              <p className="text-xs text-white/70">Orders</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <TrendingUp size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">${stats?.total_spent?.toFixed(0) || 0}</p>
              <p className="text-xs text-white/70">Spent</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <Award size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.loyalty_points || 0}</p>
              <p className="text-xs text-white/70">Points</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
            <button 
              onClick={() => router.push('/orders')}
              className="text-blue-600 text-sm font-medium flex items-center"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No orders yet</p>
              <button
                onClick={() => router.push('/products')}
                className="mt-3 text-blue-600 font-medium"
              >
                Start Shopping ?
              </button>
            </div>
          ) : (
            <div className="space-y-3">
        <button
          onClick={() => router.push("/chat")}
          className="w-full bg-blue-600 text-white p-4 rounded-xl text-left shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-semibold">Support Chat</p>
              <p className="text-sm text-white/70">Chat with our team</p>
            </div>
          </div>
          <span className="text-white/50">→</span>
        </button>
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="font-bold text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

