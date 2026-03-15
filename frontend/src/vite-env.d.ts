/// <reference types="vite/client" />

// Tells TypeScript that our Electron Bridge exists on the window object
interface Window {
  electronAPI?: {
    saveOfflineOrder: (orderData: any) => Promise<{ success: boolean; id?: string; error?: string }>;
    getOfflineOrders: () => Promise<{ success: boolean; orders?: any[]; error?: string }>;
    deleteOfflineOrder: (id: string) => Promise<{ success: boolean; error?: string }>;

    // 🆕 ADDED: Definitions for the cache
    saveCache: (key: string, data: any) => Promise<{ success: boolean; error?: string }>;
    getCache: (key: string) => Promise<{ success: boolean; data: any; error?: string }>;
  };
}