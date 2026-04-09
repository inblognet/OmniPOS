"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Image as ImageIcon, Store, LayoutDashboard } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Orders", href: "/admin/orders", icon: Package },
    { name: "Banners", href: "/admin/banners", icon: ImageIcon },
  ];

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
            const isActive = pathname.startsWith(item.href);
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

      {/* MAIN PAGE CONTENT (Where Orders or Banners will render) */}
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}