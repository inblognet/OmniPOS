import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { Wifi, WifiOff, RefreshCw, DownloadCloud } from 'lucide-react';

const AutoSync: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [caching, setCaching] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // 1. Listen for Network Changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. PUSH: The Order Sync Engine (What we already built)
  const syncOrders = async () => {
    if (!window.electronAPI || !navigator.onLine || syncing) return;
    try {
      setSyncing(true);
      const response = await window.electronAPI.getOfflineOrders();

      if (response.success && response.orders && response.orders.length > 0) {
        setPendingCount(response.orders.length);
        for (const offlineOrder of response.orders) {
          const orderData = JSON.parse(offlineOrder.order_data);
          await api.post('/orders', orderData);
          await window.electronAPI.deleteOfflineOrder(offlineOrder.id);
        }
        console.log("✅ All offline orders successfully synced to Neon Database!");
      }
      setPendingCount(0);
    } catch (error) {
      console.error("❌ Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  // 3. PULL: 🆕 The Catalog Caching Engine
  const syncCatalogCache = async () => {
    if (!window.electronAPI || !navigator.onLine || caching) return;
    try {
      setCaching(true);

      // 🌐 Fetch EVERYTHING from your Render API
      const [productsRes, customersRes, statsRes, ordersRes, integrationsRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/dashboard/stats'),
        api.get('/orders'),
        api.get('/integrations')
      ]);

      // 💾 Save it ALL to the local Windows hard drive!
      await window.electronAPI.saveCache('products', productsRes.data);
      await window.electronAPI.saveCache('customers', customersRes.data);
      await window.electronAPI.saveCache('dashboard_stats', statsRes.data);
      await window.electronAPI.saveCache('orders', ordersRes.data);
      await window.electronAPI.saveCache('integrations', integrationsRes.data);

      // ✅ NEW: Download the line-items for the 50 most recent orders so the details modal works offline
      const recentOrders = ordersRes.data.slice(0, 50);
      for (const order of recentOrders) {
        try {
          const itemsRes = await api.get(`/orders/${order.id}/items`);
          await window.electronAPI.saveCache(`order_items_${order.id}`, itemsRes.data);
        } catch (e) {
          // If a single order fails, just skip it and keep caching the rest
        }
      }

      console.log("📦 Full App Cache Updated Successfully!");
    } catch (error) {
      console.error("❌ Failed to update full app cache:", error);
    } finally {
      setCaching(false);
    }
  };

  // 4. Trigger logic
  useEffect(() => {
    if (isOnline) {
      // When internet comes on, push orders AND pull the latest catalog
      syncOrders();
      syncCatalogCache();

      // Every 30 seconds, check for trapped orders
      const orderInterval = setInterval(syncOrders, 30000);
      // Every 5 minutes, download a fresh copy of the catalog
      const cacheInterval = setInterval(syncCatalogCache, 300000);

      return () => {
        clearInterval(orderInterval);
        clearInterval(cacheInterval);
      };
    }
  }, [isOnline]);

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold text-white transition-colors z-50 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
      {isOnline ? 'Online' : 'Offline Mode'}

      {syncing && <RefreshCw size={16} className="animate-spin ml-2" />}
      {caching && <DownloadCloud size={16} className="animate-bounce ml-2" />}

      {pendingCount > 0 && !syncing && (
        <span className="ml-2 bg-white text-black px-2 rounded-full text-xs">
          {pendingCount} Pending
        </span>
      )}
    </div>
  );
};

export default AutoSync;