import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ThemeManager } from './components/ThemeManager';

// Feature Screens
import DashboardScreen from './features/dashboard/DashboardScreen';
import PosScreen from './features/pos/PosScreen';
import OrdersScreen from './features/orders/OrdersScreen';
import InventoryScreen from './features/inventory/InventoryScreen';
import CustomersScreen from './features/customers/CustomersScreen';
import ReportsScreen from './features/reports/ReportsScreen';
import SettingsScreen from './features/settings/SettingsScreen';
// ✅ NEW: Import Integrations Page
import IntegrationsPage from './features/Integrations/IntegrationsPage';

function App() {
  return (
    // Use HashRouter to fix page refresh/redirect 404 errors on reload
    <HashRouter>
      {/* ThemeManager injects user-defined colors (bg, text, primary) globally */}
      <ThemeManager />

      <Routes>
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

          {/* ✅ 8. Integrations (WhatsApp, etc.) */}
          <Route path="/integrations" element={<IntegrationsPage />} />

        </Route>

        {/* Fallback: Redirect any unknown URLs to the Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;