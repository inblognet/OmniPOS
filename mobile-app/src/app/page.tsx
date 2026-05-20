'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, ShoppingBag, Package, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('mobile_token');
    if (token) {
      const user = localStorage.getItem('mobile_user');
      if (user) {
        const userData = JSON.parse(user);
        if (userData.user_type === 'customer') {
          router.push('/dashboard');
        } else {
          router.push('/staff/dashboard');
        }
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="px-4 py-12 flex flex-col min-h-screen">
        {/* Logo */}
        <div className="text-center mt-20 mb-12">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-lg">
            <Smartphone size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white">OmniPOS Mobile</h1>
          <p className="text-white/80 mt-2 text-lg">Your store in your pocket</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Easy Shopping</p>
              <p className="text-white/70 text-sm">Browse and order with one tap</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Real-time Tracking</p>
              <p className="text-white/70 text-sm">Track your orders instantly</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Secure Payments</p>
              <p className="text-white/70 text-sm">Multiple payment options available</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 mt-auto">
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-white text-blue-600 font-bold py-4 rounded-2xl shadow-lg"
          >
            Get Started
          </button>
          <button
            onClick={() => router.push('/mobileapp/download')}
            className="w-full bg-white/20 text-white font-semibold py-4 rounded-2xl backdrop-blur-sm"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
