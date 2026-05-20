import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { useUserStore } from './useUserStore';

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
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotal: () => number;
  getTotalItems: () => number;
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
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      fetchCloudCart: async (userId: number) => {
        try {
          const res = await api.get(`/web/customers/${userId}/cart`);
          if (res.data.success) {
            const cloudItems = res.data.cart.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
              imageUrl: item.imageUrl,
              quantity: item.quantity
            }));
            set({ items: cloudItems });
          }
        } catch (err) {
          console.error('Failed to fetch cloud cart', err);
        }
      },
      
      addItem: async (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);
        
        let newTotalQuantity = item.quantity;
        
        if (existingItem) {
          newTotalQuantity = existingItem.quantity + item.quantity;
          set({
            items: currentItems.map((i) =>
              i.id === item.id ? { ...i, quantity: newTotalQuantity } : i
            ),
          });
        } else {
          set({ items: [...currentItems, { ...item, quantity: item.quantity }] });
        }
        
        const user = useUserStore.getState().user;
        if (user && user.user_type === 'customer') {
          try {
            await api.post(`/web/customers/${user.id}/cart`, {
              product_id: item.id,
              quantity: newTotalQuantity,
            });
          } catch (err) {
            console.error('Cloud cart sync failed', err);
          }
        }
      },
      
      removeItem: async (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
        
        const user = useUserStore.getState().user;
        if (user && user.user_type === 'customer') {
          try {
            await api.post(`/web/customers/${user.id}/cart`, {
              product_id: id,
              quantity: 0,
            });
          } catch (err) {
            console.error('Cloud cart removal sync failed', err);
          }
        }
      },
      
      updateQuantity: async (id, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(id);
          return;
        }
        
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
        
        const user = useUserStore.getState().user;
        if (user && user.user_type === 'customer') {
          try {
            await api.post(`/web/customers/${user.id}/cart`, {
              product_id: id,
              quantity,
            });
          } catch (err) {
            console.error('Cloud cart update sync failed', err);
          }
        }
      },
      
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'omnipos-mobile-cart',
    }
  )
);
