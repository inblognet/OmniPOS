"use client";
import { useCartStore } from "@/store/useCartStore";
import { X, ShoppingBag, Trash2, Banknote, Building } from "lucide-react";
import api from "@/lib/api";
import { useState } from "react";
import axios from "axios";

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, getTotal, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // NEW: Track the selected payment method
  const [paymentMethod, setPaymentMethod] = useState("COD");

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    try {
      // NEW: Send the payment method to the backend
      const response = await api.post("/web/checkout", {
        items: items.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price })),
        totalAmount: getTotal(),
        paymentMethod: paymentMethod
      });

      if (response.data.success) {
        // Custom success messages based on payment method
        let successMessage = `🎉 Order Success! Order ID: ${response.data.orderId}\n\n`;
        if (paymentMethod === "BANK_TRANSFER") {
          successMessage += "Please transfer the total amount to:\nBank: OmniBank\nAcct: 123-456-789\nInclude your Order ID in the reference.";
        } else {
          successMessage += "You selected Cash on Delivery. Please have the exact amount ready upon arrival.";
        }

        alert(successMessage);
        clearCart();
        onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) alert("Checkout failed: " + (err.response?.data?.message || "Error"));
      else if (err instanceof Error) alert("Checkout failed: " + err.message);
      else alert("Checkout failed: Unknown error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <ShoppingBag className="text-blue-600" /> Your Cart
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center bg-white border rounded-xl p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl || "https://placehold.co/100x100"} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-sm font-medium text-blue-600">${item.price.toFixed(2)} <span className="text-gray-400 font-normal">x {item.quantity}</span></p>
                </div>
                <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t bg-gray-50 space-y-6">

            {/* NEW: Payment Method Selector */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700">Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("COD")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'}`}
                >
                  <Banknote size={24} className="mb-1" />
                  <span className="text-xs font-bold">Cash on Delivery</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("BANK_TRANSFER")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'BANK_TRANSFER' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'}`}
                >
                  <Building size={24} className="mb-1" />
                  <span className="text-xs font-bold">Bank Transfer</span>
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-black text-gray-800 mb-4">
                <span>Total</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout} disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                {isProcessing ? "Processing..." : `Place Order (${paymentMethod === 'COD' ? 'COD' : 'Bank'})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}