// ✅ Import the central axios instance (default export)
import api from '../api/axiosConfig';

// ✅ NEW: Strict TypeScript Interfaces for perfect UI autocomplete
export interface SalesRecord {
  id: number;
  timestamp: string;
  total: number;
  status: string;
  paymentMethod: string;
  refundedAmount: number;
}

export interface InventoryRecord {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
}

export const reportService = {
  /**
   * Action: Fetch filtered sales records from the cloud.
   * Path: GET /api/reports/sales
   */
  getSales: async (startDate: string, endDate: string): Promise<SalesRecord[]> => {
    // 🛑 OFFLINE CHECK: Deep historical reports require the live cloud database
    if (!navigator.onLine) {
      throw new Error("Cannot generate historical reports in Offline Mode. Please check your internet connection.");
    }

    const response = await api.get('/reports/sales', {
      params: { startDate, endDate }
    });

    // ✅ Transform data to ensure numerical precision and field compatibility
    return response.data.map((order: any) => ({
        ...order,
        total: Number(order.total_amount || order.total),
        timestamp: order.created_at || order.timestamp,
        refundedAmount: Number(order.refunded_amount || 0),
        paymentMethod: order.paymentMethod || order.payment_method
    }));
  },

  /**
   * Action: Fetch current stock snapshots for valuation reports.
   * Path: GET /api/reports/inventory
   */
  getInventory: async (): Promise<InventoryRecord[]> => {
    // 🛑 OFFLINE CHECK
    if (!navigator.onLine) {
      throw new Error("Cannot generate inventory reports in Offline Mode. Please check your internet connection.");
    }

    const response = await api.get('/reports/inventory');

    return response.data.map((prod: any) => ({
        ...prod,
        price: Number(prod.price),
        stock: Number(prod.stock),
        isActive: typeof prod.isActive !== 'undefined' ? prod.isActive : prod.is_active
    }));
  }
};