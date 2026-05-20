'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { useUserStore } from '@/store/useUserStore';
import { saveMobileToken, getDeviceId } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setIsLoading, isLoading } = useUserStore();
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'staff'>('customer');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Get device info
    const deviceInfo = {
      device_id: getDeviceId(),
      device_name: navigator.userAgent,
      device_model: /Mobile|iP(hone|ad|od)|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      os_version: navigator.platform,
    };

    try {
      const res = await api.post('/mobile/auth/login', {
        ...formData,
        ...deviceInfo,
      });

      if (res.data.success) {
        saveMobileToken(res.data.token);
        setUser(res.data.user);
        
        // Redirect based on user type
        if (res.data.user.user_type === 'customer') {
          router.push('/dashboard');
        } else {
          router.push('/staff/dashboard');
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-lg">
            <Smartphone size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">OmniPOS Mobile</h1>
          <p className="text-white/80 mt-2">Sign in to your account</p>
        </div>

        {/* User Type Toggle */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setUserType('customer')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                userType === 'customer'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setUserType('staff')}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                userType === 'staff'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Store Staff
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 text-white px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </div>
        </form>

        {/* Install Info */}
        <p className="text-center text-white/60 text-xs mt-6">
          Install this app on your home screen for the best experience
        </p>
      </div>
    </div>
  );
}
