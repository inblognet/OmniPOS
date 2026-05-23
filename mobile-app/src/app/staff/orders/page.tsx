"use client";

import React, { useEffect, useState } from 'react';
import { Search, Eye, Clock, Truck, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  delivery_address: string;
  delivery_phone: string;
}

export default function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const statuses = ['PENDING', 'ONGOING', 'DELIVERED', 'CANCELLED'];

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/mobile/staff/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
        setFilteredOrders(res.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.id.toString().includes(searchTerm) ||
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.order_status === statusFilter);
    }
    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdating(true);
    try {
      const res = await api.put(`/mobile/staff/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Order #${orderId} updated to ${newStatus}`);
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
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

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <Clock size={14} />;
      case 'ONGOING': return <Truck size={14} />;
      case 'DELIVERED': return <CheckCircle size={14} />;
      case 'CANCELLED': return <XCircle size={14} />;
      default: return null;
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
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Orders</h1>
        <p className="text-sm text-gray-500 mb-4">Manage customer orders</p>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchOrders} className="p-2 bg-gray-100 rounded-xl">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              No orders found
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">#{order.id}</p>
                    <p className="text-xs text-gray-500">{order.customer_name || 'Guest'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.order_status)}`}>
                    {getStatusIcon(order.order_status)}
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

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Order #{selectedOrder.id}</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400">✕</button>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium">{selectedOrder.customer_name || 'Guest'}</span>
                  </div>
                  {selectedOrder.delivery_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{selectedOrder.delivery_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment:</span>
                    <span className="font-medium">{selectedOrder.payment_method} - {selectedOrder.payment_status}</span>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Address:</span>
                      <span className="font-medium text-sm">{selectedOrder.delivery_address}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={updating || selectedOrder.order_status === status}
                        className={`py-2 rounded-xl text-sm font-medium transition-all ${
                          selectedOrder.order_status === status
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : status === 'DELIVERED' ? 'bg-green-600 text-white hover:bg-green-700'
                            : status === 'CANCELLED' ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffMobileLayout>
  );
}
