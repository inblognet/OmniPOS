import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ThemeManager } from './components/ThemeManager';

// ✅ Import the new AutoSync Engine (Adjust the path if you placed it somewhere else!)
import AutoSync from './components/AutoSync';

// Feature Screens
import DashboardScreen from './features/dashboard/DashboardScreen';
import PosScreen from './features/pos/PosScreen';
import OrdersScreen from './features/orders/OrdersScreen';
import InventoryScreen from './features/inventory/InventoryScreen';
import CustomersScreen from './features/customers/CustomersScreen';
import ReportsScreen from './features/reports/ReportsScreen';
import SettingsScreen from './features/settings/SettingsScreen';
import IntegrationsPage from './features/Integrations/IntegrationsPage';
import CFDPanelScreen from './features/cfd/CFDPanelScreen.tsx';
import CFDDisplayScreen from './features/cfd/CFDDisplayScreen.tsx';
import UsersScreen from './features/users/UsersScreen';

// ✅ Import the new Suppliers Screen
import SuppliersScreen from './features/supplier/SuppliersScreen';

// Import the Login Screen
import Login from './features/auth/Login';

// Frontend Bouncer: Checks for the VIP token
const ProtectedRoute = () => {
  const token = localStorage.getItem('omnipos_token');

  // If no token is found, kick them back to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists, let them pass through to the child routes (<Outlet />)
  return <Outlet />;
};

function App() {
  return (
    <HashRouter>
      <ThemeManager />

      {/* ✅ The AutoSync Engine runs globally in the background! */}
      <AutoSync />

      <Routes>
        {/* 🔓 PUBLIC ROUTES (Anyone can access these without logging in) */}
        <Route path="/login" element={<Login />} />

        {/* We keep CFD Display public so it can run on a separate monitor without needing to log in again */}
        <Route path="/cfd-display" element={<CFDDisplayScreen />} />

        {/* 🔒 PROTECTED ROUTES (Must have a token to enter) */}
        <Route element={<ProtectedRoute />}>

          {/* Main Layout wraps all pages to provide the Sidebar & Header */}
          <Route element={<MainLayout />}>
            {/* 1. Dashboard (Home) */}
            <Route path="/" element={<DashboardScreen />} />

            {/* 2. Point of Sale (Register) */}
            <Route path="/pos" element={<PosScreen />} />

            {/* 3. Orders (History) */}
            <Route path="/orders" element={<OrdersScreen />} />

            {/* 4. Customers (CRM) */}
            <Route path="/customers" element={<CustomersScreen />} />

            {/* 5. Inventory (Products) */}
            <Route path="/inventory" element={<InventoryScreen />} />

            {/* 6. Reports (Analytics) */}
            <Route path="/reports" element={<ReportsScreen />} />

            {/* 7. Settings (Configuration) */}
            <Route path="/settings" element={<SettingsScreen />} />

            {/* 8. Integrations (WhatsApp, etc.) */}
            <Route path="/integrations" element={<IntegrationsPage />} />

            {/* 9. CFD Configuration Panel */}
            <Route path="/cfd-panel" element={<CFDPanelScreen />} />

            {/* 10. Staff Management */}
            <Route path="/staff" element={<UsersScreen />} />

            {/* 11. ✅ Suppliers Management */}
            <Route path="/suppliers" element={<SuppliersScreen />} />
          </Route>

        </Route>

        {/* Fallback: Redirect any unknown URLs to the Dashboard (which will then redirect to login if no token) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;