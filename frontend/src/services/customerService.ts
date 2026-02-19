// ✅ Import the configured instance (Default Export from axiosConfig.ts)
import api from '../api/axiosConfig';

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  // ✅ Made these optional so the CFD can create lightweight profiles
  type?: 'Walk-in' | 'Registered' | 'Member' | 'Wholesale';
  loyaltyJoined?: boolean;
  loyaltyPoints?: number;
  totalSpend?: number;
  totalPurchases?: number;
  lastPurchaseDate?: string;
  createdAt?: string;
}

export const customerService = {
  /**
   * Action: Fetch all customer profiles for the Management screen or POS.
   * Path: GET /api/customers
   */
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get('/customers');
    return response.data;
  },

  /**
   * Action: Register a new customer.
   * Path: POST /api/customers
   */
  // ✅ Accepts Partial<Customer> so long as 'name' is provided
  create: async (customer: Partial<Customer> & { name: string }): Promise<Customer> => {
    const response = await api.post('/customers', customer);
    return response.data;
  },

  /**
   * Action: Update spending stats or loyalty points.
   * Path: PUT /api/customers/:id
   */
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, customer);
    return response.data;
  },

  /**
   * Action: Remove a customer record.
   * Path: DELETE /api/customers/:id
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  }
};