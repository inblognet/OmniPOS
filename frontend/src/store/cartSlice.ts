import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ✅ 1. Update Interface to support Universal Product features + New Controls
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  barcode: string;
  category: string;
  // Critical for Hybrid Tax Logic
  isTaxIncluded?: boolean;
  // ✅ Fields for Item Controls
  discount?: number;
  note?: string;
  // ✅ NEW: Unit Measurement Logic
  unit?: string; // e.g., 'kg', 'g', 'ml', 'l', 'pcs'
  unitValue?: number; // e.g., 250 (for 250g)
}

// ✅ 2. Selected Customer Interface
export interface SelectedCustomer {
  id: number;
  name: string;
  loyaltyPoints: number;
  loyaltyJoined?: boolean;
}

// ✅ Interface for Held Sales
interface HeldSale {
  id: number;
  timestamp: number;
  items: CartItem[];
  customer: SelectedCustomer | null;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  customer: SelectedCustomer | null;
  heldSales: HeldSale[];
  // ✅ NEW: Transaction State
  paidAmount: number;
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  customer: null,
  heldSales: [],
  paidAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const product = action.payload;
      // Note: If adding a custom unit item (e.g., 500g Chicken), we treat unique unit/price combos as unique rows usually.
      // But for simplicity, we check ID. If it's a "custom unit" item, it usually has a unique timestamp ID anyway.
      const existingItem = state.items.find((item) => item.id === product.id);

      if (existingItem) {
        // Check stock limit before adding (optional)
        // if (existingItem.quantity < existingItem.stock) {
          existingItem.quantity += 1;
        // }
      } else {
        // Add new item with default controls and unit info
        state.items.push({
            ...product,
            quantity: 1,
            discount: 0,
            note: '',
            unit: product.unit || 'pcs',
            unitValue: product.unitValue || 1
        });
      }

      // Recalculate Total
      state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
    },

    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
    },

    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((i) => i.id === id);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.id !== id);
        } else {
          item.quantity = quantity;
        }
      }
      state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
    },

    // Manually update the price (Price Override)
    updatePrice: (state, action: PayloadAction<{ id: number; price: number }>) => {
      const { id, price } = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        item.price = price;
      }
      state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
    },

    // Apply Discount to specific item
    updateItemDiscount: (state, action: PayloadAction<{ id: number; discount: number }>) => {
        const item = state.items.find((i) => i.id === action.payload.id);
        if (item) {
            item.discount = action.payload.discount;
        }
        state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
    },

    // Add Note to specific item
    updateItemNote: (state, action: PayloadAction<{ id: number; note: string }>) => {
        const item = state.items.find((i) => i.id === action.payload.id);
        if (item) {
            item.note = action.payload.note;
        }
    },

    // ✅ NEW: Set Paid Amount
    setPaidAmount: (state, action: PayloadAction<number>) => {
        state.paidAmount = action.payload;
    },

    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.customer = null;
      state.paidAmount = 0; // ✅ Reset paid amount
    },

    setCustomer: (state, action: PayloadAction<SelectedCustomer>) => {
      state.customer = action.payload;
    },
    removeCustomer: (state) => {
      state.customer = null;
    },

    // Hold Sale Logic
    holdSale: (state) => {
        if (state.items.length > 0) {
            state.heldSales.push({
                id: Date.now(), // Generate timestamp ID
                timestamp: Date.now(),
                items: [...state.items],
                customer: state.customer
            });
            // Reset Cart
            state.items = [];
            state.totalAmount = 0;
            state.customer = null;
            state.paidAmount = 0; // ✅ Reset paid amount
        }
    },

    // Resume Sale Logic
    resumeSale: (state, action: PayloadAction<number>) => {
        const saleIndex = state.heldSales.findIndex(s => s.id === action.payload);
        if (saleIndex !== -1) {
            const sale = state.heldSales[saleIndex];
            // Restore Cart
            state.items = sale.items;
            state.customer = sale.customer;
            // Recalculate total immediately
            state.totalAmount = state.items.reduce((sum, item) => sum + ((item.price - (item.discount || 0)) * item.quantity), 0);
            state.paidAmount = 0; // Reset paid amount for new session
            // Remove from held queue
            state.heldSales.splice(saleIndex, 1);
        }
    }
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  updatePrice,
  updateItemDiscount,
  updateItemNote,
  setPaidAmount, // ✅ New export
  clearCart,
  setCustomer,
  removeCustomer,
  holdSale,
  resumeSale
} = cartSlice.actions;

export default cartSlice.reducer;