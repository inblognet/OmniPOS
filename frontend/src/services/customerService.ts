import { api } from '../api/axiosConfig';

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  // ✅ These fields must exist to fix the 'Property does not exist' errors
  type: 'Walk-in' | 'Registered' | 'Member' | 'Wholesale';
  loyaltyJoined: boolean;
  loyaltyPoints: number;
  totalSpend: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  createdAt?: string;
}

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get('/customers');
    return response.data;
  },

  create: async (customer: Customer): Promise<Customer> => {
    const response = await api.post('/customers', customer);
    return response.data;
  },

  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, customer);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  }
};