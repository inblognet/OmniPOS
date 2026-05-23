"use client";

import React, { useEffect, useState } from 'react';
import { Search, Eye, Edit2, Mail, Phone, MapPin, Award } from 'lucide-react';
import StaffLayout from '@/components/staff/StaffLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  points: number;
  total_spend: number;
  total_orders: number;
  created_at: string;
}

export default function StaffCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/mobile/staff/customers');
      if (res.data.success) {
        setCustomers(res.data.customers);
        setFilteredCustomers(res.data.customers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    }
    setFilteredCustomers(filtered);
  };

  const updateCustomerPoints = async (customerId: number, points: number) => {
    try {
      const res = await api.put(`/mobile/staff/customers/${customerId}/points`, { points });
      if (res.data.success) {
        toast.success('Customer points updated');
        fetchCustomers();
        setSelectedCustomer(null);
      }
    } catch (error) {
      toast.error('Failed to update points');
    }
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Management</h1>
        <p className="text-gray-500 mb-6">View and manage customer profiles</p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                  <Award size={14} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">{customer.points || 0}</span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs">
                <span className="text-gray-500">Orders: {customer.total_orders || 0}</span>
                <span className="text-gray-500">Spent: ${customer.total_spend?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">Customer Details</h2>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400">✕</button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-2xl">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                  <p className="text-gray-500">{selectedCustomer.email}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{selectedCustomer.phone || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{selectedCustomer.address || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{selectedCustomer.city || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member since:</span>
                    <span className="font-medium">{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Loyalty Points</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-amber-600">{selectedCustomer.points || 0}</span>
                      <button
                        onClick={() => {
                          const newPoints = prompt('Enter new points value:', String(selectedCustomer.points || 0));
                          if (newPoints) {
                            updateCustomerPoints(selectedCustomer.id, parseInt(newPoints));
                          }
                        }}
                        className="px-2 py-1 bg-amber-100 rounded-lg text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedCustomer.total_orders || 0}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">${selectedCustomer.total_spend?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">Total Spent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
