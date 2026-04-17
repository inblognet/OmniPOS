"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import api from "@/lib/api";
import {
  Package, UploadCloud, MessageCircle, Send, Star,
  CheckCircle, Loader2, Info, X, Clock, Box, Truck
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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [submittingReview, setSubmittingReview] = useState(false);

  // 1. Fetch Orders
  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/web/customer/${user.id}/orders`);
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
    if (!user) {
      router.push("/login");
    } else {
      fetchOrders();
    }
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
        alert("Slip uploaded successfully! Admin will review it soon.");
        fetchOrders(); // Refresh order data
      }
    } catch (error) {
      alert("Failed to upload slip. Try again.");
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
      alert("Failed to send message.");
    } finally {
      setSendingChat(false);
    }
  };

  // 5. Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal || !user) return;
    setSubmittingReview(true);

    try {
      const res = await api.post(`/web/products/${reviewModal.productId}/reviews`, {
        customerId: user.id,
        orderId: reviewModal.orderId,
        rating,
        comment
      });
      if (res.data.success) {
        alert("Review submitted successfully! Thank you!");
        setReviewModal(null);
        setRating(5);
        setComment("");
      }
    } catch (error) {
      alert("Failed to submit review. You may have already reviewed this.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'DELIVERED': return 'bg-green-100 text-green-700 border-green-200';
      case 'ONGOING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  // 🔥 NEW: Progress Bar Helper
  const getProgressLevel = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return 3;
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
                          {order.order_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </p>

                      {/* 🔥 NEW: Visual Progress Bar */}
                      {order.order_status !== 'CANCELLED' && (
                        <div className="mt-6 flex items-center max-w-md w-full relative">
                          {/* Background Track */}
                          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0"></div>
                          {/* Active Blue Fill */}
                          <div className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 rounded-full z-0 transition-all duration-500" style={{ width: progress === 1 ? '0%' : progress === 2 ? '50%' : '100%' }}></div>

                          {/* Step 1: Pending */}
                          <div className="relative z-10 flex flex-col items-center justify-center bg-white">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-colors ${progress >= 1 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-300'}`}>
                              <Clock size={16} className={progress >= 1 ? 'animate-pulse' : ''}/>
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

                    <div className="text-left md:text-right mt-6 md:mt-0 md:self-start">
                      <p className="text-2xl font-black text-gray-900">${parseFloat(order.total_amount).toFixed(2)}</p>
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{order.payment_method} - {order.payment_status}</p>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {expandedOrderId === order.id && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">

                      {/* Left Column: Items & Slip */}
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
                                  <p className="text-sm text-gray-500">Qty: {item.quantity} x ${parseFloat(item.price).toFixed(2)}</p>
                                </div>

                                {/* Leave Review Button (Only if Delivered!) */}
                                {order.order_status === 'DELIVERED' && (
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
                        </div>

                        {/* Payment Slip Upload (Only for Bank/COD if not paid) */}
                        {order.payment_status !== 'PAID' && (
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
                      </div>

                      {/* Right Column: Chat System */}
                      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[400px] overflow-hidden">
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
                disabled={submittingReview}
                className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-black py-4 rounded-xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                {submittingReview ? <Loader2 className="animate-spin" /> : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}