"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  MessageCircle, 
  FileText, 
  Receipt, 
  Settings,
  LogOut,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import toast from 'react-hot-toast';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is staff/admin
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

  const navItems = [
    { path: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/staff/orders', icon: Package, label: 'Orders' },
    { path: '/staff/customers', icon: Users, label: 'Customers' },
    { path: '/staff/chat', icon: MessageCircle, label: 'Support Chat' },
    { path: '/staff/invoices', icon: FileText, label: 'Invoices' },
    { path: '/staff/refunds', icon: Receipt, label: 'Refunds' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Staff Portal</h1>
        <div className="w-10"></div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Portal</h2>
              <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  router.push(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
