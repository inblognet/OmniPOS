import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ClipboardList,
  Package, Settings, Menu, LogOut, FileText, Users,
  Puzzle, MonitorPlay, UserCog, ChevronLeft, Building2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { QuickSettingsMenu } from '../components/QuickSettingsMenu';
import { useGlobalScanner } from '../hooks/useGlobalScanner';

const MainLayout: React.FC = () => {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useGlobalScanner();

  const settings = useLiveQuery(() => db.settings.get(1));
  const appName = settings?.storeName || 'OmniPOS';

  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('cashier');

  useEffect(() => {
    const storedUser = localStorage.getItem('omnipos_user');
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setUserName(userObj.name || 'User');
        setUserRole(userObj.role || 'cashier');
      } catch (e) {
        console.error("Could not parse user data");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('omnipos_token');
    localStorage.removeItem('omnipos_user');
    navigate('/login');
  };

  const ALL_NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
    { path: '/pos', label: 'POS Register', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
    { path: '/orders', label: 'Orders', icon: ClipboardList, roles: ['admin', 'manager', 'cashier'] },
    { path: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'manager', 'cashier'] },
    { path: '/suppliers', label: 'Suppliers', icon: Building2, roles: ['admin', 'manager'] },
    { path: '/staff', label: 'Users', icon: UserCog, roles: ['admin'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'manager', 'cashier'] },
    { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'manager'] },
    { path: '/integrations', label: 'Integrations', icon: Puzzle, roles: ['admin'] },
    { path: '/cfd-panel', label: 'CFD Panel', icon: MonitorPlay, roles: ['admin', 'manager', 'cashier'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    // ✅ RESTORED bg-gray-100 here
    <div className="flex h-screen bg-gray-100 text-[var(--text-color,#1f2937)] font-sans overflow-hidden transition-colors">

      {/* --- SIDEBAR --- */}
      <aside
        className={`bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300 relative z-20 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-10 flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full z-30 shadow-sm hover:bg-gray-50 hover:scale-110 text-gray-500 transition-all cursor-pointer"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <ChevronLeft size={14} className={`transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`h-16 flex items-center border-b border-gray-100 overflow-hidden ${isSidebarOpen ? 'px-6' : 'justify-center'}`}>
          <div className="w-8 h-8 flex-shrink-0 bg-[var(--primary-color,#2563eb)] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {appName.charAt(0).toUpperCase()}
          </div>
          <span
            className={`text-xl font-bold text-[var(--text-color,#1f2937)] tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarOpen ? 'w-40 ml-3 opacity-100' : 'w-0 ml-0 opacity-0'
            }`}
          >
            {appName}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : ''}
                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group w-full ${
                  isActive
                    ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color,#2563eb)] shadow-sm font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                } ${isSidebarOpen ? '' : 'justify-center'}`}
              >
                <item.icon size={22} className={`flex-shrink-0 ${isActive ? 'text-[var(--primary-color,#2563eb)]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                    isSidebarOpen ? 'w-40 ml-3 opacity-100' : 'w-0 ml-0 opacity-0'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 overflow-hidden">
           <button
             onClick={handleLogout}
             title={!isSidebarOpen ? 'Logout' : ''}
             className={`flex items-center px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium w-full ${isSidebarOpen ? '' : 'justify-center'}`}
           >
             <LogOut size={22} className="flex-shrink-0" />
             <span
               className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                 isSidebarOpen ? 'w-40 ml-3 opacity-100' : 'w-0 ml-0 opacity-0'
               }`}
             >
               Logout
             </span>
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      {/* ✅ RESTORED bg-gray-50 here */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 transition-colors">

        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-50 relative transition-colors">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
              {ALL_NAV_ITEMS.find(i => i.path === location.pathname)?.label || appName}
            </h2>
          </div>

          <div className="flex items-center gap-4">
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

            <QuickSettingsMenu />

            <div
              className="w-9 h-9 bg-[var(--primary-color,#2563eb)] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer hover:brightness-110 transition-all"
              title={`${userName} (${userRole})`}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 relative">
            <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;