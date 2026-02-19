// ✅ Import the central axios instance (default export)
import api from '../api/axiosConfig';

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  returnedQuantity?: number;
}

export interface Order {
  id: number;
  customer_name: string | null;
  total_amount: number | string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  payment_method: string;
  created_at: string;
  items: OrderItem[];
  // ✅ Compatibility Mappings
  timestamp: string;
  total: number;
}

export const orderService = {
  /**
   * Action: Complete a transaction in the POS.
   * Path: POST /api/orders
   */
  create: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  /**
   * Action: Fetch all sales for History and Analytics.
   * Path: GET /api/orders
   */
  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    // ✅ Transform data to be compatible with existing UI components
    return response.data.map((order: any) => ({
      ...order,
      timestamp: order.created_at, // Maps PostgreSQL date to old Dexie 'timestamp' name
      total: Number(order.total_amount), // Ensures calculations don't break on strings
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
    }));
  },

  /**
   * Action: Fetch specific items for receipt re-printing or refunds.
   * Path: GET /api/orders/:id/items
   */
  getOrderItems: async (orderId: number): Promise<OrderItem[]> => {
    const response = await api.get(`/orders/${orderId}/items`);
    return response.data;
  },

  /**
   * Action: Process a full or partial refund for an order.
   * Path: POST /api/orders/:id/refund
   */
  refundOrder: async (orderId: number, payload: { type: 'full' | 'partial', items?: any[] }) => {
    const response = await api.post(`/orders/${orderId}/refund`, payload);
    return response.data;
  }
};