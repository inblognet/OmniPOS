"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import MobileLayout from '@/components/layout/MobileLayout';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function CartPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: '',
    city: '',
    phone: '',
  });

  const total = getTotal();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const res = await api.get(`/web/customers/${user?.id}/profile`);
      if (res.data.success && res.data.profile) {
        setDeliveryDetails({
          address: res.data.profile.address || '',
          city: res.data.profile.city || '',
          phone: res.data.profile.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleUpdateQuantity = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(id);
      toast.success('Item removed');
    } else {
      await updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (checkoutMethod === 'delivery') {
      if (!deliveryDetails.address || !deliveryDetails.city || !deliveryDetails.phone) {
        toast.error('Please fill in all delivery details');
        return;
      }
    }

    setLoading(true);

    try {
      const orderData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: total,
        paymentMethod: 'BANK_TRANSFER',
        customerId: user?.id,
        delivery_type: checkoutMethod.toUpperCase(),
        delivery_address: deliveryDetails.address,
        delivery_city: deliveryDetails.city,
        delivery_phone: deliveryDetails.phone,
      };

      const res = await api.post('/web/checkout', orderData);

      if (res.data.success) {
        toast.success('Order placed successfully!');
        clearCart();
        router.push(`/orders/${res.data.orderId}`);
      } else {
        toast.error(res.data.message || 'Failed to place order');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add items from the shop to get started</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Browse Products
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="pb-36">
        {/* Header */}
        <div className="bg-white px-4 pt-4 pb-4 border-b border-gray-100 sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>
          <p className="text-sm text-gray-500 mt-1">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Cart Items */}
        <div className="px-4 mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex gap-3">
                <img
                  src={item.imageUrl || 'https://placehold.co/100x100?text=Product'}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Product';
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-blue-600 font-bold mt-1">${item.price.toFixed(2)}</p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Method */}
        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Delivery Method</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setCheckoutMethod('delivery')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                checkoutMethod === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              🚚 Delivery
            </button>
            <button
              onClick={() => setCheckoutMethod('pickup')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                checkoutMethod === 'pickup'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              📦 Store Pickup
            </button>
          </div>
        </div>

        {/* Delivery Details */}
        {checkoutMethod === 'delivery' && (
          <div className="px-4 mt-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Delivery Address</h2>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <input
                type="text"
                placeholder="Street Address"
                value={deliveryDetails.address}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="City"
                value={deliveryDetails.city}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={deliveryDetails.phone}
                onChange={(e) => setDeliveryDetails({ ...deliveryDetails, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="px-4 mt-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-lg">Total</span>
                  <span className="font-bold text-2xl text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="px-4 mt-6 mb-8">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform shadow-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={20} />
                Place Order (${total.toFixed(2)})
              </>
            )}
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
