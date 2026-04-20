"use client";
import { useCartStore } from "@/store/useCartStore";
import { X, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, getTotal } = useCartStore();
  const router = useRouter();

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
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-black text-gray-800 mb-6">
                <span>Subtotal</span>
                <span>${getTotal().toFixed(2)}</span>
              </div>

              <button
                onClick={() => {
                  onClose(); // Close the drawer
                  router.push("/checkout"); // Jump to the new checkout page!
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}