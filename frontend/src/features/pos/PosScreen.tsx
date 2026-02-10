import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../../db/db';
import ProductCard from './ProductCard';
import CartPanel from './CartPanel';
import {
  addToCart, updateQuantity, removeFromCart, updatePrice,
  updateItemDiscount, updateItemNote, holdSale, resumeSale, clearCart
} from '../../store/cartSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  Search, X, Save, Package, Plus, Filter,
  PauseCircle, PlayCircle, RotateCcw, FileText, LogIn, LogOut,
  Minus, Trash2, CheckCircle, Tag, Edit3, StickyNote, Calculator,
  ChevronDown, CheckSquare, Square, QrCode, Star
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import QuickScanModal from './QuickScanModal';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// ✅ Named Imports
import CheckoutModal from './CheckoutModal';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';

const PosScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const currency = useCurrency();
  const { items: cartItems, heldSales, customer } = useAppSelector((state) => state.cart);

  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(null);

  // Category Filter State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Quick Scan State
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);

  // Recent vs Favorites State
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'favorites'>('recent');
  const [hiddenRecentIds, setHiddenRecentIds] = useState<number[]>([]);

  // --- Modals State ---
  const [activeModal, setActiveModal] = useState<'price' | 'discount' | 'note' | null>(null);
  const [modalValue, setModalValue] = useState('');

  // --- Checkout & Print State ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // --- Unit Calculator State ---
  const [showUnitCalc, setShowUnitCalc] = useState(false);
  const [unitBasePrice, setUnitBasePrice] = useState('');
  const [unitWeight, setUnitWeight] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('g');

  // --- Custom Item State ---
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemTax, setCustomItemTax] = useState(true);

  // --- Quick Edit State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // --- Keyboard State ---
  const [showMainKeyboard, setShowMainKeyboard] = useState(false);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // --- Fetch Data ---
  const products = useLiveQuery(() => db.products.filter(p => p.isActive !== false).toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // --- Derived Lists ---
  const recentProducts = products
    .filter(p => p.id && !hiddenRecentIds.includes(p.id))
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 10);

  const favoriteProducts = products.filter(p => p.isFavorite);

  // --- Filter Logic ---
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query);

    let matchesCategory = true;
    if (selectedCategories.length > 0) {
        const productCats = product.category ? product.category.split(',').map(c => c.trim()) : [];
        matchesCategory = selectedCategories.some(sel => productCats.includes(sel));
    }

    return matchesSearch && matchesCategory;
  });

  // --- Global Keyboard Listener (HOME Key) ---
  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Home') {
              e.preventDefault();
              setIsQuickScanOpen(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // --- Handlers ---
  const toggleCategory = (catName: string) => {
      setSelectedCategories(prev =>
          prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
      );
  };

  const toggleFavorite = async (e: React.MouseEvent, product: Product) => {
      e.stopPropagation();
      if (!product.id) return;
      try {
          await db.products.update(product.id, { isFavorite: !product.isFavorite });
      } catch (err) {
          console.error("Failed to toggle favorite", err);
      }
  };

  const handleRemoveFromRecent = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setHiddenRecentIds(prev => [...prev, id]);
  };

  const validateAndAdd = (product: Product) => {
    if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) {
        alert(`Cannot sell "${product.name}". Out of stock.`);
        return;
    }
    dispatch(addToCart({
        id: product.id!,
        name: product.displayName || product.name,
        price: product.price,
        stock: product.stock,
        barcode: product.barcode,
        category: product.category,
        isTaxIncluded: product.isTaxIncluded,
        quantity: 1,
        discount: 0,
        note: ''
    }));
  };

  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    dispatch(addToCart({
      id: Date.now(),
      name: customItemName,
      price: parseFloat(customItemPrice),
      stock: 9999,
      barcode: 'CUSTOM',
      category: 'Custom',
      isTaxIncluded: customItemTax,
      quantity: 1,
      discount: 0,
      note: ''
    }));
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const handleAddUnitItem = () => {
      const price = parseFloat(unitBasePrice);
      const weight = parseFloat(unitWeight);
      if (!price || !weight) return;

      let finalPrice = 0;
      let nameSuffix = '';

      if (selectedUnit === 'g') {
          finalPrice = (price / 1000) * weight;
          nameSuffix = `${weight}g`;
      } else if (selectedUnit === 'kg') {
          finalPrice = price * weight;
          nameSuffix = `${weight}kg`;
      } else if (selectedUnit === 'ml') {
          finalPrice = (price / 1000) * weight;
          nameSuffix = `${weight}ml`;
      } else if (selectedUnit === 'l') {
          finalPrice = price * weight;
          nameSuffix = `${weight}L`;
      } else {
          finalPrice = price * weight;
          nameSuffix = `${weight}pcs`;
      }

      dispatch(addToCart({
          id: Date.now(),
          name: `Custom Item (${nameSuffix})`,
          price: parseFloat(finalPrice.toFixed(2)),
          stock: 9999,
          barcode: 'UNIT-CALC',
          category: 'Custom',
          isTaxIncluded: true,
          quantity: 1,
          unit: selectedUnit,
          unitValue: weight,
          discount: 0,
          note: ''
      }));
      setShowUnitCalc(false);
      setUnitBasePrice('');
      setUnitWeight('');
  };

  const handleControlRemove = () => {
      if (!selectedCartItemId) {
          alert("Please select an item from the list first.");
          return;
      }
      dispatch(removeFromCart(selectedCartItemId));
      setSelectedCartItemId(null);
  };

  const openControlModal = (type: 'price' | 'discount' | 'note') => {
      if (!selectedCartItemId) return;
      const item = cartItems.find(i => i.id === selectedCartItemId);
      if (!item) return;

      if (type === 'price') setModalValue(item.price.toString());
      if (type === 'discount') setModalValue(item.discount?.toString() || '0');
      if (type === 'note') setModalValue(item.note || '');
      setActiveModal(type);
  };

  const saveControlModal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCartItemId || !activeModal) return;

      if (activeModal === 'price') dispatch(updatePrice({ id: selectedCartItemId, price: parseFloat(modalValue) || 0 }));
      if (activeModal === 'discount') dispatch(updateItemDiscount({ id: selectedCartItemId, discount: parseFloat(modalValue) || 0 }));
      if (activeModal === 'note') dispatch(updateItemNote({ id: selectedCartItemId, note: modalValue }));

      setActiveModal(null);
  };

  const handleHoldSale = () => {
      if (cartItems.length === 0) return alert("Cart is empty");
      dispatch(holdSale());
  };
  const handleOpenHeld = () => {
      if (heldSales.length === 0) return alert("No held sales found.");
      dispatch(resumeSale(heldSales[heldSales.length - 1].id));
  };
  const handleRefund = () => alert("Go to Orders to process refunds.");
  const handleReprint = () => alert("Reprinting...");
  const handleCashIO = (type: 'in' | 'out') => alert(`Cash ${type} clicked`);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim() !== '') {
          const query = searchQuery.trim();
          const exactMatch = products.find(p => p.barcode === query || p.sku === query);
          if (exactMatch) {
              validateAndAdd(exactMatch);
              setSearchQuery('');
          } else if (filteredProducts.length === 1) {
              validateAndAdd(filteredProducts[0]);
              setSearchQuery('');
          }
      }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProduct || !editingProduct.id) return;
      try {
          await db.products.update(editingProduct.id, {
              name: editingProduct.name,
              price: Number(editingProduct.price),
              stock: Number(editingProduct.stock)
          });
          setEditingProduct(null);
      } catch (err) {
          console.error(err);
      }
  };

  // ✅ CHECKOUT HANDLERS
  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    setIsCheckoutOpen(true);
  };

  // ✅ UPDATED: Returns Promise<number> (The real Database ID)
  const handleFinalizeSale = async (orderDetails: any): Promise<number> => {
    // 1. Save Order to DB (Including Loyalty Stats)
    const orderId = await db.orders.add({
        timestamp: Date.now(),
        items: orderDetails.items,
        total: orderDetails.finalTotal,
        status: 'completed',
        paymentMethod: orderDetails.paymentMethod,
        customerId: orderDetails.customer?.id,
        // ✅ Saving Loyalty Points to Order Record
        pointsRedeemed: orderDetails.pointsRedeemed || 0,
        pointsMonetaryValue: orderDetails.pointsMonetaryValue || 0,
        pointsEarned: orderDetails.pointsEarned || 0,
        tendered: orderDetails.paidAmount,
        change: orderDetails.change,
    });

    // 2. Update Stock
    for (const item of orderDetails.items) {
        if (item.id) { // Ensure ID exists
            const product = await db.products.get(item.id);
            if (product && product.type === 'Stock') {
                await db.products.update(item.id, { stock: (product.stock || 0) - item.quantity });
            }
        }
    }

    // 3. ✅ ROBUST CUSTOMER LOYALTY UPDATE
    if (orderDetails.customer && orderDetails.customer.id) {
        // Fetch FRESH data from DB to avoid overwriting with stale Redux state
        const freshCustomer = await db.customers.get(orderDetails.customer.id);

        if (freshCustomer) {
            const currentPoints = freshCustomer.loyaltyPoints || 0;
            const redeemed = orderDetails.pointsRedeemed || 0;
            const earned = orderDetails.pointsEarned || 0;

            // Calculate new balance safely
            const newPoints = Math.max(0, currentPoints - redeemed + earned);

            await db.customers.update(freshCustomer.id!, {
                loyaltyPoints: newPoints,
                totalPurchases: (freshCustomer.totalPurchases || 0) + 1,
                totalSpend: (freshCustomer.totalSpend || 0) + orderDetails.finalTotal,
                lastPurchaseDate: new Date().toISOString()
            });
        }
    }

    // 4. Trigger Print
    const fullOrder = await db.orders.get(orderId);
    setLastOrder(fullOrder);

    setTimeout(() => {
        window.print();
        setLastOrder(null);
    }, 1500); // 1.5s delay to allow render

    // 5. Clear Cart
    dispatch(clearCart());

    // ✅ FIX: RETURN THE REAL DATABASE ID
    return Number(orderId);
  };

  // --- Keyboard Handlers ---
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only show main keyboard if NO modal is open
    if (!activeModal && !editingProduct) {
        activeInputRef.current = e.target;
        setShowMainKeyboard(true);
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    if (activeInputRef.current) {
        const input = activeInputRef.current;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentVal = input.value;
            const newVal = currentVal.substring(0, start) + key + currentVal.substring(end);

            nativeInputValueSetter.call(input, newVal);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
  };

  const handleVirtualBackspace = () => {
    if (activeInputRef.current) {
        const input = activeInputRef.current;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
            const currentVal = input.value;
            const newVal = currentVal.slice(0, -1);
            nativeInputValueSetter.call(input, newVal);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
  };

  // Close keyboard on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && !target.closest('.virtual-keyboard-container')) {
        setShowMainKeyboard(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-100 relative">

      {/* --- LEFT COLUMN --- */}
      <div className="flex-1 flex flex-col min-w-0 mr-4">

        {/* 1. Header & Filters */}
        <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 space-y-3 relative">

          <div className="flex gap-2 h-10">
            {/* Search Bar Wrapper */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                // ✅ REMOVED autoFocus here so keyboard doesn't pop up on load
                onFocus={handleInputFocus}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm h-full"
                placeholder="Scan Barcode, SKU, or Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />

              {/* ✅ KEYBOARD MOVED HERE */}
              {showMainKeyboard && !activeModal && (
                <div className="virtual-keyboard-container absolute top-full left-0 w-full z-50 mt-2 animate-in fade-in slide-in-from-top-2">
                  <VirtualKeyboard
                    onKeyPress={handleVirtualKeyPress}
                    onBackspace={handleVirtualBackspace}
                    onEnter={() => setShowMainKeyboard(false)}
                    layout="full"
                  />
                </div>
              )}
            </div>

            {/* ✅ SCAN BUTTON: Transparent + Border */}
            <button
                onClick={() => setIsQuickScanOpen(true)}
                className="bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100 px-4 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                title="Press HOME key"
            >
                <QrCode size={18} /> SCAN
            </button>

            {/* Filter Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`h-full px-4 rounded-lg border font-bold text-sm flex items-center gap-2 transition-colors ${selectedCategories.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Filter size={16} />
                    {selectedCategories.length > 0 ? `${selectedCategories.length}` : 'Filter'}
                    <ChevronDown size={14} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showFilterDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase">Select Categories</span>
                            {selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} className="text-[10px] text-red-500 hover:underline">Clear All</button>}
                        </div>
                        {categories.length === 0 ? <div className="p-3 text-center text-xs text-gray-400">No categories found.</div> :
                            categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.name)}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg text-left transition-colors"
                                >
                                    {selectedCategories.includes(cat.name) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-300"/>}
                                    <span className={`text-sm ${selectedCategories.includes(cat.name) ? 'font-bold text-blue-700' : 'text-gray-700'}`}>{cat.name}</span>
                                </button>
                            ))
                        }
                    </div>
                )}
                {showFilterDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)}></div>}
            </div>
          </div>

          {/* Active Filter Chips */}
          {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                  {selectedCategories.map(cat => (
                      <button key={cat} onClick={() => toggleCategory(cat)} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-200 transition-colors border border-blue-200">
                          {cat} <X size={12}/>
                      </button>
                  ))}
                  <button onClick={() => setSelectedCategories([])} className="text-xs text-gray-500 underline hover:text-gray-700 px-2">Reset</button>
              </div>
          )}
        </div>

        {/* 2. Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => {
               const isOutOfStock = product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock;
               return (
                  <div key={product.id} className={isOutOfStock ? "opacity-50 grayscale cursor-not-allowed relative" : ""}>
                      <ProductCard product={product} onClick={() => !isOutOfStock && validateAndAdd(product)} onEdit={() => setEditingProduct(product)} />
                      {isOutOfStock && ( <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg transform -rotate-12">OUT OF STOCK</span></div> )}
                  </div>
               );
            })}
          </div>
        </div>

        {/* 3. CART LIST */}
        <div className="bg-transparent border-t border-gray-200 h-64 flex flex-col">
            <div className="px-4 py-2 bg-transparent border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Order Items ({cartItems.length})</h3>
                <span className="text-[10px] text-gray-400">Select an item to enable controls</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {cartItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-300 text-sm">Cart is empty. Scan items to add.</div>
                ) : (
                    cartItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedCartItemId(item.id)}
                            // ✅ ITEM STYLE UPDATE:
                            // - Transparent background
                            // - Selected: Blue Ring/Border, Light Gray Text Name
                            className={`flex justify-between items-center py-2 border-b cursor-pointer transition-all last:border-b-0 px-2 ${
                                selectedCartItemId === item.id
                                ? 'bg-transparent ring-1 ring-blue-500 border-blue-500 rounded' // Selected: Transparent BG, Blue Outline
                                : 'bg-transparent border-gray-100 hover:bg-gray-50' // Default
                            }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    {/* ✅ Name: Gray-200 (Faint) when selected, Gray-800 otherwise */}
                                    <span className={`font-bold text-sm ${selectedCartItemId === item.id ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</span>
                                    {selectedCartItemId === item.id && <CheckCircle size={14} className="text-blue-600"/>}
                                    {item.note && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">{item.note}</span>}
                                </div>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    <span>{currency}{item.price.toFixed(2)}</span>
                                    {item.discount && item.discount > 0 && <span className="text-red-500">(-{currency}{item.discount})</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-gray-800">x{item.quantity}</span>
                                {/* ✅ Price: Always Blue (Visible) */}
                                <span className="text-sm font-bold text-blue-600 w-20 text-right">{currency}{((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* 4. Bottom Panels */}
        <div className="p-4 grid grid-cols-12 gap-4 bg-gray-50 border-t border-gray-200">

          {/* Quick Actions */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col gap-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2 h-full">
              {/* ✅ HOLD BUTTON: Transparent + Border */}
              <button onClick={handleHoldSale} className="flex items-center justify-center gap-2 bg-transparent border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 font-bold text-xs shadow-sm transition-all active:scale-95">
                  <PauseCircle size={14}/> Hold
              </button>
              <button onClick={handleOpenHeld} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs">
                  <PlayCircle size={14}/> Open
              </button>
              <button onClick={handleRefund} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs">
                  <RotateCcw size={14}/> Refund
              </button>
              <button onClick={handleReprint} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs">
                  <FileText size={14}/> Reprint
              </button>
              <button onClick={() => handleCashIO('in')} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs">
                  <LogIn size={14}/> Cash In
              </button>
              <button onClick={() => handleCashIO('out')} className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs">
                  <LogOut size={14}/> Cash Out
              </button>
            </div>
          </div>

          {/* Recent / Favorites */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col">

            {/* Tabs */}
            <div className="flex gap-2 mb-2">
              {/* ✅ RECENT BUTTON: Transparent + Border (Active) */}
              <button
                onClick={() => setSidebarTab('recent')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                    sidebarTab === 'recent'
                    ? 'bg-transparent border border-gray-400 text-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSidebarTab('favorites')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${sidebarTab === 'favorites' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-600 hover:bg-blue-50'}`}
              >
                <Star size={12} fill={sidebarTab === 'favorites' ? "currentColor" : "none"} /> Favorites
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
               {sidebarTab === 'recent' ? (
                 recentProducts.length === 0 ? <div className="text-center text-xs text-gray-400 py-4">No recent items.</div> :
                 recentProducts.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-50 group relative">
                          <button onClick={(e) => toggleFavorite(e, p)} className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors z-10" title="Pin">
                             <Star size={14} fill={p.isFavorite ? "#3b82f6" : "none"} className={p.isFavorite ? "text-blue-500" : ""} />
                          </button>
                          <div className="flex-1 flex justify-between items-center pl-6">
                             <span className="text-xs font-bold text-gray-700 truncate w-28">{p.name}</span>
                             <div className="flex gap-1">
                                 <button onClick={(e) => p.id && handleRemoveFromRecent(e, p.id)} className="w-5 h-5 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"><X size={12}/></button>
                                 <button onClick={() => validateAndAdd(p)} className="w-5 h-5 bg-white border border-blue-300 rounded flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors"><Plus size={12}/></button>
                             </div>
                          </div>
                      </div>
                  ))
                ) : (
                  favoriteProducts.length === 0 ? <div className="text-center text-xs text-gray-400 py-4">No favorites yet.</div> :
                  favoriteProducts.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 group relative">
                          <button onClick={(e) => toggleFavorite(e, p)} className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center text-blue-500 hover:text-blue-700 transition-colors z-10" title="Unpin">
                             <Star size={14} fill="currentColor" />
                          </button>
                          <div className="flex-1 flex justify-between items-center pl-6">
                             <span className="text-xs font-bold text-blue-900 truncate w-32">{p.name}</span>
                             <button onClick={() => validateAndAdd(p)} className="w-5 h-5 bg-white border border-blue-300 rounded flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors"><Plus size={12}/></button>
                          </div>
                      </div>
                  ))
                )}
            </div>
          </div>

          {/* Item Controls */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Item Controls {selectedCartItemId ? <span className="text-blue-600">(Active)</span> : <span className="text-gray-300">(Select Item)</span>}
            </h4>
            <div className={`grid grid-cols-2 gap-2 flex-1 transition-opacity ${!selectedCartItemId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
               <button onClick={() => selectedCartItemId && dispatch(updateQuantity({ id: selectedCartItemId, quantity: cartItems.find(i=>i.id===selectedCartItemId)!.quantity - 1 }))} className="bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-100">
                   <Minus size={14}/> Qty
               </button>
               <button onClick={() => selectedCartItemId && dispatch(updateQuantity({ id: selectedCartItemId, quantity: cartItems.find(i=>i.id===selectedCartItemId)!.quantity + 1 }))} className="bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-100">
                   <Plus size={14}/> Qty
               </button>
               <button onClick={() => openControlModal('price')} className="bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 text-xs hover:bg-gray-100 flex items-center justify-center gap-1">
                   <Edit3 size={12}/> Edit Price
               </button>
               <button onClick={() => openControlModal('discount')} className="bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 text-xs hover:bg-gray-100 flex items-center justify-center gap-1">
                   <Tag size={12}/> Discount
               </button>
               <button onClick={() => openControlModal('note')} className="bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 text-xs hover:bg-gray-100 flex items-center justify-center gap-1">
                   <StickyNote size={12}/> Add Note
               </button>
               {/* ✅ REMOVE BUTTON: Transparent + Red Border */}
               <button onClick={handleControlRemove} className="bg-transparent border border-red-500 text-red-600 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-red-50 shadow-sm transition-all active:scale-95">
                   <Trash2 size={14}/> Remove
               </button>
            </div>
          </div>
        </div>

        {/* 5. Footer */}
        <div className="p-3 bg-white border-t border-gray-200 flex gap-3 items-center">
           <div className="flex-1">
               <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Custom Item Name</label>
               <input
                 type="text"
                 placeholder="e.g. Service Fee"
                 value={customItemName}
                 onChange={e => setCustomItemName(e.target.value)}
                 onFocus={handleInputFocus}
                 className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
               />
           </div>
           <div className="w-32">
               <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Price ({currency})</label>
               <input
                 type="number"
                 placeholder="0.00"
                 value={customItemPrice}
                 onChange={e => setCustomItemPrice(e.target.value)}
                 onFocus={handleInputFocus}
                 className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
           </div>
           <div className="w-20">
               <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tax</label>
               {/* ✅ TAX BUTTON: Transparent + Colored Border */}
               <button
                   onClick={() => setCustomItemTax(!customItemTax)}
                   className={`w-full py-2 rounded-lg text-sm font-bold border transition-colors ${customItemTax ? 'bg-transparent text-green-600 border-green-500' : 'bg-transparent text-gray-500 border-gray-300'}`}
               >
                   {customItemTax ? 'ON' : 'OFF'}
               </button>
           </div>
           <div className="h-full flex items-end">
               {/* ✅ ADD ITEM BUTTON: Transparent + Border */}
               <button
                   onClick={handleAddCustomItem}
                   className="bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100 px-6 py-2.5 rounded-xl font-bold shadow-sm active:scale-95 transition-all mb-[1px]"
               >
                   Add Item
               </button>
           </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN (Cart Panel) --- */}
      <div className="w-96 flex-shrink-0 bg-white shadow-xl z-20 border-l border-gray-200">
        <CartPanel
            onCancelItem={handleControlRemove}
            onInputFocus={handleInputFocus}
            onCheckout={handleCheckoutClick} // ✅ Pass Checkout Handler
        />
      </div>

      {/* --- MODALS --- */}
      <QuickScanModal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} />

      {/* 1. Item Control Modal (With Minimal Keyboard) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onMouseDown={(e) => { if(e.target === e.currentTarget) setActiveModal(null); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative" onMouseDown={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">
                        {activeModal === 'price' && <Edit3 size={18} className="text-blue-600"/>}
                        {activeModal === 'discount' && <Tag size={18} className="text-blue-600"/>}
                        {activeModal === 'note' && <StickyNote size={18} className="text-blue-600"/>}
                        Update {activeModal}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeModal === 'note' ? 'Note Content' : `Value (${currency})`}</label>
                        <input
                            ref={activeInputRef} // ✅ Capture ref for modal keyboard
                            type={activeModal === 'note' ? 'text' : 'number'}
                            autoFocus
                            required
                            value={modalValue}
                            onChange={(e) => setModalValue(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                        />
                    </div>

                    {/* ✅ Minimal Modal Keyboard */}
                    <div className="flex justify-center">
                        <VirtualKeyboard
                            layout={activeModal === 'note' ? 'full' : 'numeric'}
                            onKeyPress={handleVirtualKeyPress}
                            onBackspace={handleVirtualBackspace}
                            // ✅ FIX: Mock event for type safety
                            onEnter={() => saveControlModal({ preventDefault: () => {} } as any)}
                            className="bg-gray-100 border-none shadow-none"
                        />
                    </div>

                    <button type="submit" onClick={saveControlModal} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"><Save size={18} /> Save Changes</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. Unit Calculator Modal */}
      {showUnitCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18} className="text-blue-600"/> Unit Calculator</h3>
                    <button onClick={() => setShowUnitCalc(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Base Price</label><input type="number" autoFocus placeholder="e.g. 1200" value={unitBasePrice} onChange={e => setUnitBasePrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold"/></div>
                    <div className="flex gap-2">
                        <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">Weight</label><input type="number" placeholder="e.g. 250" value={unitWeight} onChange={e => setUnitWeight(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold"/></div>
                        <div className="w-24"><label className="block text-xs font-bold text-gray-500 mb-1">Unit</label><select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold bg-white"><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option><option value="pcs">Pcs</option></select></div>
                    </div>
                    <button onClick={handleAddUnitItem} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold">Add to Cart</button>
                </div>
            </div>
        </div>
      )}

      {/* 3. Quick Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Quick Edit</h3><button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
                <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label><input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label><input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock</label><input type="number" required value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"><Save size={18} /> Save Changes</button>
                </form>
            </div>
        </div>
      )}

      {/* 4. Checkout Modal (✅ Now Integrated) */}
      <CheckoutModal
         isOpen={isCheckoutOpen}
         onClose={() => setIsCheckoutOpen(false)}
         subtotal={cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
         itemsCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
         cartItems={cartItems}
         customer={customer as any} // ✅ PASSED HERE
         onFinalize={handleFinalizeSale}
      />

      {/* 5. Hidden Receipt Template (Prints automatically when lastOrder is set) */}
      {lastOrder && <ReceiptTemplate order={lastOrder} />}

    </div>
  );
};

export default PosScreen;