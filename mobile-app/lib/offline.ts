// IndexedDB service for offline storage
const DB_NAME = 'omnipos-offline';
const DB_VERSION = 2;
const STORES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  SYNC_QUEUE: 'sync_queue',
  CACHE: 'cache'
};

let db: IDBDatabase | null = null;

export const initOfflineDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
      }
    };
  });
};

export const saveOfflineData = async <T>(storeName: string, data: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getOfflineData = async <T>(storeName: string, id?: any): Promise<T | T[] | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = id ? store.get(id) : store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const getAllOfflineData = async <T>(storeName: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
};

export const addToSyncQueue = async (action: string, data: any): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.add({ 
      action, 
      data, 
      timestamp: Date.now(), 
      synced: false,
      retryCount: 0
    });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as number);
  });
};

export const processSyncQueue = async (syncFunction: (item: any) => Promise<void>): Promise<{ success: number; failed: number }> => {
  const queue = await getAllOfflineData<any>(STORES.SYNC_QUEUE);
  let success = 0;
  let failed = 0;
  
  for (const item of queue) {
    if (!item.synced) {
      try {
        await syncFunction(item);
        await markSynced(item.id);
        success++;
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        await incrementRetryCount(item.id);
        failed++;
      }
    }
  }
  
  return { success, failed };
};

const markSynced = async (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.put({ id, synced: true });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const incrementRetryCount = async (id: number): Promise<void> => {
  const item = await getOfflineData(STORES.SYNC_QUEUE, id) as any;
  if (item) {
    item.retryCount = (item.retryCount || 0) + 1;
    await saveOfflineData(STORES.SYNC_QUEUE, item);
  }
};

export const clearOfflineData = async (storeName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const cacheApiResponse = async (key: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> => {
  const cacheItem = {
    key,
    data,
    timestamp: Date.now(),
    ttl
  };
  await saveOfflineData(STORES.CACHE, cacheItem);
};

export const getCachedApiResponse = async (key: string): Promise<any | null> => {
  const cached = await getOfflineData(STORES.CACHE, key) as any;
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    return cached.data;
  }
  return null;
};
