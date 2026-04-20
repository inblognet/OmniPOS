"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package, Image as ImageIcon, Store, LayoutDashboard, Boxes, TrendingUp,
  LogOut, Settings, UserCircle, Tags, Ticket // 🔥 Added Ticket icon here!
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Bring in the global store AND the logout function
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  // Instantly check if they are allowed in
  const isAuthorized = user && user.role;

  // --- THE SECURITY BOUNCER ---
  useEffect(() => {
    if (!isAuthorized) {
      router.push("/login");
    }
  }, [isAuthorized, router]);

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    logout(); // Clears the Zustand store
    router.push("/login"); // Boots them back to the login screen
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: TrendingUp },
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Vouchers", href: "/admin/vouchers", icon: Ticket }, // 🔥 Added Vouchers Link!
    { name: "Banners", href: "/admin/banners", icon: ImageIcon },
  ];

  // --- KICKOUT / LOADING STATE ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse">Verifying Admin Credentials...</p>
      </div>
    );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <LayoutDashboard className="text-blue-600" size={28} />
            Admin Panel
          </h2>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-6 mt-6 border-t border-gray-100">
             <Link
               href="/"
               className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
             >
                <Store size={20} />
                Back to Store
             </Link>
          </div>
        </nav>
      </aside>

      {/* MAIN PAGE CONTENT */}
      <main className="flex-1 w-full flex flex-col overflow-x-hidden">

        {/* --- TOP ADMIN NAVIGATION BAR --- */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-end items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-6">

            {/* Profile Info */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <UserCircle size={24} />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{user?.role}</p>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-gray-200"></div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Quick Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg transition-all shadow-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>
        </header>

        {/* ACTUAL PAGE CONTENT */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}