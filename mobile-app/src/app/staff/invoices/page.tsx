"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Printer, Search, Calendar, DollarSign, User, Package } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_number: string;
  order_id: number;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  pdf_url: string;
}

export default function StaffInvoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchTerm, invoices]);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/mobile/staff/invoices');
      if (res.data.success) {
        setInvoices(res.data.invoices);
        setFilteredInvoices(res.data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];
    if (searchTerm) {
      filtered = filtered.filter(i => 
        i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.order_id.toString().includes(searchTerm)
      );
    }
    setFilteredInvoices(filtered);
  };

  const generateInvoice = async () => {
    if (!orderId) {
      toast.error('Please enter an order ID');
      return;
    }
    
    setGenerating(true);
    try {
      const res = await api.post('/mobile/staff/invoices/generate', { order_id: parseInt(orderId) });
      if (res.data.success) {
        toast.success('Invoice generated successfully');
        setShowGenerateModal(false);
        setOrderId('');
        fetchInvoices();
        
        // Download PDF
        if (res.data.pdf_url) {
          window.open(res.data.pdf_url, '_blank');
        }
      }
    } catch (error) {
      toast.error('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const downloadInvoice = async (invoiceId: number) => {
    try {
      const res = await api.get(`/mobile/staff/invoices/${invoiceId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PAID': 'bg-green-100 text-green-700',
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'OVERDUE': 'bg-red-100 text-red-700',
      'CANCELLED': 'bg-gray-100 text-gray-700'
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
            <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500">Manage and generate invoices</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          >
            <FileText size={16} />
            New Invoice
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by invoice #, order # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Invoices List */}
        <div className="space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>No invoices found</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-3 text-blue-600 text-sm"
              >
                Generate your first invoice
              </button>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500">Order #{invoice.order_id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm text-gray-600">{invoice.customer_name}</p>
                    <p className="text-xs text-gray-400">{new Date(invoice.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-lg font-bold text-blue-600">${invoice.total_amount.toFixed(2)}</p>
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => downloadInvoice(invoice.id)}
                    className="flex-1 py-2 bg-gray-100 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    onClick={() => window.open(invoice.pdf_url, '_blank')}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Printer size={16} />
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Generate Invoice Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerateModal(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Generate Invoice</h2>
                <button onClick={() => setShowGenerateModal(false)} className="text-gray-400">✕</button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input
                    type="number"
                    placeholder="Enter order ID"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter the order number to generate an invoice</p>
                </div>
                
                <button
                  onClick={generateInvoice}
                  disabled={generating || !orderId}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffMobileLayout>
  );
}
