import { api } from '../api/axiosConfig';

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
  // Helpers for compatibility with old components
  timestamp: string;
  total: number;
}

export const orderService = {
  // 1. ✅ RESTORED: Create New Order (Used by POS Register)
  create: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // 2. Get All Orders (Used by Sales History)
  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data.map((order: any) => ({
      ...order,
      timestamp: order.created_at,
      total: Number(order.total_amount),
      items: order.items || []
    }));
  },

  // 3. Get Items for a Specific Order (Used by Manage Modal)
  getOrderItems: async (orderId: number): Promise<OrderItem[]> => {
    const response = await api.get(`/orders/${orderId}/items`);
    return response.data;
  }
};