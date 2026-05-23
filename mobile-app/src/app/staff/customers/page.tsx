"use client";

import React, { useEffect, useState } from 'react';
import { Search, Eye, Mail, Phone, MapPin, Award, X } from 'lucide-react';
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
        // Parse numeric values
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage customer profiles</p>
        </div>
      </div>

      <div className="p-6">
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
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center text-gray-500">
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">
                        {customer.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{customer.name || 'Unknown'}</h3>
                      <p className="text-sm text-gray-500 truncate max-w-[150px]">{customer.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-full">
                    <Award size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600">{customer.points || 0}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm border-t border-gray-50 pt-3">
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={14} className="text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs">
                  <span className="text-gray-500">Orders: {customer.total_orders || 0}</span>
                  <span className="text-gray-500 font-medium">Spent: ${(customer.total_spend || 0).toFixed(2)}</span>
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
                <h2 className="text-xl font-bold">Customer Details</h2>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="p-5 space-y-5 overflow-y-auto">
                {/* Avatar and Name */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-2xl">
                      {selectedCustomer.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <p className="text-gray-500 text-sm break-all">{selectedCustomer.email}</p>
                </div>
                
                {/* Contact Information */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Phone:</span>
                    <span className="font-medium text-sm">{selectedCustomer.phone || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Address:</span>
                    <span className="font-medium text-sm">{selectedCustomer.address || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">City:</span>
                    <span className="font-medium text-sm">{selectedCustomer.city || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Member since:</span>
                    <span className="font-medium text-sm">
                      {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Loyalty Points */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Loyalty Points</p>
                      <p className="text-2xl font-bold text-amber-600">{selectedCustomer.points || 0}</p>
                    </div>
                    <button
                      onClick={() => {
                        const newPoints = prompt('Enter new points value:', String(selectedCustomer.points || 0));
                        if (newPoints && !isNaN(parseInt(newPoints))) {
                          updateCustomerPoints(selectedCustomer.id, parseInt(newPoints));
                        }
                      }}
                      disabled={updatingPoints}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      Update Points
                    </button>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedCustomer.total_orders || 0}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">${(selectedCustomer.total_spend || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Total Spent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
