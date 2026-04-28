"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useToastStore } from "@/store/useToastStore";
import api from "@/lib/api";
import {
  Package, UploadCloud, MessageCircle, Send, Star,
  CheckCircle, Loader2, Info, X, Clock, Box, Truck, FileDown, Ticket, Award,
  Undo2, AlertCircle, XCircle // 🔥 Added new icons for the refund system
} from "lucide-react";

interface OrderItem {
  product_id: number;
  name: string;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  payment_slip_url: string | null;
  admin_note: string | null;
  created_at: string;
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

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const currencySymbol = useSettingsStore((state) => state.currencySymbol);
  const { addToast } = useToastStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Refund Policy State
  const [policy, setPolicy] = useState({ refund_policy: "", refund_duration_days: 7, refund_processing_days: 3 });

  // UI States
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState<number | null>(null);

  // Chat States
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Review States
  const [reviewModal, setReviewModal] = useState<{ productId: number; orderId: number; productName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 🔥 Refund Flow States
  const [requestingOrderId, setRequestingOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  // 🔥 Feedback Flow States
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [feedback, setFeedback] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // 1. Fetch Orders & Policy
  const fetchOrdersAndPolicy = async () => {
    if (!user) return;
    try {
      const [ordersRes, policyRes] = await Promise.all([
        api.get(`/web/customer/${user.id}/orders`),
        api.get(`/web/settings/refund-policy`).catch(() => ({ data: { success: false } })) // Catch gracefully if endpoint fails
      ]);

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.orders || []);
      }
      if (policyRes.data && policyRes.data.success) {
        setPolicy(policyRes.data.policy);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      addToast("Failed to fetch your orders.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchOrdersAndPolicy();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  // 2. Fetch Chats when an order is expanded
  useEffect(() => {
    if (expandedOrderId) {
      api.get(`/web/orders/${expandedOrderId}/chat`).then(res => {
        if (res.data.success) setChats(res.data.chats);
      });
    }
  }, [expandedOrderId]);

  // 3. Upload Payment Slip
  const handleSlipUpload = async (orderId: number, file: File) => {
    setUploadingSlip(orderId);
    const formData = new FormData();
    formData.append("slip", file);

    try {
      const res = await api.post(`/web/orders/${orderId}/slip`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        addToast("Slip uploaded successfully! Admin will review it soon.", "success");
        fetchOrdersAndPolicy();
      }
    } catch (error) {
      addToast("Failed to upload slip. Please try again.", "error");
    } finally {
      setUploadingSlip(null);
    }
  };

  // 4. Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !expandedOrderId) return;
    setSendingChat(true);

    try {
      const res = await api.post(`/web/orders/${expandedOrderId}/chat`, {
        sender_type: "CUSTOMER",
        message: chatMessage
      });
      if (res.data.success) {
        setChats([...chats, res.data.chat]);
        setChatMessage("");
      }
    } catch (error) {
      addToast("Failed to send message.", "error");
    } finally {
      setSendingChat(false);
    }
  };

  // 5. Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal || !user) return;
    setSubmitting(true);

    try {
      const res = await api.post(`/web/products/${reviewModal.productId}/reviews`, {
        customerId: user.id,
        orderId: reviewModal.orderId,
        rating,
        comment
      });
      if (res.data.success) {
        addToast("Review submitted successfully! Thank you!", "success");
        setReviewModal(null);
        setRating(5);
        setComment("");
      }
    } catch (error) {
      addToast("Failed to submit review. You may have already reviewed this.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 6. Submit Refund Request
  const submitRefundRequest = async (order: Order | undefined) => {
    if (!order) return;
    if (!refundReason || !bankDetails) return addToast("Please fill all fields", "error");
    setSubmitting(true);

    try {
      const res = await api.post(`/web/orders/${order.id}/refund`, {
        customerId: user?.id,
        reason: refundReason,
        bankDetails: bankDetails,
        refundAmount: order.total_amount
      });
      if (res.data.success) {
        addToast("Refund requested successfully", "success");
        setRequestingOrderId(null);
        setRefundReason("");
        setBankDetails("");
        fetchOrdersAndPolicy(); // Refresh status
      }
    } catch (error) {
      addToast("Failed to submit request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 7. Confirm Refund Receipt
  const submitConfirmReceipt = async (status: 'COMPLETED' | 'NOT_RECEIVED') => {
    if (!confirmingOrder) return;
    setSubmitting(true);

    try {
      const res = await api.put(`/web/orders/${confirmingOrder.id}/refund/confirm`, {
        status: status,
        feedback: feedback
      });
      if (res.data.success) {
        addToast(status === 'COMPLETED' ? "Thank you for confirming!" : "We will investigate this immediately.", "info");
        setConfirmingOrder(null);
        setFeedback("");
        fetchOrdersAndPolicy(); // Refresh status
      }
    } catch (error) {
      addToast("Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      case 'ONGOING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
      case 'NOT_RECEIVED':
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'REFUND_REQUESTED': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'PROCESSED': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getProgressLevel = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DELIVERED' || s === 'REFUND_REQUESTED' || s === 'PROCESSED' || s === 'COMPLETED') return 3;
    if (s === 'ONGOING') return 2;
    if (s === 'PENDING') return 1;
    return 0; // Cancelled
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">

        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <Package className="text-blue-600" size={40} />
            My Orders
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Track your deliveries, upload payment slips, and manage your purchases.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No orders yet</h3>
            <p className="text-gray-500 mt-2">When you buy something, it will appear here!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const progress = getProgressLevel(order.order_status);
              const subtotal = parseFloat(order.total_amount) + parseFloat(order.discount_amount?.toString() || "0");

              return (
                <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

                  {/* Order Header (Always Visible) */}
                  <div
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-black text-gray-900">Order #{order.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.order_status)}`}>
                          {order.order_status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </p>

                      {/* Visual Progress Bar */}
                      {order.order_status !== 'CANCELLED' && (
                        <div className="mt-6 flex items-center max-w-md w-full relative">
                          {/* Background Track */}
                          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0"></div>
                          {/* Active Blue Fill */}
                          <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full z-0 transition-all duration-500" style={{ width: progress === 1 ? '0%' : progress === 2 ? '50%' : '100%' }}></div>

                          {/* Step 1: Pending */}
                          <div className="relative z-10 flex flex-col items-center justify-center bg-white">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 1 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-300'}`}>
                              <Clock size={16} className={progress === 1 ? 'animate-pulse' : ''}/>
                            </div>
                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider absolute -bottom-5 ${progress >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>Pending</span>
                          </div>

                          <div className="flex-1"></div>

                          {/* Step 2: Ongoing */}
                          <div className="relative z-10 flex flex-col items-center justify-center bg-white">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 2 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-300'}`}>
                              <Box size={16} />
                            </div>
                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider absolute -bottom-5 ${progress >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>Ongoing</span>
                          </div>

                          <div className="flex-1"></div>

                          {/* Step 3: Delivered */}
                          <div className="relative z-10 flex flex-col items-center justify-center bg-white">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 3 ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 bg-white text-gray-300'}`}>
                              <CheckCircle size={16} />
                            </div>
                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider absolute -bottom-5 ${progress >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>Delivered</span>
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="text-left md:text-right mt-6 md:mt-0 md:self-start flex flex-col md:items-end gap-3">
                      <div>
                        <p className="text-2xl font-black text-gray-900">{currencySymbol}{parseFloat(order.total_amount).toFixed(2)}</p>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{order.payment_method} - {order.payment_status}</p>
                      </div>

                      <a
                        href={`${API_BASE_URL}/web/orders/${order.id}/download-pdf?type=INVOICE`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileDown size={16} /> Download Invoice
                      </a>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {expandedOrderId === order.id && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">

                      {/* Left Column: Items, Slip & Refunds */}
                      <div className="space-y-6">

                        {/* Admin Note Alert */}
                        {order.admin_note && (
                          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 text-blue-800">
                            <Info size={20} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-sm">Note from OmniStore</p>
                              <p className="text-sm mt-1">{order.admin_note}</p>
                            </div>
                          </div>
                        )}

                        {/* Items List */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <h4 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Order Items</h4>
                          <div className="space-y-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-bold text-gray-900">{item.name}</p>
                                  <p className="text-sm text-gray-500">Qty: {item.quantity} x {currencySymbol}{parseFloat(item.price).toFixed(2)}</p>
                                </div>

                                {/* Leave Review Button (Only if Delivered!) */}
                                {(order.order_status === 'DELIVERED' || order.order_status === 'COMPLETED') && (
                                  <button
                                    onClick={() => setReviewModal({ productId: item.product_id, orderId: order.id, productName: item.name })}
                                    className="text-xs font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                                  >
                                    <Star size={14} /> Review
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Voucher & Points Summary inside the card */}
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                              <span>Subtotal</span>
                              <span>{currencySymbol}{subtotal.toFixed(2)}</span>
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

                            {/* Reward Points Badge */}
                            <div className="flex justify-between items-center mt-4 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                              <span className="text-amber-700 font-bold flex items-center gap-1.5"><Award size={16}/> Points Earned</span>
                              <span className="text-amber-700 font-black">+{Math.floor(parseFloat(order.total_amount) / 10)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Slip Upload (Only for Bank/COD if not paid) */}
                        {order.payment_status !== 'PAID' && order.order_status !== 'CANCELLED' && (
                          <div className="bg-white p-4 rounded-2xl border border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-2">Payment Verification</h4>
                            {order.payment_slip_url ? (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-200">
                                <CheckCircle size={20} />
                                <span className="text-sm font-bold">Slip uploaded! Awaiting admin approval.</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-gray-500 mb-4">Please upload your bank transfer or deposit slip to confirm your order.</p>
                                <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                  uploadingSlip === order.id ? "bg-gray-100 border-gray-200 text-gray-400" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                                }`}>
                                  {uploadingSlip === order.id ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                                  <span className="font-bold text-sm">
                                    {uploadingSlip === order.id ? "Uploading..." : "Upload Slip"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingSlip === order.id}
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) handleSlipUpload(order.id, e.target.files[0]);
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 🔥 REFUND SECTION */}
                        {['DELIVERED', 'REFUND_REQUESTED', 'PROCESSED', 'COMPLETED'].includes(order.order_status.toUpperCase()) && (
                          <div className="bg-white p-4 rounded-2xl border border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Undo2 size={18}/> Order Refund</h4>

                            {order.order_status === 'DELIVERED' && (
                              <div className="flex flex-col gap-3">
                                <p className="text-sm text-gray-500">Not satisfied? You can request a refund within {policy.refund_duration_days} days of delivery.</p>
                                <button onClick={() => setRequestingOrderId(order.id)} className="text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-rose-100 self-start">
                                  Request Refund
                                </button>
                              </div>
                            )}

                            {order.order_status === 'REFUND_REQUESTED' && (
                              <p className="text-sm font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-2">
                                <Clock size={18}/> Request under review by admin team.
                              </p>
                            )}

                            {order.order_status === 'PROCESSED' && (
                              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col gap-3">
                                <p className="text-sm font-bold text-indigo-800 flex items-start gap-2">
                                  <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                                  Admin has processed your refund and sent the bank slip. Please check your account.
                                </p>
                                <button onClick={() => setConfirmingOrder(order)} className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold px-4 py-2 rounded-lg text-sm self-start">
                                  Review & Confirm Receipt
                                </button>
                              </div>
                            )}

                            {order.order_status === 'COMPLETED' && (
                              <p className="text-sm font-bold text-green-600 bg-green-50 p-3 rounded-xl border border-green-200 flex items-center gap-2">
                                <CheckCircle size={18}/> Refund Completed Successfully.
                              </p>
                            )}
                          </div>
                        )}

                      </div>

                      {/* Right Column: Chat System */}
                      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[500px] overflow-hidden">
                        <div className="bg-gray-900 p-4 text-white flex items-center gap-2">
                          <MessageCircle size={18} />
                          <h4 className="font-bold">Order Support Chat</h4>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                          {chats.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm font-medium">
                              No messages yet.<br/>Send a message to contact support.
                            </div>
                          ) : (
                            chats.map((chat) => (
                              <div key={chat.id} className={`flex ${chat.sender_type === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                  chat.sender_type === 'CUSTOMER'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                                }`}>
                                  <p className="text-sm">{chat.message}</p>
                                  <p className={`text-[10px] mt-1 text-right ${chat.sender_type === 'CUSTOMER' ? 'text-blue-200' : 'text-gray-400'}`}>
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
                            placeholder="Type a message..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            className="flex-1 bg-gray-50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- REVIEW MODAL --- */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setReviewModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-1">
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black text-gray-900 mb-2">Leave a Review</h2>
            <p className="text-gray-500 text-sm mb-6">How did you like <span className="font-bold text-gray-900">{reviewModal.productName}</span>?</p>

            <form onSubmit={handleSubmitReview} className="space-y-6">
              {/* Star Selector */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={40}
                      className={`${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your Comment</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell others what you thought about this product..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-amber-400 resize-none text-sm"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-black py-4 rounded-xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" /> : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 REQUEST REFUND MODAL */}
      {requestingOrderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setRequestingOrderId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Request Refund</h2>

            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl mb-6 text-sm text-rose-800 font-medium">
              <strong className="font-black">Policy:</strong> {policy.refund_policy} <br/>
              Processing usually takes {policy.refund_processing_days} business days.
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reason for Refund</label>
                <textarea rows={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Please explain why you need a refund..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500"></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bank Details for Transfer</label>
                <textarea rows={2} value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} placeholder="Bank Name, Account Name, Account Number, Branch" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500"></textarea>
              </div>
            </div>

            <button onClick={() => submitRefundRequest(orders.find(o => o.id === requestingOrderId))} disabled={submitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50">
              {submitting ? <Loader2 className="animate-spin" size={20}/> : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {/* 🔥 CONFIRM RECEIPT MODAL */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setConfirmingOrder(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><XCircle size={24} /></button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Confirm Refund</h2>
            <p className="text-gray-500 mb-6 text-sm">Please confirm if the funds have reached your account.</p>

            <textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Leave a feedback message for the admin (Optional)..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 mb-6"></textarea>

            <div className="flex gap-3">
              <button onClick={() => submitConfirmReceipt('COMPLETED')} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle size={18}/> Received
              </button>
              <button onClick={() => submitConfirmReceipt('NOT_RECEIVED')} disabled={submitting} className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-black py-3 rounded-xl transition-colors">
                Not Received
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}