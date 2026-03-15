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
   * Fetches all products from the PostgreSQL database or local SQLite cache.
   * Path: GET /api/products
   */
  getAll: async (): Promise<Product[]> => {
    let productsData: Product[] = [];

    // 🌐 NETWORK INTERCEPTOR
    if (navigator.onLine) {
      // 🟢 ONLINE: Fetch from Render API
      const response = await api.get('/products');
      productsData = response.data;
    } else {
      // 🔴 OFFLINE: Fetch from SQLite Cache
      if (window.electronAPI) {
        const cachedResponse = await window.electronAPI.getCache('products');
        if (cachedResponse.success && cachedResponse.data) {
          productsData = cachedResponse.data;
        }
      }
    }

    return productsData;
  },

  /**
   * Sends a new product to the backend.
   * Path: POST /api/products
   */
  create: async (product: Omit<Product, 'id'>): Promise<Product> => {
    if (!navigator.onLine) throw new Error("Cannot create new products in Offline Mode. Please connect to the internet to manage inventory.");
    const response = await api.post('/products', product);
    return response.data;
  },

  /**
   * Updates an existing product by ID.
   * Path: PUT /api/products/:id
   */
  update: async (id: number, product: Partial<Product>): Promise<Product> => {
    if (!navigator.onLine) throw new Error("Cannot update products in Offline Mode. Please connect to the internet to manage inventory.");
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },

  /**
   * Removes a product from the database.
   * Path: DELETE /api/products/:id
   */
  delete: async (id: number): Promise<void> => {
    if (!navigator.onLine) throw new Error("Cannot delete products in Offline Mode. Please connect to the internet to manage inventory.");
    await api.delete(`/products/${id}`);
  },

  // --- CATEGORY METHODS ---

  /**
   * Fetches all categories from the PostgreSQL database or cache.
   * Path: GET /api/products/categories
   */
  getCategories: async (): Promise<Category[]> => {
    let categoriesData: Category[] = [];

    if (navigator.onLine) {
      const response = await api.get('/products/categories');
      categoriesData = response.data;
    } else {
      if (window.electronAPI) {
        // Looks for a 'categories' cache (which you can optionally add to AutoSync later!)
        const cachedResponse = await window.electronAPI.getCache('categories');
        if (cachedResponse.success && cachedResponse.data) {
          categoriesData = cachedResponse.data;
        }
      }
    }

    return categoriesData;
  },

  /**
   * Adds a new category to the database.
   * Path: POST /api/products/categories
   */
  addCategory: async (name: string): Promise<Category> => {
    if (!navigator.onLine) throw new Error("Cannot create categories in Offline Mode.");
    const response = await api.post('/products/categories', { name });
    return response.data;
  },

  /**
   * Removes a category from the database.
   * Path: DELETE /api/products/categories/:id
   */
  deleteCategory: async (id: number): Promise<void> => {
    if (!navigator.onLine) throw new Error("Cannot delete categories in Offline Mode.");
    await api.delete(`/products/categories/${id}`);
  }
};