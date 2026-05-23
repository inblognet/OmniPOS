'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, MapPin, CreditCard, Clock } from 'lucide-react';
import api from '@/lib/api';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  delivery_address: string;
  delivery_city: string;
  delivery_phone: string;
  discount_code: string;
  discount_amount: number;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching order details for ID:', orderId);
      
      const res = await api.get(/mobile/orders/);
      console.log('API Response:', res.data);
      
      if (res.data.success) {
        setOrder(res.data.order);
        setItems(res.data.items || []);
      } else {
        setError(res.data.message || 'Failed to load order details');
        toast.error('Failed to load order details');
      }
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      setError(error.response?.data?.message || 'Failed to load order details');
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'DELIVERED': 'text-green-600 bg-green-50',
      'COMPLETED': 'text-green-600 bg-green-50',
      'ONGOING': 'text-blue-600 bg-blue-50',
      'PROCESSING': 'text-blue-600 bg-blue-50',
      'PENDING': 'text-yellow-600 bg-yellow-50',
      'CANCELLED': 'text-red-600 bg-red-50'
    };
    return statusMap[status?.toUpperCase()] || 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (error || !order) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen flex-col gap-4">
          <Package size={48} className="text-gray-300" />
          <p className="text-gray-500">{error || 'Order not found'}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 font-semibold"
          >
            Go Back
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-20">
        <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={\px-3 py-1 rounded-full text-xs font-medium \\}>
              {order.order_status || 'PENDING'}
            </span>
            <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No items found</div>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id}
                  className={\p-4 flex justify-between items-center \\}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      \ × {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900 ml-4">
                    \
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">\</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount {order.discount_code ? \(\)\ : ''}</span>
                <span>-\</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">\</span>
            </div>
          </div>
        </div>

        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-gray-400" />
                <span className="text-gray-600">Payment Method</span>
              </div>
              <span className="font-medium">{order.payment_method || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <span className="text-gray-600">Payment Status</span>
              </div>
              <span className={\ont-medium \\}>
                {order.payment_status || 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {order.delivery_address && (
          <div className="px-4 mt-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Address</h2>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{order.delivery_address}</p>
                  <p className="text-sm text-gray-500 mt-1">{order.delivery_city}</p>
                  {order.delivery_phone && (
                    <p className="text-sm text-gray-500 mt-1">Phone: {order.delivery_phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
