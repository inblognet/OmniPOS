import { create } from 'zustand';
import api from '@/lib/api';

export interface WishlistItem {
  id: number;
  name: string;
  price: string | number;
  imageUrl: string;
  web_allocated_stock: number;
  category: string;
}

interface WishlistState {
  items: WishlistItem[];
  productIds: number[]; // An array of IDs for lightning-fast checking on the frontend
  fetchWishlist: (customerId: number) => Promise<void>;
  toggleWishlist: (customerId: number, productId: number) => Promise<boolean>;
  clearLocalWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  productIds: [],

  fetchWishlist: async (customerId) => {
    try {
      const res = await api.get(`/web/customers/${customerId}/wishlist`);
      if (res.data.success) {
        set({
          items: res.data.wishlist,
          productIds: res.data.wishlist.map((item: WishlistItem) => item.id)
        });
      }
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
    }
  },

  toggleWishlist: async (customerId, productId) => {
    try {
      const res = await api.post(`/web/customers/${customerId}/wishlist`, { product_id: productId });
      if (res.data.success) {
        // Refresh the list to get the updated UI
        await get().fetchWishlist(customerId);
        return res.data.isAdded;
      }
      return false;
    } catch (error) {
      console.error("Failed to toggle wishlist", error);
      return false;
    }
  },

  clearLocalWishlist: () => set({ items: [], productIds: [] })
}));