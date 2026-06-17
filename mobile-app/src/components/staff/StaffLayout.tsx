"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Receipt, 
  Box,
  TrendingUp,
  FileText,
  MessageCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import toast from 'react-hot-toast';

interface StaffMobileLayoutProps {
  children: React.ReactNode;
}

export default function StaffMobileLayout({ children }: StaffMobileLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useUserStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const navItems = [
    { path: '/staff/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/staff/orders', icon: Package, label: 'Orders' },
    { path: '/staff/products', icon: Box, label: 'Products' },
    { path: '/staff/customers', icon: Users, label: 'Customers' },
    { path: '/staff/invoices', icon: FileText, label: 'Invoices' },
    { path: '/staff/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/staff/refunds', icon: Receipt, label: 'Refunds' },
    { path: '/staff/chat', icon: MessageCircle, label: 'Chat' },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.user_type !== 'staff' && user.role !== 'admin' && user.role !== 'manager') {
      toast.error('Access denied. Staff only area.');
      router.push('/dashboard');
      return;
    }
    
    setIsAuthorized(true);
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Staff Portal</h1>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          <Menu size={22} />
        </button>
      </div>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-72 h-full bg-white shadow-xl z-40 animate-in slide-in-from-right">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Staff'}</p>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              <div className="border-t border-gray-100 my-4"></div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">OmniPOS Staff v2.0</p>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-1 py-2 z-20 safe-bottom shadow-lg overflow-x-auto">
        <div className="flex justify-around items-center min-w-max">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
                  active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} className={active ? 'text-blue-600' : ''} />
                <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-blue-600' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
