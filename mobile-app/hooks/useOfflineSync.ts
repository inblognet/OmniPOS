"use client";

import { useEffect, useState, useCallback } from 'react';
import { initOfflineDB, processSyncQueue, addToSyncQueue, cacheApiResponse, getCachedApiResponse } from '@/lib/offline';
import api from '@/lib/api';
import { showLocalNotification } from '@/lib/push';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    // Initialize IndexedDB
    initOfflineDB().catch(console.error);
    
    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    showLocalNotification('OmniPOS Sync', 'Syncing offline data...', '/dashboard');
    
    const syncFunction = async (item: any) => {
      const { action, data } = item;
      switch (action) {
        case 'CREATE_PRODUCT':
          await api.post('/mobile/staff/products', data);
          break;
        case 'UPDATE_ORDER':
          await api.put(`/mobile/staff/orders/${data.id}/status`, { status: data.status });
          break;
        case 'CREATE_CUSTOMER':
          await api.post('/mobile/staff/customers', data);
          break;
        default:
          console.warn('Unknown sync action:', action);
      }
    };
    
    const result = await processSyncQueue(syncFunction);
    
    if (result.success > 0) {
      showLocalNotification(
        'Sync Complete',
        `Successfully synced ${result.success} items${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        '/dashboard'
      );
    }
    
    setIsSyncing(false);
  }, [isOnline, isSyncing]);

  const queueAction = useCallback(async (action: string, data: any) => {
    if (isOnline) {
      try {
        switch (action) {
          case 'CREATE_PRODUCT':
            await api.post('/mobile/staff/products', data);
            break;
          case 'UPDATE_ORDER':
            await api.put(`/mobile/staff/orders/${data.id}/status`, { status: data.status });
            break;
          default:
            console.warn('Unknown action:', action);
        }
        return { success: true };
      } catch (error) {
        const id = await addToSyncQueue(action, data);
        setPendingSyncCount(prev => prev + 1);
        return { success: false, queued: true, id };
      }
    } else {
      const id = await addToSyncQueue(action, data);
      setPendingSyncCount(prev => prev + 1);
      showLocalNotification(
        'Offline Mode',
        'Action saved. Will sync when online.',
        '/dashboard'
      );
      return { success: false, queued: true, id };
    }
  }, [isOnline]);

  const fetchWithCache = useCallback(async (key: string, fetcher: () => Promise<any>, ttl: number = 5 * 60 * 1000) => {
    const cached = await getCachedApiResponse(key);
    if (cached) {
      return cached;
    }
    
    try {
      const data = await fetcher();
      await cacheApiResponse(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Fetch failed:', error);
      const expiredCache = await getCachedApiResponse(key);
      if (expiredCache) {
        showLocalNotification('Offline Mode', 'Showing cached data', '/dashboard');
        return expiredCache;
      }
      throw error;
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncOfflineData,
    queueAction,
    fetchWithCache
  };
};
