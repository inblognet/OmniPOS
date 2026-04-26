"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Package, Image as ImageIcon, Store, LayoutDashboard, Boxes, TrendingUp,
  LogOut, Settings, Tags, Ticket, Menu, ChevronLeft, FileText, Calculator // 🔥 Added Calculator icon
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Bring in the global store AND the logout function
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  // State for the collapsible sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    logout();
    router.push("/login");
  };

  // 🔥 NEW: Added Quotations to the navigation array
  const navItems = [
    { name: "Dashboard", href: "/admin", icon: TrendingUp },
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Quotations", href: "/admin/quotations", icon: Calculator }, // 🔥 NEW LINK
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Vouchers", href: "/admin/vouchers", icon: Ticket },
    { name: "Banners", href: "/admin/banners", icon: ImageIcon },
    { name: "Invoices", href: "/admin/invoices", icon: FileText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
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
    <div className="min-h-screen bg-gray-50 flex">

      {/* COLLAPSIBLE SIDEBAR */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen sticky top-0 z-20`}
      >
        {/* Sidebar Header & Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {!isCollapsed && (
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 whitespace-nowrap overflow-hidden">
              <LayoutDashboard className="text-blue-600 shrink-0" size={24} />
              Admin Panel
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto shrink-0"
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl font-bold transition-all group overflow-hidden ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <div className="shrink-0 flex items-center justify-center">
                  <item.icon size={20} className={isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600 transition-colors"} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions (Back to Store & Logout) */}
        <div className="p-3 border-t border-gray-100 space-y-1.5">
          <Link
            href="/"
            title={isCollapsed ? "Back to Store" : ""}
            className="flex items-center gap-3.5 px-3 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-center">
              <Store size={20} />
            </div>
            {!isCollapsed && <span className="whitespace-nowrap">Back to Store</span>}
          </Link>

          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : ""}
            className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-center">
              <LogOut size={20} />
            </div>
            {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN PAGE CONTENT */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-end sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4 md:gap-6">

            {/* ONLINE PILL */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-[10px] font-black tracking-widest uppercase shadow-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Online
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            {/* Settings Icon */}
            <Link
              href="/admin/settings"
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </Link>

            {/* Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0) || "A"}
            </div>

          </div>
        </header>

        {/* ACTUAL PAGE CONTENT */}
        <div className="p-6 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}