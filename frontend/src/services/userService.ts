import api from '../api/axiosConfig';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  createUser: async (userData: any): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  }
};