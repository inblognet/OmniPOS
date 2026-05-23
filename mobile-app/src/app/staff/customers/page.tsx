"use client";

import React, { useEffect, useState } from 'react';
import { Search, Phone, MapPin, Award, X } from 'lucide-react';
import StaffMobileLayout from '@/components/staff/StaffLayout';
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
  const [updatingPoints, setUpdatingPoints] = useState(false);

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
        const parsedCustomers = res.data.customers.map((c: any) => ({
          ...c,
          points: parseFloat(c.points) || 0,
          total_spend: parseFloat(c.total_spend) || 0,
          total_orders: parseInt(c.total_orders) || 0
        }));
        setCustomers(parsedCustomers);
        setFilteredCustomers(parsedCustomers);
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
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      );
    }
    setFilteredCustomers(filtered);
  };

  const updateCustomerPoints = async (customerId: number, points: number) => {
    setUpdatingPoints(true);
    try {
      const res = await api.put(`/mobile/staff/customers/${customerId}/points`, { points });
      if (res.data.success) {
        toast.success('Customer points updated');
        fetchCustomers();
        setSelectedCustomer(null);
      }
    } catch (error) {
      toast.error('Failed to update points');
    } finally {
      setUpdatingPoints(false);
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
        <h1 className="text-xl font-bold text-gray-900 mb-1">Customers</h1>
        <p className="text-sm text-gray-500 mb-4">Manage customer profiles</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Customers List */}
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-gray-50"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-md">
                        {customer.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{customer.name || 'Unknown'}</h3>
                      <p className="text-xs text-gray-500 truncate">{customer.email || 'No email'}</p>
                      {customer.phone && (
                        <p className="text-xs text-gray-400 mt-1">{customer.phone}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">
                      <Award size={12} className="text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600">{customer.points || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCustomer(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold">Customer Details</h2>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                {/* Avatar and Name */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-600 font-bold text-xl">
                      {selectedCustomer.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <p className="text-xs text-gray-500 break-all">{selectedCustomer.email}</p>
                </div>
                
                {/* Contact Information */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Phone:</span>
                    <span className="font-medium text-sm">{selectedCustomer.phone || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Address:</span>
                    <span className="font-medium text-sm">{selectedCustomer.address || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">City:</span>
                    <span className="font-medium text-sm">{selectedCustomer.city || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Member since:</span>
                    <span className="font-medium text-sm">
                      {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Loyalty Points */}
                <div className="bg-amber-50 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-600">Loyalty Points</p>
                      <p className="text-xl font-bold text-amber-600">{selectedCustomer.points || 0}</p>
                    </div>
                    <button
                      onClick={() => {
                        const newPoints = prompt('Enter new points value:', String(selectedCustomer.points || 0));
                        if (newPoints && !isNaN(parseInt(newPoints))) {
                          updateCustomerPoints(selectedCustomer.id, parseInt(newPoints));
                        }
                      }}
                      disabled={updatingPoints}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      Update Points
                    </button>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{selectedCustomer.total_orders || 0}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">${(selectedCustomer.total_spend || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Total Spent</p>
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
