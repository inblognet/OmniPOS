"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/mobile/customer/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'DELIVERED': 'text-green-600 bg-green-50 border-green-100',
      'COMPLETED': 'text-green-600 bg-green-50 border-green-100',
      'ONGOING': 'text-blue-600 bg-blue-50 border-blue-100',
      'PROCESSING': 'text-blue-600 bg-blue-50 border-blue-100',
      'PENDING': 'text-yellow-600 bg-yellow-50 border-yellow-100',
      'CANCELLED': 'text-red-600 bg-red-50 border-red-100',
      'REFUNDED': 'text-gray-600 bg-gray-50 border-gray-100'
    };
    return statusMap[status?.toUpperCase()] || 'text-gray-600 bg-gray-50 border-gray-100';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 pt-12 pb-6 rounded-b-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">My Orders</h1>
              <p className="text-white/80 text-sm mt-1">{orders.length} total orders</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="px-4 mt-6">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Package size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No orders yet</p>
              <button
                onClick={() => router.push('/products')}
                className="mt-4 text-blue-600 font-semibold"
              >
                Start Shopping →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">Order #{order.id}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="text-lg font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
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
