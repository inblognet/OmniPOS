"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotificationStore } from "@/store/useNotificationStore"; // 🔥 Added Notification Store
import NotificationDropdown from "./NotificationDropdown"; // 🔥 Added Dropdown Component
import api from "@/lib/api";
import {
  ShoppingCart, LogOut, Award, Store, LayoutDashboard,
  Search, X, Menu, Loader2, Package, Bell
} from "lucide-react";

interface SearchResult {
  id: number;
  name: string;
  price: string | number;
  images?: { url: string; is_primary: boolean }[];
}

export default function Navbar() {
  const { user, logout } = useUserStore();
  const { items, openCart, clearCart } = useCartStore();
  const currencySymbol = useSettingsStore((state) => state.currencySymbol);

  // 🔥 Bring in Notification State
  const { unreadCount, fetchNotifications } = useNotificationStore();

  const pathname = usePathname();
  const router = useRouter();

  // Search, Menu & Notification States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); // 🔥 Notification Toggle State

  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch Notifications when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
    }
  }, [user, fetchNotifications]);

  // Close search if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Search Debounce Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/web/products?search=${searchQuery}`);
        if (res.data.success) {
          setSearchResults((res.data.products || []).slice(0, 5));
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(fetchTimer);
  }, [searchQuery]);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    clearCart();
    logout();
    window.location.href = "/";
  };

  const closeAllMenus = () => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false); // 🔥 Ensure notifs close too
    setSearchQuery("");
  };

  return (
    <nav className="bg-white border-b border-gray-100 py-3 px-4 md:px-8 sticky top-0 z-50 shadow-sm relative">
      <div className="max-w-7xl mx-auto flex justify-between items-center">

        {/* LEFT: Store Logo */}
        <Link href="/" onClick={closeAllMenus} className="flex items-center gap-2 text-xl md:text-2xl font-black text-blue-600 tracking-tighter z-20">
          <Store size={28} />
          <span>OmniStore</span>
        </Link>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 md:gap-5 z-20">

          {/* 1. Search Icon */}
          <button
            onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMobileMenuOpen(false); setIsNotifOpen(false); }}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Search size={22} />
          </button>

          {/* 🔥 2. Notification Bell (Only if logged in) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => { setIsNotifOpen(!isNotifOpen); setIsSearchOpen(false); setIsMobileMenuOpen(false); }}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white transform scale-100 animate-in zoom-in">
                    {unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} customerId={user.id} />
            </div>
          )}

          {/* 3. Cart Icon */}
          <button onClick={openCart} className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white transform scale-100 animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </button>

          {/* 4. User Profile / Auth */}
          {user ? (
            <>
              {/* Desktop Only Extra Links */}
              <div className="hidden md:flex items-center gap-4 border-l border-gray-200 pl-4">
                {user.role && (
                  <Link href="/admin" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors">
                    <LayoutDashboard size={16} /> Admin
                  </Link>
                )}
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg font-bold text-sm">
                  <Award size={16} /> {user.points || 0}
                </div>
                <Link href="/orders" className="text-gray-600 hover:text-blue-600 font-bold text-sm transition-colors">
                  Orders
                </Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Logout">
                  <LogOut size={18} />
                </button>
              </div>

              {/* Clean Profile Icon */}
              <Link href="/profile" onClick={closeAllMenus} className="flex items-center justify-center w-9 h-9 bg-blue-100 border border-blue-200 rounded-full text-blue-700 text-sm font-black hover:bg-blue-600 hover:text-white transition-colors uppercase ml-1 md:ml-0 md:border-l md:border-gray-200 md:pl-0">
                {user.name.charAt(0)}
              </Link>
            </>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-4 border-l border-gray-200 pl-4">
                <Link href="/login" className="text-gray-600 hover:text-blue-600 font-bold text-sm">Login</Link>
                <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm">Join</Link>
              </div>
              <Link href="/login" onClick={closeAllMenus} className="md:hidden flex items-center justify-center w-9 h-9 bg-gray-100 rounded-full text-gray-600 text-sm font-black hover:bg-gray-200 transition-colors ml-1">
                ?
              </Link>
            </>
          )}

          {/* 5. Mobile Hamburger Menu */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors ml-1"
            onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setIsSearchOpen(false); setIsNotifOpen(false); }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* --- LIVE SEARCH OVERLAY --- */}
      {isSearchOpen && (
        <div ref={searchRef} className="absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl p-4 md:p-6 z-40 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-3xl mx-auto relative">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <Search className="text-gray-400 mr-3" size={20} />
              <input
                type="text"
                autoFocus
                placeholder="Search products, brands, or SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-gray-900 font-medium placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-100 shadow-xl rounded-2xl mt-2 overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
                {isSearching ? (
                  <div className="p-6 flex justify-center text-blue-600">
                    <Loader2 className="animate-spin" size={24} />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result) => {
                      const imgUrl = result.images?.find(i => i.is_primary)?.url || result.images?.[0]?.url || "https://placehold.co/100x100?text=No+Img";
                      return (
                        <div
                          key={result.id}
                          onClick={() => {
                            router.push(`/product/${result.id}`);
                            closeAllMenus();
                          }}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt={result.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                          <div>
                            <p className="font-bold text-gray-900 text-sm line-clamp-1">{result.name}</p>
                            <p className="font-black text-blue-600 text-sm mt-0.5">{currencySymbol}{parseFloat(result.price.toString()).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500 font-medium text-sm">
                    No products found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MOBILE ALL MENU OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2 duration-200 z-30">
          <div className="flex flex-col py-2">
            {!user ? (
              <div className="flex flex-col px-4 py-4 gap-3 bg-gray-50 border-b border-gray-100">
                <Link href="/login" onClick={closeAllMenus} className="w-full text-center bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-bold">Login</Link>
                <Link href="/register" onClick={closeAllMenus} className="w-full text-center bg-blue-600 text-white py-2.5 rounded-xl font-bold shadow-sm">Join Now</Link>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-900 text-sm">Hello, {user.name.split(" ")[0]}</p>
                    <p className="text-xs font-medium text-blue-600 mt-0.5">{user.points || 0} Reward Points</p>
                  </div>
                </div>

                {user.role && (
                  <Link href="/admin" onClick={closeAllMenus} className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-gray-50 font-bold border-b border-gray-50">
                    <LayoutDashboard size={18} className="text-indigo-600" /> Admin Dashboard
                  </Link>
                )}

                <Link href="/orders" onClick={closeAllMenus} className="flex items-center gap-3 px-6 py-4 text-gray-700 hover:bg-gray-50 font-bold border-b border-gray-50">
                  <Package size={18} className="text-blue-600" /> My Orders
                </Link>

                <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 font-bold w-full text-left">
                  <LogOut size={18} /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </nav>
  );
}