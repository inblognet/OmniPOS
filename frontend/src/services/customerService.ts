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
    let customersData: Customer[] = [];

    // 🌐 NETWORK INTERCEPTOR
    if (navigator.onLine) {
      // 🟢 ONLINE: Fetch from Render API
      const response = await api.get('/customers');
      customersData = response.data;
    } else {
      // 🔴 OFFLINE: Fetch from SQLite Cache
      if (window.electronAPI) {
        const cachedResponse = await window.electronAPI.getCache('customers');
        if (cachedResponse.success && cachedResponse.data) {
          customersData = cachedResponse.data;
        }
      }
    }

    return customersData;
  },

  /**
   * Action: Register a new customer.
   * Path: POST /api/customers
   */
  // ✅ Accepts Partial<Customer> so long as 'name' is provided
  create: async (customer: Partial<Customer> & { name: string }): Promise<Customer> => {
    if (!navigator.onLine) throw new Error("Cannot register new customers in Offline Mode. Please connect to the internet.");
    const response = await api.post('/customers', customer);
    return response.data;
  },

  /**
   * Action: Update spending stats or loyalty points.
   * Path: PUT /api/customers/:id
   */
  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    if (!navigator.onLine) throw new Error("Cannot update customer profiles in Offline Mode. Please connect to the internet.");
    const response = await api.put(`/customers/${id}`, customer);
    return response.data;
  },

  /**
   * Action: Remove a customer record.
   * Path: DELETE /api/customers/:id
   */
  delete: async (id: number): Promise<void> => {
    if (!navigator.onLine) throw new Error("Cannot delete customers in Offline Mode. Please connect to the internet.");
    await api.delete(`/customers/${id}`);
  }
};