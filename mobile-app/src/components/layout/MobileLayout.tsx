'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ShoppingBag, Package, User, Heart } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const { getTotalItems } = useCartStore();
  
  const cartCount = getTotalItems();
  
  // Don't show bottom nav on login page or staff pages
  const showBottomNav = user && !pathname?.includes('/staff') && pathname !== '/login';
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/products', icon: ShoppingBag, label: 'Shop' },
    { path: '/orders', icon: Package, label: 'Orders' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 safe-bottom">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
              const Icon = item.icon;
              
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div className="relative">
                    <Icon size={24} />
                    {item.label === 'Shop' && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
