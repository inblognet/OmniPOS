// ✅ Import the configured axios instance
import api from '../api/axiosConfig';

// ✅ Updated Interface to match the new Backend Controller structure
export interface DashboardStats {
  stats: {
    totalRevenue: number;
    ordersToday: number;
    totalCustomers: number;
    lowStockAlerts: number;
  };
  revenueChart: {
    date: string;
    value: number
  }[];
  hourlyChart: {
    name: string;
    value: number
  }[];
  categoryChart: {
    name: string;
    value: number
  }[];
  recentTransactions: {
    id: number;
    customer: string;
    amount: number;
    status: string;
    time: string;
  }[];
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    /** * ✅ Action: Fetch Business Intelligence
     * Path: GET http://localhost:5500/api/dashboard/stats
     * Note: The backend now returns a nested object { stats, revenueChart, ... }
     */
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};