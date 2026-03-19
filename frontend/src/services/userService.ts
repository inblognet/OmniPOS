import api from '../api/axiosConfig';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | string; // Added role literals for better UI autocomplete!
}

// ✅ Strict payload for creating a user (requires a password, but no ID yet)
export interface CreateUserPayload extends Omit<User, 'id'> {
  password: string;
}

// ✅ NEW: Payload for updating (password is optional!)
export interface UpdateUserPayload extends Partial<Omit<User, 'id'>> {
  password?: string;
}

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    // 🛑 OFFLINE CHECK
    if (!navigator.onLine) {
      throw new Error("Cannot fetch staff directory in Offline Mode.");
    }
    const response = await api.get('/users');
    return response.data;
  },

  createUser: async (userData: CreateUserPayload): Promise<User> => {
    // 🛑 OFFLINE CHECK
    if (!navigator.onLine) {
      throw new Error("Cannot create staff accounts in Offline Mode.");
    }
    const response = await api.post('/users', userData);
    return response.data;
  },

  // ✅ NEW: The missing update function!
  updateUser: async (id: number, userData: UpdateUserPayload): Promise<User> => {
    // 🛑 OFFLINE CHECK
    if (!navigator.onLine) {
      throw new Error("Cannot modify staff accounts in Offline Mode.");
    }
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    // 🛑 OFFLINE CHECK
    if (!navigator.onLine) {
      throw new Error("Cannot modify staff accounts in Offline Mode.");
    }
    await api.delete(`/users/${id}`);
  }
};