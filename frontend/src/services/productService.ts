import { api } from '../api/axiosConfig';
import { Product } from '../db/db'; // Keep using the same Type definition for now

export const productService = {
  // Get all products
  getAll: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  // Add a product
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const response = await api.post('/products', product);
    return response.data;
  },

  // ✅ NEW: Update product
  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },

  // ✅ NEW: Delete product
  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  }
};