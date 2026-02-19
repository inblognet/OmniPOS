// ✅ Import the configured instance (Default Export)
import api from '../api/axiosConfig';
import { Product } from '../db/db';

// ✅ Add Category Interface
export interface Category {
  id?: number;
  name: string;
}

export const productService = {
  /**
   * Fetches all products from the PostgreSQL database.
   * Path: GET /api/products
   */
  getAll: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  /**
   * Sends a new product to the backend.
   * Path: POST /api/products
   */
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const response = await api.post('/products', product);
    return response.data;
  },

  /**
   * Updates an existing product by ID.
   * Path: PUT /api/products/:id
   */
  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },

  /**
   * Removes a product from the database.
   * Path: DELETE /api/products/:id
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // --- CATEGORY METHODS ---

  /**
   * Fetches all categories from the PostgreSQL database.
   * Path: GET /api/products/categories
   */
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/products/categories');
    return response.data;
  },

  /**
   * Adds a new category to the database.
   * Path: POST /api/products/categories
   */
  addCategory: async (name: string): Promise<Category> => {
    const response = await api.post('/products/categories', { name });
    return response.data;
  },

  /**
   * Removes a category from the database.
   * Path: DELETE /api/products/categories/:id
   */
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/products/categories/${id}`);
  }
};