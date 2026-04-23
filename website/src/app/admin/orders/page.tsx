"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore";
import {
  Package, MessageCircle, Send, FileText,
  Save, Loader2, Search, ExternalLink,
  MapPin, Phone, Building, Hash, Ticket, Award // 🔥 Added Ticket & Award
} from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  payment_slip_url: string | null;
  admin_note: string | null;
  created_at: string;

  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;

  discount_code: string | null;
  discount_amount: string | number;

  items: OrderItem[];
}

interface Chat {
  id: number;
  sender_type: string;
  message: string;
  created_at: string;
}

export default function AdminOrdersPage() {
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Expanded State
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Edit Form States
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Chat States
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/web/admin/orders");
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExpandOrder = (order: Order) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(order.id);
      setOrderStatus(order.order_status || "PENDING");
      setPaymentStatus(order.payment_status || "PENDING");
      setAdminNote(order.admin_note || "");
      fetchChats(order.id);
    }
  };

  const fetchChats = async (orderId: number) => {
    try {
      const res = await api.get(`/web/orders/${orderId}/chat`);
      if (res.data.success) setChats(res.data.chats);
    } catch (error) {
      console.error("Failed to fetch chats", error);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !expandedOrderId) return;
    setSendingChat(true);

    try {
      const res = await api.post(`/web/orders/${expandedOrderId}/chat`, {
        sender_type: "ADMIN",
        message: chatMessage
      });
      if (res.data.success) {
        setChats([...chats, res.data.chat]);
        setChatMessage("");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!expandedOrderId) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/web/admin/orders/${expandedOrderId}/advanced`, {
        order_status: orderStatus,
        payment_status: paymentStatus,
        admin_note: adminNote
      });
      if (res.data.success) {
        alert("Order updated successfully!");
        fetchOrders();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update order.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.id.toString().includes(searchTerm) ||
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'DELIVERED': case 'PAID': return 'bg-green-100 text-green-700';
      case 'ONGOING': return 'bg-blue-100 text-blue-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Package className="text-blue-600" size={32} />
            Order Management
          </h1>
          <p className="text-gray-500 mt-2">Approve payments, update statuses, and view shipping details.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search Order ID or Name..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Order ID</th>
                <th className="p-4 font-bold">Customer</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">Payment</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-bold">No orders found.</td></tr>
              ) : filteredOrders.map((order) => (
                <React.Fragment key={order.id}>

                  {/* Order Row */}
                  <tr
                    onClick={() => handleExpandOrder(order)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-black text-gray-900">#{order.id}</td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{order.customer_name || 'Guest'}</p>
                      <p className="text-xs text-gray-500">{order.customer_email || 'No email'}</p>
                    </td>
                    <td className="p-4 font-bold text-gray-900">{currencySymbol}{parseFloat(order.total_amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.payment_status)}`}>
                        {order.payment_method} - {order.payment_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.order_status)}`}>
                        {order.order_status || 'PENDING'}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Control Panel */}
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={5} className="p-0 border-b-4 border-blue-600">
                        <div className="bg-gray-50 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 shadow-inner">

                          {/* Left Side: Shipping, Controls & Slip */}
                          <div className="space-y-6">

                            {/* 🔥 NEW: Order Items & Voucher Summary */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                              <h3 className="font-black text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                                <Package className="text-blue-600" size={18} /> Order Summary
                              </h3>

                              <div className="space-y-3 mb-4 border-b border-gray-100 pb-4">
                                {order.items && order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                    <div>
                                      <span className="font-bold text-gray-900">{item.name}</span>
                                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                                    </div>
                                    <span className="font-medium text-gray-700">{currencySymbol}{parseFloat(item.price).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                  <span>Subtotal</span>
                                  <span>{currencySymbol}{(parseFloat(order.total_amount) + parseFloat(order.discount_amount?.toString() || "0")).toFixed(2)}</span>
                                </div>

                                {order.discount_code && (
                                  <div className="flex justify-between text-rose-600 font-bold">
                                    <span className="flex items-center gap-1"><Ticket size={14}/> Voucher ({order.discount_code})</span>
                                    <span>-{currencySymbol}{parseFloat(order.discount_amount?.toString() || "0").toFixed(2)}</span>
                                  </div>
                                )}

                                <div className="flex justify-between text-gray-900 font-black text-lg pt-2 border-t border-gray-100 mt-2">
                                  <span>Total Paid</span>
                                  <span>{currencySymbol}{parseFloat(order.total_amount).toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center mt-4 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                  <span className="text-amber-700 font-bold flex items-center gap-1.5"><Award size={16}/> Points Earned by Customer</span>
                                  <span className="text-amber-700 font-black">+{Math.floor(parseFloat(order.total_amount) / 10)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Shipping Details Card */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                              <h3 className="font-black text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                                <MapPin className="text-blue-600" size={18} /> Shipping Information
                              </h3>

                              {order.delivery_address ? (
                                <div className="space-y-3 text-sm text-gray-700">
                                  <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <span className="font-medium leading-relaxed">{order.delivery_address}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Building size={16} className="text-gray-400 shrink-0" />
                                    <span className="font-medium">{order.delivery_city}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Hash size={16} className="text-gray-400 shrink-0" />
                                    <span className="font-medium">{order.delivery_postal_code}</span>
                                  </div>
                                  <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                                    <Phone size={16} className="text-gray-400 shrink-0" />
                                    <span className="font-bold text-gray-900">{order.delivery_phone}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                  No shipping information provided for this order. (Likely an old point-of-sale order).
                                </p>
                              )}
                            </div>

                            {/* Status Controls */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                              <h3 className="font-black text-gray-900 border-b border-gray-100 pb-2">Order Controls</h3>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                                  <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="PENDING">PENDING</option>
                                    <option value="PAID">PAID</option>
                                    <option value="FAILED">FAILED</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Delivery Status</label>
                                  <select
                                    value={orderStatus}
                                    onChange={(e) => setOrderStatus(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="PENDING">PENDING</option>
                                    <option value="ONGOING">ONGOING</option>
                                    <option value="DELIVERED">DELIVERED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admin Note (Visible to Customer)</label>
                                <textarea
                                  value={adminNote}
                                  onChange={(e) => setAdminNote(e.target.value)}
                                  placeholder="E.g., We have received your slip and your order is being packed!"
                                  rows={2}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                ></textarea>
                              </div>

                              <button
                                onClick={handleUpdateOrder}
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                              >
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                                Save Changes
                              </button>
                            </div>

                            {/* Payment Slip Viewer */}
                            {order.payment_slip_url && (
                              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                  <h3 className="font-black text-gray-900 flex items-center gap-2"><FileText size={18}/> Payment Slip</h3>
                                  <a href={order.payment_slip_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1">
                                    Open Full <ExternalLink size={14} />
                                  </a>
                                </div>
                                <div className="bg-gray-100 rounded-xl p-2 border border-gray-200 flex justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={order.payment_slip_url}
                                    alt="Payment Slip"
                                    className="max-h-64 object-contain rounded-lg shadow-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Side: Chat System */}
                          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[600px] overflow-hidden shadow-sm">
                            <div className="bg-gray-900 p-4 text-white flex items-center gap-2">
                              <MessageCircle size={18} />
                              <h4 className="font-bold">Customer Chat</h4>
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                              {chats.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm font-medium">
                                  No messages yet.
                                </div>
                              ) : (
                                chats.map((chat) => (
                                  <div key={chat.id} className={`flex ${chat.sender_type === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                      chat.sender_type === 'ADMIN'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                                    }`}>
                                      <p className="text-sm font-bold mb-1 opacity-75 text-[10px] uppercase tracking-wider">{chat.sender_type}</p>
                                      <p className="text-sm">{chat.message}</p>
                                      <p className={`text-[10px] mt-1 text-right ${chat.sender_type === 'ADMIN' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                              <input
                                type="text"
                                placeholder="Reply to customer..."
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                className="flex-1 bg-gray-50 rounded-xl px-4 py-2 outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              <button
                                type="submit"
                                disabled={sendingChat || !chatMessage.trim()}
                                className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {sendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                              </button>
                            </form>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}