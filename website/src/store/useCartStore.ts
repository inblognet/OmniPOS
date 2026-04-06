import { create } from 'zustand';

// 1. Define what an image from the database looks like
interface ProductImage {
  url: string;
  is_primary: boolean;
}

// 2. Define exactly what a Product looks like when it comes from our API
interface Product {
  id: number;
  name: string;
  price: string | number; // Our DB returns price as a string, but we parse it
  images?: ProductImage[];
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartStore {
  items: CartItem[];
  // 3. We replaced 'any' with our new 'Product' type here!
  addItem: (product: Product) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product) => {
    const currentItems = get().items;
    const existingItem = currentItems.find((item) => item.id === product.id);

    if (existingItem) {
      // If it's already in the cart, just increase the quantity
      set({
        items: currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      });
    } else {
      // If it's new, add it to the cart
      set({
        items: [
          ...currentItems,
          {
            id: product.id,
            name: product.name,
            // Safely handle the price whether it's a string from DB or a number
            price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
            quantity: 1,
            imageUrl: product.images?.[0]?.url || "https://placehold.co/400x400?text=No+Image",
          },
        ],
      });
    }
  },
  removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
}));