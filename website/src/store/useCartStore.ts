// cspell:ignore omnipos partialize
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { useUserStore } from "./useUserStore";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotal: () => number;
  fetchCloudCart: (userId: number) => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      fetchCloudCart: async (userId: number) => {
        try {
          const res = await api.get(`/web/customers/${userId}/cart`);
          if (res.data.success) {
            // 🔥 FIX: Replaced 'any' with the exact expected database item type
            const cloudItems = res.data.cart.map((item: { id: number; name: string; price: string | number; imageUrl: string; quantity: number }) => ({
              id: item.id,
              name: item.name,
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
              imageUrl: item.imageUrl,
              quantity: item.quantity
            }));
            set({ items: cloudItems });
          }
        } catch (err) {
          console.error("Failed to fetch cloud cart", err);
        }
      },

      addItem: async (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);

        const quantityToAdd = item.quantity || 1;
        let newTotalQuantity = quantityToAdd;

        if (existingItem) {
          newTotalQuantity = existingItem.quantity + quantityToAdd;
          set({
            items: currentItems.map((i) =>
              i.id === item.id ? { ...i, quantity: newTotalQuantity } : i
            ),
            isOpen: true,
          });
        } else {
          set({ items: [...currentItems, { ...item, quantity: quantityToAdd }], isOpen: true });
        }

        const user = useUserStore.getState().user;
        if (user) {
          try {
            await api.post(`/web/customers/${user.id}/cart`, {
              product_id: item.id,
              quantity: newTotalQuantity,
            });
          } catch (err) {
            // 🔥 FIX: Added 'err' to the console log so it is used
            console.error("Cloud cart sync failed", err);
          }
        }
      },

      removeItem: async (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });

        const user = useUserStore.getState().user;
        if (user) {
          try {
            await api.post(`/web/customers/${user.id}/cart`, {
              product_id: id,
              quantity: 0,
            });
          } catch (err) {
            // 🔥 FIX: Added 'err' to the console log so it is used
            console.error("Cloud cart removal sync failed", err);
          }
        }
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "omnipos-cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);