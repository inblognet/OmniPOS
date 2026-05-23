"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import api from '@/lib/api';

export default function StaffOrders() {
  const { user, isLoading } = useUserStore();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/mobile/staff/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <button onClick={() => router.back()} className="text-blue-600">← Back</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.customer_name || 'Guest'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.order_status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.order_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    order.order_status === 'ONGOING' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.order_status || 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="font-bold text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
