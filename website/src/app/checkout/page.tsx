"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import api from "@/lib/api";
import {
  MapPin, Phone, Building, Hash, CreditCard,
  Wallet, Truck, Loader2, CheckCircle, Package
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { items } = useCartStore();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    city: "",
    postal_code: ""
  });

  // Calculate Cart Total
  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (items.length === 0) {
      router.push("/");
      return;
    }

    // Auto-fill their saved profile data!
    const fetchProfileData = async () => {
      try {
        const res = await api.get(`/web/customers/${user.id}/profile`);
        if (res.data.success && res.data.profile) {
          const p = res.data.profile;
          setFormData({
            phone: p.phone || "",
            address: p.address || "",
            city: p.city || "",
            postal_code: p.postal_code || ""
          });
        }
      } catch (error) {
        console.error("Failed to load profile for checkout");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, items.length, router]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    setProcessing(true);

    try {
      const res = await api.post("/web/checkout", {
        items: items,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        customerId: user.id,
        delivery_phone: formData.phone,
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_postal_code: formData.postal_code
      });

      if (res.data.success) {
        // Force a page reload to clear the Zustand cart state and jump to orders
        window.location.href = "/orders";
      }
    } catch (error) {
      alert("Checkout failed. Please try again.");
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

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

            {/* Shipping Form */}
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

            {/* Payment Method */}
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
                    <p className="font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 font-medium">Shipping</span>
                  <span className="font-bold text-green-600">Free</span>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xl font-black text-gray-900">Total</span>
                  <span className="text-3xl font-black text-blue-600">${totalAmount.toFixed(2)}</span>
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