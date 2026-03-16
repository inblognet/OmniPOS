// ✅ Import the configured axios instance
import api from '../api/axiosConfig';

// ✅ CRITICAL FIX: Interface perfectly maps to backend dashboardController.js
export interface DashboardStats {
  stats: {
    totalRevenue: number;
    todayRevenue: number;
    ordersToday: number;
    totalCustomers: number;
    lowStock: number;
    outOfStock: number;
    mostSoldItem: string;
  };
  trends: {
    date: string;
    value: number;
  }[];
  topProducts: {
    name: string;
    value: number;
  }[];
  topCustomers: {
    name: string;
    value: number;
  }[];
  peakTraffic: {
    name: string;
    value: number;
  }[];
  salesByCategory: {
    name: string;
    value: number;
  }[];
  deadStock: {
    name: string;
    value: number;
  }[];
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    /** * ✅ Action: Fetch Business Intelligence
     * Path: GET /api/dashboard/stats
     */
    // If offline, you might want to wrap this in a try/catch or an offline check
    // to return cached data, just like your other services!
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};