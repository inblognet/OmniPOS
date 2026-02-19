// ✅ Import the central axios instance (default export)
import api from '../api/axiosConfig';

export const reportService = {
  /**
   * Action: Fetch filtered sales records from the cloud.
   * Path: GET http://localhost:5000/api/reports/sales
   */
  getSales: async (startDate: string, endDate: string) => {
    const response = await api.get('/reports/sales', {
      params: { startDate, endDate }
    });

    // ✅ Transform data to ensure numerical precision and field compatibility
    return response.data.map((order: any) => ({
        ...order,
        total: Number(order.total_amount || order.total),
        timestamp: order.created_at || order.timestamp,
        refundedAmount: Number(order.refunded_amount || 0)
    }));
  },

  /**
   * Action: Fetch current stock snapshots for valuation reports.
   * Path: GET http://localhost:5000/api/reports/inventory
   */
  getInventory: async () => {
    const response = await api.get('/reports/inventory');

    return response.data.map((prod: any) => ({
        ...prod,
        price: Number(prod.price),
        stock: Number(prod.stock)
    }));
  }
};