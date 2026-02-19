import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ClipboardList,
  Package, Settings, Menu, LogOut, FileText, Users,
  Puzzle, MonitorPlay // ✅ ADDED MonitorPlay for CFD Panel
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { QuickSettingsMenu } from '../components/QuickSettingsMenu';
import { useGlobalScanner } from '../hooks/useGlobalScanner';

const MainLayout: React.FC = () => {
  const isOnline = useOnlineStatus();
  const location = useLocation();

  // Activate Global Scanner Listener
  useGlobalScanner();

  // Live Fetch Store Settings
  const settings = useLiveQuery(() => db.settings.get(1));
  const appName = settings?.storeName || 'OmniPOS'; // Default fallback

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/pos', label: 'POS Register', icon: ShoppingCart },
    { path: '/orders', label: 'Orders', icon: ClipboardList },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/integrations', label: 'Integrations', icon: Puzzle },
    { path: '/cfd-panel', label: 'CFD Panel', icon: MonitorPlay }, // ✅ NEW CFD PANEL LINK
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900 font-sans overflow-hidden">

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm mr-3">
              {/* Dynamic First Letter */}
              {appName.charAt(0).toUpperCase()}
          </div>
          {/* Dynamic Store Name */}
          <span className="text-xl font-bold text-gray-800 tracking-tight truncate">
            {appName}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 w-full rounded-xl transition-colors font-medium">
             <LogOut size={20} />
             <span>Logout</span>
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">

        {/* TOP NAVIGATION BAR */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-20 relative">

          {/* Left: Page Title */}
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
              {/* Use App Name if no specific page label found */}
              {navItems.find(i => i.path === location.pathname)?.label || appName}
            </h2>
          </div>

          {/* Right: Status & Quick Settings */}
          <div className="flex items-center gap-4">

            {/* Online Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                isOnline
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* Quick Settings Dropdown */}
            <QuickSettingsMenu />

            {/* User Avatar - Dynamic Letter */}
            <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer hover:bg-gray-700 transition-colors">
              {appName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto p-6 relative">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;