// cspell:ignore dexie cust
import React, { useState, useEffect, useRef } from 'react';
import ProductCard from './ProductCard';
import CartPanel from './CartPanel';
import {
  addToCart, updatePrice, updateItemDiscount, updateItemNote,
  clearCart, setCustomer, removeFromCart
} from '../../store/cartSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  Search, X, Save, Package, Filter, CheckSquare, Square, QrCode, User, Keyboard, Lock, Unlock,
  MonitorPlay, Monitor
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import QuickScanModal from './QuickScanModal';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// Named Imports
import CheckoutModal from './CheckoutModal';
import RefundModal from './RefundModal';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';

// API Services
import { productService } from '../../services/productService';
import { customerService, Customer } from '../../services/customerService';

// Import CFD Sync Hook
import { useCFDSync } from '../../hooks/useCFDSync.ts';

const PosScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const currency = useCurrency();
  const { items: cartItems, customer } = useAppSelector((state) => state.cart);

  // Initialize CFD Broadcaster
  const { broadcast } = useCFDSync();

  // CFD Toggle State
  const [isCFDEnabled, setIsCFDEnabled] = useState(false);

  // --- UI State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);

  const [activeModal, setActiveModal] = useState<'price' | 'discount' | 'note' | null>(null);
  const [modalValue, setModalValue] = useState('');

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showMainKeyboard, setShowMainKeyboard] = useState(false);
  const [isKeyboardLocked, setIsKeyboardLocked] = useState(false);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);

  // --- LIVE CALCULATIONS ---
  const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const grossAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + ((item.discount || 0) * item.quantity), 0);
  const taxRate = 0.00;
  const totalTax = (grossAmount - totalDiscount) * taxRate;
  const roundOff = 0.00;
  const netPayable = grossAmount - totalDiscount + totalTax - roundOff;

  // --- LAUNCH CFD WINDOW HANDLER ---
  const handleToggleCFD = () => {
    const nextState = !isCFDEnabled;
    setIsCFDEnabled(nextState);

    if (nextState) {
        window.open(
            '/#/cfd-display',
            'CustomerDisplayWindow',
            'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no'
        );
    }
  };

  // --- CFD BROADCASTING LOGIC ---
  useEffect(() => {
    if (!isCFDEnabled) {
      broadcast({ type: 'IDLE' });
      return;
    }
    if (lastOrder) {
      broadcast({ type: 'CHECKOUT_SUCCESS' });
      return;
    }
    if (cartItems.length === 0) {
      broadcast({ type: 'IDLE' });
      return;
    }

    broadcast({
      type: isCheckoutOpen ? 'CHECKOUT_INTERACTION' : 'ACTIVE_CART',
      cart: cartItems,
      totals: { subtotal: grossAmount, tax: totalTax, discount: totalDiscount, total: netPayable, itemCount: totalQty },
      customerData: customer ? { name: customer.name, phone: (customer as any).phone, email: (customer as any).email } : undefined
    });
  }, [cartItems, grossAmount, totalTax, totalDiscount, netPayable, totalQty, isCheckoutOpen, lastOrder, customer, isCFDEnabled, broadcast]);

  // --- ✅ OFFLINE-READY DATA LOADER ---
  const loadData = async () => {
    try {
      setLoading(true);
      let prodData: any[] = [];
      let custData: Customer[] = [];

      // 🌐 NETWORK INTERCEPTOR
      if (navigator.onLine) {
        // 🟢 ONLINE: Fetch fresh from Render
        prodData = await productService.getAll();
        custData = await customerService.getAll();
      } else {
        // 🔴 OFFLINE: Load from local SQLite Cache!
        if (window.electronAPI) {
          console.log("⚡ Offline detected. Loading catalog from SQLite cache...");
          const cachedProducts = await window.electronAPI.getCache('products');
          const cachedCustomers = await window.electronAPI.getCache('customers');

          if (cachedProducts.success && cachedProducts.data) prodData = cachedProducts.data;
          if (cachedCustomers.success && cachedCustomers.data) custData = cachedCustomers.data;
        }
      }

      setProducts(prodData.filter(p => p.isActive !== false));
      setCustomers(custData);

      const extractedCats = Array.from(new Set(prodData.map(p => p.category).filter(Boolean))).map((cat, idx) => ({ id: idx, name: cat as string }));
      setCategories(extractedCats as any);

    } catch (error) {
      console.error("Failed to load POS data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- Filtering & Lists ---
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(query) || (product.barcode && product.barcode.toLowerCase().includes(query)) || (product.sku && product.sku.toLowerCase().includes(query));
    let matchesCategory = true;
    if (selectedCategories.length > 0) {
        const productCats = product.category ? product.category.split(',').map((c: string) => c.trim()) : [];
        matchesCategory = selectedCategories.some(sel => productCats.includes(sel));
    }
    return matchesSearch && matchesCategory;
  });
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).slice(0, 5);

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Home') { e.preventDefault(); setIsQuickScanOpen(prev => !prev); }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // --- Handlers ---
  const toggleCategory = (catName: string) => setSelectedCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);

  const validateAndAdd = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;
    if (product.type === 'Stock' && !product.allowNegativeStock) {
        if (product.stock <= 0) return alert(`Cannot sell "${product.name}". Out of stock.`);
        if (currentQty + 1 > product.stock) return alert(`Cannot sell "${product.name}". Only ${product.stock} in stock.`);
    }
    dispatch(addToCart({ id: product.id!, name: product.displayName || product.name, price: product.price, stock: product.stock, barcode: product.barcode, category: product.category, isTaxIncluded: product.isTaxIncluded, quantity: 1, discount: 0, note: '' }));
  };

  const openControlModal = (type: 'price' | 'discount' | 'note') => {
      if (!selectedCartItemId) return alert("Please select an item from the list first.");
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

  const handleRefundClick = () => { setIsRefundOpen(true); };
  const handleReprint = () => alert("Reprinting...");

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && searchQuery.trim() !== '') {
          const query = searchQuery.trim();
          const exactMatch = products.find(p => p.barcode === query || p.sku === query);
          if (exactMatch) { validateAndAdd(exactMatch); setSearchQuery(''); }
          else if (filteredProducts.length === 1) { validateAndAdd(filteredProducts[0]); setSearchQuery(''); }
      }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault(); if (!editingProduct || !editingProduct.id) return;
      try { await productService.update(editingProduct.id, { ...editingProduct, name: editingProduct.name, price: Number(editingProduct.price), stock: Number(editingProduct.stock) }); setEditingProduct(null); loadData(); }
      catch (err) { alert("Failed to update product via API"); }
  };

  const handleCheckoutClick = () => { if (cartItems.length > 0) setIsCheckoutOpen(true); };

  const handleSaleComplete = (orderData: any) => {
      setLastOrder(orderData);
      setTimeout(() => { window.print(); setLastOrder(null); dispatch(clearCart()); loadData(); }, 500);
  };

  const handleRefundComplete = (refundOrder: any) => {
    setLastOrder({ ...refundOrder, total_amount: refundOrder.totalAmount || refundOrder.total_amount });
    setTimeout(() => { window.print(); setLastOrder(null); loadData(); }, 500);
  };

  // Virtual Keyboard Handlers
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!activeModal && !editingProduct) {
        activeInputRef.current = e.target;
        setShowMainKeyboard(true);
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    if (activeInputRef.current) {
        const input = activeInputRef.current;

        if (input.name === "customerSearchInput") {
            setCustomerSearch(prev => prev + key);
        } else {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (setter) {
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                const newVal = input.value.substring(0, start) + key + input.value.substring(end);
                setter.call(input, newVal);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
  };

  const handleVirtualBackspace = () => {
    if (activeInputRef.current) {
        const input = activeInputRef.current;

        if (input.name === "customerSearchInput") {
            setCustomerSearch(prev => prev.slice(0, -1));
        } else {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (setter) {
                const newVal = input.value.slice(0, -1);
                setter.call(input, newVal);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
  };

  const handleVirtualEnter = () => {
      if (activeInputRef.current && activeInputRef.current.name !== "customerSearchInput" && searchQuery.trim() !== '') {
          const query = searchQuery.trim();
          const exactMatch = products.find(p => p.barcode === query || p.sku === query);
          if (exactMatch) { validateAndAdd(exactMatch); setSearchQuery(''); }
          else if (filteredProducts.length === 1) { validateAndAdd(filteredProducts[0]); setSearchQuery(''); }
      }
      if (!isKeyboardLocked) { setShowMainKeyboard(false); }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!isKeyboardLocked && target.tagName !== 'INPUT' && !target.closest('.virtual-keyboard-container')) {
        setShowMainKeyboard(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isKeyboardLocked]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-100 relative">

      {/* --- COLUMN 1: LEFT PANEL (Flexible Width) --- */}
      <div className="flex-1 flex flex-col min-w-0 mr-4 relative">

        {/* Header & Filters */}
        <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 space-y-3 relative shrink-0">
          <div className="flex gap-2 h-10">
            {/* Product Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="productSearchInput"
                onFocus={handleInputFocus}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm h-full"
                placeholder="Scan Barcode, SKU, or Search Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            {/* Customer Search Bar */}
            <div className="relative w-64">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                {customer ? (
                    <div className="flex items-center justify-between w-full h-full pl-10 pr-2 border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-800 font-bold">
                        <span className="truncate">{customer.name}</span>
                        <button onClick={() => dispatch(setCustomer(undefined as any))} className="p-1 hover:bg-blue-100 rounded-full"><X size={14}/></button>
                    </div>
                ) : (
                    <input
                        type="text"
                        name="customerSearchInput"
                        placeholder="Search Customer..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm h-full"
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={(e) => { handleInputFocus(e); setShowCustomerDropdown(true); }}
                    />
                )}
                {/* Cloud Customer Dropdown */}
                {showCustomerDropdown && customerSearch && !customer && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 max-h-64 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-xs text-gray-400 text-center">No customers found</div>
                        ) : (
                            filteredCustomers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => {
                                        dispatch(setCustomer(c as any));
                                        setCustomerSearch('');
                                        setShowCustomerDropdown(false);
                                    }}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                >
                                    <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                                    <p className="text-xs text-gray-400">{c.phone}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {showCustomerDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)}></div>}
            </div>

            <button onClick={() => setIsQuickScanOpen(true)} className="bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100 px-4 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"><QrCode size={18} /> SCAN</button>
            <div className="relative">
                <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className={`h-full px-4 rounded-lg border font-bold text-sm flex items-center gap-2 transition-colors ${selectedCategories.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}><Filter size={16} /> Filter</button>
                {showFilterDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase">Select Categories</span>
                            {selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} className="text-[10px] text-red-500 hover:underline">Clear All</button>}
                        </div>
                        {categories.length === 0 ? <div className="p-3 text-center text-xs text-gray-400">No categories found.</div> :
                            categories.map(cat => (
                                <button key={cat.id} onClick={() => toggleCategory(cat.name)} className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg text-left transition-colors">
                                    {selectedCategories.includes(cat.name) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-300"/>}
                                    <span className={`text-sm ${selectedCategories.includes(cat.name) ? 'font-bold text-blue-700' : 'text-gray-700'}`}>{cat.name}</span>
                                </button>
                            ))
                        }
                    </div>
                )}
                {showFilterDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)}></div>}
            </div>

            {/* CFD TOGGLE & LAUNCH BUTTON */}
            <button
                onClick={handleToggleCFD}
                className={`h-full px-4 rounded-lg border font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 ${
                  isCFDEnabled
                    ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                title="Launch Customer Display"
            >
                {isCFDEnabled ? <MonitorPlay size={16} className="animate-pulse" /> : <Monitor size={16} />}
                CFD {isCFDEnabled ? 'ON' : 'OFF'}
            </button>

          </div>
          {selectedCategories.length > 0 && ( <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1"> {selectedCategories.map(cat => ( <button key={cat} onClick={() => toggleCategory(cat)} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-200 transition-colors border border-blue-200"> {cat} <X size={12}/> </button> ))} <button onClick={() => setSelectedCategories([])} className="text-xs text-gray-500 underline hover:text-gray-700 px-2">Reset</button> </div> )}
        </div>

        {/* Current Order Items List */}
        <div className="bg-transparent border-b border-gray-200 h-48 flex flex-col shrink-0">
            <div className="px-4 py-2 bg-transparent border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Order Items ({cartItems.length})</h3>
                <span className="text-[10px] text-gray-400">Select an item to enable controls</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {cartItems.map((item) => (
                    <div key={item.id} onClick={() => setSelectedCartItemId(item.id)} className={`flex justify-between items-center py-2 border-b cursor-pointer px-2 ${selectedCartItemId === item.id ? 'bg-blue-50 ring-1 ring-blue-500 border-blue-500 rounded' : 'hover:bg-gray-50'}`}>
                        <div className="flex-1"><span className="font-bold text-sm">{item.name}</span> <span className="text-xs text-gray-500">{currency}{item.price.toFixed(2)}</span></div>
                        <div className="flex items-center gap-4"><span className="text-sm font-bold">x{item.quantity}</span><span className="text-sm font-bold text-blue-600">{currency}{((item.price - (item.discount||0)) * item.quantity).toFixed(2)}</span></div>
                    </div>
                ))}
            </div>
        </div>

        {/* LIVE ORDER SUMMARY */}
        <div className="bg-white border-t border-b border-gray-200 p-4 shadow-sm z-10">
            <div className="flex justify-between items-end">
                <div className="flex gap-6 text-sm text-gray-600">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Qty</p>
                        <p className="font-bold text-lg">{totalQty.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Gross Amt</p>
                        <p className="font-bold text-lg">{currency}{grossAmount.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Discount</p>
                        <p className="font-bold text-lg text-red-500">-{currency}{totalDiscount.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Tax</p>
                        <p className="font-bold text-lg">{currency}{totalTax.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Round Off</p>
                        <p className="font-bold text-lg">{currency}{roundOff.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-gray-200 px-6 py-2 rounded-lg text-right min-w-[140px]">
                     <div className="text-3xl font-black text-red-600 leading-none tracking-tight">
                          {currency}{netPayable.toFixed(2)}
                     </div>
                </div>
            </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {loading ? <div className="h-full flex items-center justify-center text-gray-400">Loading products...</div> : (
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
          )}
        </div>

        {/* VIRTUAL KEYBOARD WITH LOCK TOGGLE */}
        {showMainKeyboard && !activeModal && (
          <div className="virtual-keyboard-container absolute bottom-4 left-4 right-4 z-[100] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                     <Keyboard size={14}/> Virtual Keyboard
                 </div>
                 <div className="flex items-center gap-2">
                     <button
                        onClick={() => setIsKeyboardLocked(!isKeyboardLocked)}
                        className={`p-1.5 rounded-full transition-colors ${isKeyboardLocked ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={isKeyboardLocked ? "Keyboard Locked (Always Open)" : "Auto-Close Enabled"}
                     >
                        {isKeyboardLocked ? <Lock size={16} /> : <Unlock size={16} />}
                     </button>
                     <button onClick={() => setShowMainKeyboard(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"><X size={16}/></button>
                 </div>
             </div>
             <VirtualKeyboard
               onKeyPress={handleVirtualKeyPress}
               onBackspace={handleVirtualBackspace}
               onEnter={handleVirtualEnter}
               layout="full"
             />
          </div>
        )}

      </div>

      {/* --- COLUMN 2: CART PANEL (Right) --- */}
      <div className="w-96 flex-shrink-0 bg-white shadow-xl z-20 border-l border-gray-200">
        <CartPanel
            onCancelItem={() => {
                if (!selectedCartItemId) return alert("Please select an item from the list first.");
                dispatch(removeFromCart(selectedCartItemId));
                setSelectedCartItemId(null);
            }}
            onInputFocus={handleInputFocus}
            onCheckout={handleCheckoutClick}

            // Passing down the modal handlers and active item state
            selectedCartItemId={selectedCartItemId}
            onOpenControlModal={openControlModal}
            onRefundClick={handleRefundClick}
            onReprintClick={handleReprint}
        />
      </div>

      {/* --- MODALS --- */}
      <QuickScanModal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} products={products} onAddToCart={validateAndAdd} />
      <RefundModal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} onRefundComplete={handleRefundComplete} />

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onMouseDown={(e) => { if(e.target === e.currentTarget) setActiveModal(null); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative" onMouseDown={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">Update {activeModal}</h3>
                    <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeModal === 'note' ? 'Note Content' : `Value (${currency})`}</label>
                        <input ref={activeInputRef} type={activeModal === 'note' ? 'text' : 'number'} autoFocus required value={modalValue} onChange={(e) => setModalValue(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" />
                    </div>
                    <div className="flex justify-center">
                        <VirtualKeyboard layout={activeModal === 'note' ? 'full' : 'numeric'} onKeyPress={(key) => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if(setter){ setter.call(input, input.value + key); input.dispatchEvent(new Event('input', { bubbles: true })); } } }} onBackspace={() => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if(setter){ setter.call(input, input.value.slice(0, -1)); input.dispatchEvent(new Event('input', { bubbles: true })); } } }} onEnter={() => saveControlModal({ preventDefault: () => {} } as any)} className="bg-gray-100 border-none shadow-none" />
                    </div>
                    <button type="submit" onClick={saveControlModal} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"><Save size={18} /> Save Changes</button>
                </div>
            </div>
        </div>
      )}

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

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} subtotal={cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)} itemsCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} cartItems={cartItems} customer={customer as any} onComplete={handleSaleComplete} />
      {lastOrder && <ReceiptTemplate order={lastOrder} />}

    </div>
  );
};

export default PosScreen;