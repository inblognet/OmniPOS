"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import { ShoppingCart, LogOut, Award, Store, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useUserStore();
  const { items, openCart } = useCartStore();
  const pathname = usePathname();

  // Hide the navbar completely if we are on the admin page!
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="bg-white border-b border-gray-100 py-4 px-8 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        <Link href="/" className="flex items-center gap-2 text-2xl font-black text-blue-600 tracking-tighter">
          <Store size={28} />
          <span>OmniStore</span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4 md:gap-6">

              {/* 🔥 NEW: ADMIN DASHBOARD BUTTON (Only shows if user has a role) */}
              {user.role && (
                <Link href="/admin" className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <LayoutDashboard size={16} />
                  <span className="text-sm font-bold">Admin Panel</span>
                </Link>
              )}

              {/* Loyalty Points */}
              <div className="hidden md:flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100">
                <Award size={16} />
                <span className="text-sm font-bold">{user.points || 0} Points</span>
              </div>

              <Link href="/orders" className="text-gray-600 hover:text-blue-600 font-semibold text-sm transition-colors">
                My Orders
              </Link>

              {/* 🔥 FIX: User Profile Info is now a clickable link to /profile */}
              <Link href="/profile" className="flex items-center gap-2 text-gray-900 font-bold border-l pl-4 border-gray-100 hover:text-blue-600 transition-colors group cursor-pointer">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {user.name.charAt(0)}
                </div>
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </Link>

              <button onClick={() => { logout(); window.location.href = "/"; }} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-blue-600 font-bold text-sm">Login</Link>
              <Link href="/register" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Join Now</Link>
            </div>
          )}

          {/* Cart Button */}
          <button onClick={openCart} className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer group border-l border-gray-100 pl-6 md:pl-2">
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white group-hover:scale-110 transition-transform">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}