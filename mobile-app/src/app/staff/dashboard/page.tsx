"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function StaffDashboard() {
  const { user, isLoading } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
          <p className="text-gray-600">Welcome, {user?.name}!</p>
          <p className="text-sm text-gray-500 mt-1">Role: {user?.role || user?.user_type}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-2">
              <p className="text-gray-600">User ID: {user?.id}</p>
              <p className="text-gray-600">Email: {user?.email}</p>
              <p className="text-gray-600">Type: {user?.user_type}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/staff/orders')}
                className="w-full text-left px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                📦 Manage Orders
              </button>
              <button 
                onClick={() => router.push('/staff/customers')}
                className="w-full text-left px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                👥 View Customers
              </button>
              <button 
                onClick={() => router.push('/staff/refunds')}
                className="w-full text-left px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
              >
                💰 Process Refunds
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('mobile_token');
              localStorage.removeItem('mobile_user');
              window.location.href = '/login';
            }}
            className="text-red-600 underline"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
