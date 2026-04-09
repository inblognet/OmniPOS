"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { DollarSign, ShoppingBag, Package, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface Order {
  id: number;
  total_amount: string | number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_name: string | null;
}

interface Product {
  id: number;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch both Orders and Products simultaneously to build the dashboard
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          api.get("/web/admin/orders"),
          api.get("/web/admin/products")
        ]);

        if (ordersRes.data.success) setOrders(ordersRes.data.orders || []);
        if (productsRes.data.success) setProductCount(productsRes.data.products?.length || 0);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- Calculations ---
  // Only calculate revenue for orders that aren't cancelled
  const totalRevenue = orders
    .filter(o => o.payment_status !== 'CANCELLED')
    .reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0);

  const pendingOrders = orders.filter(o => o.payment_status === 'PENDING').length;

  // Get the 5 most recent orders for the quick-view table
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={40} />
            Store Overview
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Welcome back. Here is what is happening with your store today.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            {/* --- STAT CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Revenue Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-100 p-2 rounded-xl text-green-600"><DollarSign size={24} /></div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue</h3>
                </div>
                <p className="text-4xl font-black text-gray-900">${totalRevenue.toFixed(2)}</p>
              </div>

              {/* Total Orders Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ShoppingBag size={24} /></div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Orders</h3>
                </div>
                <p className="text-4xl font-black text-gray-900">{orders.length}</p>
              </div>

              {/* Pending Orders Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><Clock size={24} /></div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pending Fulfillment</h3>
                </div>
                <p className="text-4xl font-black text-gray-900">{pendingOrders}</p>
              </div>

              {/* Product Catalog Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-xl text-purple-600"><Package size={24} /></div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Products</h3>
                </div>
                <p className="text-4xl font-black text-gray-900">{productCount}</p>
              </div>

            </div>

            {/* --- RECENT ORDERS TABLE --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
                <a href="/admin/orders" className="text-blue-600 font-bold text-sm hover:underline">View All Orders &rarr;</a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="p-5 font-bold">Order ID</th>
                      <th className="p-5 font-bold">Customer</th>
                      <th className="p-5 font-bold">Date</th>
                      <th className="p-5 font-bold">Status</th>
                      <th className="p-5 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">No orders yet.</td></tr>
                    ) : recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 font-bold text-gray-900">#{order.id}</td>
                        <td className="p-5 font-medium text-gray-700">{order.customer_name || 'Guest'}</td>
                        <td className="p-5 text-gray-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                            order.payment_status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            order.payment_status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.payment_status === 'COMPLETED' && <CheckCircle size={12}/>}
                            {order.payment_status === 'PENDING' && <Clock size={12}/>}
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="p-5 text-right font-black text-gray-900">${parseFloat(order.total_amount.toString()).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}