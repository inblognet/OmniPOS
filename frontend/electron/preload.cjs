const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveOfflineOrder: (orderData) => ipcRenderer.invoke('save-offline-order', orderData),
    getOfflineOrders: () => ipcRenderer.invoke('get-offline-orders'),
    deleteOfflineOrder: (id) => ipcRenderer.invoke('delete-offline-order', id),

    // 🆕 ADDED: Tunnels for the catalog cache
    saveCache: (key, data) => ipcRenderer.invoke('save-cache', key, data),
    getCache: (key) => ipcRenderer.invoke('get-cache', key)
});