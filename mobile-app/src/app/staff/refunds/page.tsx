"use client";

import React, { useEffect, useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, RefreshCw } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface RefundRequest {
  id: number;
  order_id: number;
  customer_name: string;
  reason: string;
  refund_amount: number;
  status: string;
  created_at: string;
  bank_details: string;
}

export default function StaffRefunds() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  const statuses = ['PENDING', 'APPROVED', 'PROCESSED', 'COMPLETED', 'REJECTED'];

  useEffect(() => {
    fetchRefunds();
  }, []);

  useEffect(() => {
    filterRefunds();
  }, [searchTerm, statusFilter, refunds]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mobile/staff/refunds');
      if (res.data.success) {
        setRefunds(res.data.refunds || []);
        setFilteredRefunds(res.data.refunds || []);
      } else {
        toast.error(res.data.message || 'Failed to load refunds');
      }
    } catch (error: any) {
      console.error('Failed to fetch refunds:', error);
      if (error.response?.status === 404) {
        // Refunds table might not exist yet
        setRefunds([]);
        setFilteredRefunds([]);
      } else {
        toast.error('Failed to load refund requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterRefunds = () => {
    let filtered = [...refunds];
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.order_id.toString().includes(searchTerm) ||
        r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    setFilteredRefunds(filtered);
  };

  const updateRefundStatus = async (refundId: number, newStatus: string) => {
    setProcessing(true);
    try {
      const res = await api.put(`/mobile/staff/refunds/${refundId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Refund ${newStatus.toLowerCase()}`);
        fetchRefunds();
        setSelectedRefund(null);
      }
    } catch (error) {
      toast.error('Failed to update refund status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'APPROVED': 'bg-blue-100 text-blue-700',
      'PROCESSED': 'bg-purple-100 text-purple-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700'
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
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Refund Requests</h1>
            <p className="text-sm text-gray-500">Manage customer refund requests</p>
          </div>
          <button onClick={fetchRefunds} className="p-2 bg-gray-100 rounded-xl">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by order ID or customer..."
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
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Refunds List */}
        {filteredRefunds.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            <DollarSign size={48} className="mx-auto mb-3 opacity-50" />
            <p>No refund requests found</p>
            <p className="text-xs mt-1">When customers request refunds, they will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRefunds.map((refund) => (
              <div
                key={refund.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
                onClick={() => setSelectedRefund(refund)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">Order #{refund.order_id}</p>
                    <p className="text-sm text-gray-500">{refund.customer_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(refund.status)}`}>
                    {refund.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{new Date(refund.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-bold text-red-600">${refund.refund_amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refund Detail Modal */}
        {selectedRefund && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRefund(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Refund Request</h2>
                <button onClick={() => setSelectedRefund(null)} className="text-gray-400">✕</button>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order ID:</span>
                    <span className="font-medium">#{selectedRefund.order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="font-medium">{selectedRefund.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-bold text-red-600">${selectedRefund.refund_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="font-medium">{new Date(selectedRefund.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">Reason</p>
                  <p className="bg-gray-50 p-3 rounded-xl text-sm">{selectedRefund.reason}</p>
                </div>
                
                {selectedRefund.bank_details && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bank Details</p>
                    <p className="bg-gray-50 p-3 rounded-xl text-sm whitespace-pre-wrap">{selectedRefund.bank_details}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateRefundStatus(selectedRefund.id, status)}
                        disabled={processing || selectedRefund.status === status}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedRefund.status === status
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : status === 'APPROVED' ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : status === 'COMPLETED' ? 'bg-green-600 text-white hover:bg-green-700'
                            : status === 'REJECTED' ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
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
