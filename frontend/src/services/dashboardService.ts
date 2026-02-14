import { api } from '../api/axiosConfig';

export interface DashboardStats {
  revenue: number;
  orders: number;
  customers: number;
  categories: { name: string; value: number }[];
  hourly: { hour: string; amount: number }[];
  daily: { date: string; amount: number }[]; // ✅ Added for 7-Day Trend
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};