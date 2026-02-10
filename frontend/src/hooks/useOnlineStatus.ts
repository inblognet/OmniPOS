import { useState, useEffect } from 'react';
import { db } from '../db/db';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = async () => {
    console.log("🌐 Connection restored. Attempting to sync...");
    const unsyncedOrders = await db.orders.where('status').equals('completed').toArray();
    if (unsyncedOrders.length === 0) return;
    
    for (const order of unsyncedOrders) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`🚀 Syncing Order #${order.id}... SUCCESS`);
        if (order.id) await db.orders.update(order.id, { status: 'synced' });
      } catch (error) {
        console.error(`❌ Failed to sync Order #${order.id}`, error);
      }
    }
  };
  return isOnline;
}
