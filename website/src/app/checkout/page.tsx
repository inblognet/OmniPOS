"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useToastStore } from "@/store/useToastStore";
import api from "@/lib/api";
import axios from "axios";
import {
  MapPin, Phone, Building, Hash, CreditCard,
  Wallet, Truck, Loader2, CheckCircle, Package, Ticket, X, Gift,
  FileText, Receipt // 🔥 Added for the new download buttons
} from "lucide-react";

interface Voucher {
  id: number;
  code: string;
  discount_percentage: number;
  description: string;
  claim_status: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const { items, clearCart } = useCartStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  // 🔥 NEW: State to hold the placed Order ID so we can show the success screen
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    city: "",
    postal_code: ""
  });

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{code: string, percentage: number} | null>(null);
  const [voucherMessage, setVoucherMessage] = useState({ text: "", type: "" });
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const [claimedVouchers, setClaimedVouchers] = useState<Voucher[]>([]);

  const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = appliedVoucher ? (subTotal * (appliedVoucher.percentage / 100)) : 0;
  const finalTotal = subTotal - discountAmount;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Only redirect if they haven't just placed an order
    if (items.length === 0 && !placedOrderId) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const resProfile = await api.get(`/web/customers/${user.id}/profile`);
        if (resProfile.data.success && resProfile.data.profile) {
          const p = resProfile.data.profile;
          setFormData({ phone: p.phone || "", address: p.address || "", city: p.city || "", postal_code: p.postal_code || "" });
        }

        const resVouchers = await api.get("/web/vouchers/public", { params: { customerId: user.id } });
        if (resVouchers.data.success && resVouchers.data.vouchers) {
          const available = resVouchers.data.vouchers.filter((v: Voucher) => v.claim_status === 'CLAIMED');
          setClaimedVouchers(available);
        }
      } catch (error) {
        console.error("Failed to load checkout data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  const handleApplyVoucher = async (codeToApply: string = voucherCode) => {
    if (!codeToApply.trim()) return;
    setValidatingVoucher(true);
    setVoucherMessage({ text: "", type: "" });

    try {
      const res = await api.post("/web/vouchers/validate", {
        code: codeToApply,
        customerId: user?.id
      });

      if (res.data.success) {
        setAppliedVoucher({ code: codeToApply.toUpperCase(), percentage: res.data.discount_percentage });
        setVoucherMessage({ text: `${res.data.description}`, type: "success" });
        setVoucherCode("");
        addToast(`Voucher ${codeToApply.toUpperCase()} applied!`, "success");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setVoucherMessage({ text: err.response?.data?.message || "Invalid or expired code.", type: "error" });
      } else {
        setVoucherMessage({ text: "Invalid or expired code.", type: "error" });
      }
      setAppliedVoucher(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoVoucher = params.get("voucher");

    if (autoVoucher) {
      handleApplyVoucher(autoVoucher);
      window.history.replaceState(null, '', '/checkout');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherMessage({ text: "", type: "" });
    addToast("Voucher removed", "info");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setProcessing(true);

    try {
      const res = await api.post("/web/checkout", {
        items: items,
        totalAmount: finalTotal,
        paymentMethod: paymentMethod,
        customerId: user.id,
        delivery_phone: formData.phone,
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_postal_code: formData.postal_code,
        discount_code: appliedVoucher?.code || null,
        discount_amount: discountAmount
      });

      if (res.data.success) {
        addToast("Order placed successfully! Thank you for shopping with us.", "success");
        clearCart();

        // 🔥 Try to grab the new Order ID from the backend response.
        // If it exists, show the Success Screen! If not, fallback to the orders page.
        const newOrderId = res.data.orderId || res.data.order_id || res.data.id;
        if (newOrderId) {
          setPlacedOrderId(newOrderId);
        } else {
          router.push("/orders");
        }
      }
    } catch (error) {
      console.error(error);
      addToast("Checkout failed. Please try again.", "error");
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  // 🔥 NEW: THE SUCCESS SCREEN (Shows instead of checkout form if order is placed)
  if (placedOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-8 font-medium">Your order <span className="font-bold text-gray-900">#{placedOrderId}</span> has been successfully placed.</p>

          <div className="space-y-4">
            {/* Note: templateId=3 is the Arkham A4 Template we just added to your DB */}
            <a
              href={`${API_BASE_URL}/web/orders/${placedOrderId}/download-pdf?templateId=3`}
              target="_blank" rel="noreferrer"
              className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors border border-indigo-100 shadow-sm"
            >
              <FileText size={20} /> Download PDF Invoice
            </a>

            {/* Note: templateId=4 is the Sahanu Thermal Template we just added to your DB */}
            <a
              href={`${API_BASE_URL}/web/orders/${placedOrderId}/download-pdf?templateId=4`}
              target="_blank" rel="noreferrer"
              className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors border border-orange-100 shadow-sm"
            >
              <Receipt size={20} /> Download Thermal Receipt
            </a>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => router.push('/orders')}
                className="w-full bg-gray-900 text-white hover:bg-black py-4 rounded-xl font-bold transition-colors shadow-md"
              >
                View Order Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ORIGINAL CHECKOUT FORM ---
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900 flex items-center justify-center gap-3">
            <CheckCircle className="text-green-500" size={40} />
            Secure Checkout
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Review your items and confirm your shipping details.</p>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: Shipping & Payment */}
          <div className="lg:col-span-2 space-y-8">

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Truck className="text-blue-600" /> Delivery Details
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input required type="tel" placeholder="Mobile Number" className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Street Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                    <textarea required rows={3} placeholder="Full delivery address" className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} ></textarea>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input required type="text" placeholder="City" className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input required type="text" placeholder="Zip / Postal" className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="text-blue-600" /> Payment Method
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center gap-3 ${paymentMethod === 'BANK_TRANSFER' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'}`}>
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'BANK_TRANSFER'} onChange={() => setPaymentMethod('BANK_TRANSFER')} />
                  <CreditCard size={32} />
                  <span className="font-bold">Bank Transfer</span>
                </label>

                <label className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center gap-3 ${paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'}`}>
                  <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                  <Wallet size={32} />
                  <span className="font-bold">Cash on Delivery</span>
                </label>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Package className="text-blue-600" /> Order Summary
              </h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 border-b border-gray-50 pb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200" />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 line-clamp-1 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-black text-gray-900">{currencySymbol}{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {claimedVouchers.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Gift size={14} className="text-rose-500" /> Your Claimed Vouchers
                  </h4>
                  {claimedVouchers.map(v => {
                    const isApplied = appliedVoucher?.code === v.code;
                    return (
                      <div key={v.id} className={`flex items-center justify-between border p-3 rounded-xl transition-colors ${isApplied ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-100 hover:border-rose-300'}`}>
                        <div>
                          <p className={`text-sm font-black tracking-widest ${isApplied ? 'text-green-700' : 'text-rose-600'}`}>{v.code}</p>
                          <p className={`text-xs font-medium mt-0.5 ${isApplied ? 'text-green-600' : 'text-rose-500'}`}>{v.discount_percentage}% OFF</p>
                        </div>
                        {isApplied ? (
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-green-200 shadow-sm">
                            <CheckCircle size={14} className="text-green-600"/>
                            <span className="text-xs font-bold text-green-700">Applied</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(v.code)}
                            disabled={validatingVoucher || !!appliedVoucher}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${!!appliedVoucher ? 'bg-rose-200 text-rose-400 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {!appliedVoucher ? (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Or enter code manually..."
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold tracking-widest uppercase outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyVoucher()}
                        disabled={validatingVoucher || !voucherCode}
                        className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {validatingVoucher ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {voucherMessage.text && (
                      <p className={`text-xs font-bold mt-2 pl-1 ${voucherMessage.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                        {voucherMessage.text}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                    <div>
                      <p className="text-sm font-black text-green-700 tracking-widest">{appliedVoucher.code}</p>
                      <p className="text-xs font-medium text-green-600 mt-0.5">{voucherMessage.text}</p>
                    </div>
                    <button type="button" onClick={removeVoucher} className="text-green-700 hover:text-red-500 bg-white p-1.5 rounded-lg border border-green-200 shadow-sm transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="font-bold text-gray-900">{currencySymbol}{subTotal.toFixed(2)}</span>
                </div>

                {appliedVoucher && (
                  <div className="flex justify-between items-center mb-2 text-green-600">
                    <span className="font-bold flex items-center gap-1"><Ticket size={14}/> Discount ({appliedVoucher.percentage}%)</span>
                    <span className="font-black">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 font-medium">Shipping</span>
                  <span className="font-bold text-green-600">Free</span>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xl font-black text-gray-900">Total</span>
                  <span className="text-3xl font-black text-blue-600">{currencySymbol}{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? <Loader2 size={24} className="animate-spin" /> : "Confirm & Place Order"}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}