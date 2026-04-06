"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Package, Clock, CheckCircle } from "lucide-react";

interface Order {
  id: number;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    api.get("/admin/orders")
      .then(res => { if (res.data?.success) setOrders(res.data.orders); })
      .catch(err => console.error("Failed to load orders:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <Package className="text-blue-600" />
            Order Management
          </h1>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm">
            {orders.length} Total Orders
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500 font-medium animate-pulse">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b-2 border-gray-100">
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Method</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">#{order.id}</td>
                    <td className="p-4 text-gray-600 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-bold text-blue-600">${parseFloat(order.total_amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                        {order.payment_method || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 w-max px-3 py-1 rounded-full text-xs font-bold ${
                        order.payment_status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {order.payment_status === 'PENDING' ? <Clock size={14} /> : <CheckCircle size={14} />}
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {order.payment_status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}