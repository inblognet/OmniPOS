import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from '../../db/db';
import ProductCard from './ProductCard';
import CartPanel from './CartPanel';
import {
  addToCart, updateQuantity, removeFromCart, updatePrice,
  updateItemDiscount, updateItemNote, holdSale, resumeSale, clearCart, setCustomer
} from '../../store/cartSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  Search, X, Save, Package, Plus, Filter,
  PauseCircle, PlayCircle, RotateCcw, FileText, LogIn, LogOut,
  Minus, Trash2, CheckCircle, Tag, Edit3, StickyNote, Calculator,
  ChevronDown, CheckSquare, Square, QrCode, Star, User, Zap, BarChart4, Keyboard, Lock, Unlock
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import QuickScanModal from './QuickScanModal';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// ✅ Named Imports
import CheckoutModal from './CheckoutModal';
import RefundModal from './RefundModal';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';

// ✅ API Services
import { productService } from '../../services/productService';
import { customerService, Customer } from '../../services/customerService';

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

  // --- Checkout, Refund & Print State ---
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
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
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // --- Keyboard State ---
  const [showMainKeyboard, setShowMainKeyboard] = useState(false);
  const [isKeyboardLocked, setIsKeyboardLocked] = useState(false);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // --- Fetch Data (CLOUD SYNC) ---
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Customer Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Category State
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);

  // --- ✅ LIVE CALCULATIONS ---
  const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const grossAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + ((item.discount || 0) * item.quantity), 0);

  // Tax Calculation
  const taxRate = 0.00;
  const totalTax = (grossAmount - totalDiscount) * taxRate;

  const roundOff = 0.00;
  const netPayable = grossAmount - totalDiscount + totalTax - roundOff;

  const loadData = async () => {
    try {
      setLoading(true);
      const prodData = await productService.getAll();
      setProducts(prodData.filter(p => p.isActive !== false));
      const custData = await customerService.getAll();
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
  const recentProducts = products
    .filter(p => p.id && !hiddenRecentIds.includes(p.id))
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 10);

  const favoriteProducts = products.filter(p => p.isFavorite);

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

  // ✅ Toggle Favorite (Add/Remove)
  const toggleFavorite = async (e: React.MouseEvent, product: any) => {
      e.stopPropagation();
      if (!product.id) return;

      const newStatus = !product.isFavorite; // Toggle logic

      // Optimistic Update for UI speed
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: newStatus } : p));

      try {
          await productService.update(product.id, { ...product, isFavorite: newStatus });
          // Ideally reload data to sync fully, but optimistic update handles the UI
          // loadData();
      } catch (err) {
          console.error("Failed to toggle favorite", err);
          // Revert on fail
          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: !newStatus } : p));
      }
  };

  const handleRemoveFromRecent = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setHiddenRecentIds(prev => [...prev, id]);
  };

  // ✅ Stock Validation Logic
  const validateAndAdd = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;
    if (product.type === 'Stock' && !product.allowNegativeStock) {
        if (product.stock <= 0) return alert(`Cannot sell "${product.name}". Out of stock.`);
        if (currentQty + 1 > product.stock) return alert(`Cannot sell "${product.name}". Only ${product.stock} in stock.`);
    }
    dispatch(addToCart({ id: product.id!, name: product.displayName || product.name, price: product.price, stock: product.stock, barcode: product.barcode, category: product.category, isTaxIncluded: product.isTaxIncluded, quantity: 1, discount: 0, note: '' }));
  };

  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    dispatch(addToCart({ id: Date.now(), name: customItemName, price: parseFloat(customItemPrice), stock: 9999, barcode: 'CUSTOM', category: 'Custom', isTaxIncluded: customItemTax, quantity: 1, discount: 0, note: '' }));
    setCustomItemName(''); setCustomItemPrice('');
  };

  const handleAddUnitItem = () => {
      const price = parseFloat(unitBasePrice); const weight = parseFloat(unitWeight);
      if (!price || !weight) return;
      let finalPrice = 0; let nameSuffix = '';
      if (selectedUnit === 'g') { finalPrice = (price / 1000) * weight; nameSuffix = `${weight}g`; }
      else if (selectedUnit === 'kg') { finalPrice = price * weight; nameSuffix = `${weight}kg`; }
      else if (selectedUnit === 'ml') { finalPrice = (price / 1000) * weight; nameSuffix = `${weight}ml`; }
      else if (selectedUnit === 'l') { finalPrice = price * weight; nameSuffix = `${weight}L`; }
      else { finalPrice = price * weight; nameSuffix = `${weight}pcs`; }
      dispatch(addToCart({ id: Date.now(), name: `Custom Item (${nameSuffix})`, price: parseFloat(finalPrice.toFixed(2)), stock: 9999, barcode: 'UNIT-CALC', category: 'Custom', isTaxIncluded: true, quantity: 1, unit: selectedUnit, unitValue: weight, discount: 0, note: '' }));
      setShowUnitCalc(false); setUnitBasePrice(''); setUnitWeight('');
  };

  const handleControlRemove = () => {
      if (!selectedCartItemId) return alert("Please select an item from the list first.");
      dispatch(removeFromCart(selectedCartItemId)); setSelectedCartItemId(null);
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

  const handleHoldSale = () => { if (cartItems.length === 0) return alert("Cart is empty"); dispatch(holdSale()); };
  const handleOpenHeld = () => { if (heldSales.length === 0) return alert("No held sales found."); dispatch(resumeSale(heldSales[heldSales.length - 1].id)); };

  const handleRefundClick = () => { setIsRefundOpen(true); };

  const handleReprint = () => alert("Reprinting...");
  const handleCashIO = (type: 'in' | 'out') => alert(`Cash ${type} clicked`);

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
      try {
          await productService.update(editingProduct.id, { ...editingProduct, name: editingProduct.name, price: Number(editingProduct.price), stock: Number(editingProduct.stock) });
          setEditingProduct(null); loadData();
      } catch (err) { console.error(err); alert("Failed to update product via API"); }
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => { if (!activeModal && !editingProduct) { activeInputRef.current = e.target; setShowMainKeyboard(true); } };

  // --- Virtual Keyboard ---
  const handleVirtualKeyPress = (key: string) => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if (setter) { const start = input.selectionStart || 0; const end = input.selectionEnd || 0; const newVal = input.value.substring(0, start) + key + input.value.substring(end); setter.call(input, newVal); input.dispatchEvent(new Event('input', { bubbles: true })); } } };
  const handleVirtualBackspace = () => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if (setter) { const newVal = input.value.slice(0, -1); setter.call(input, newVal); input.dispatchEvent(new Event('input', { bubbles: true })); } } };

  const handleVirtualEnter = () => {
      if (activeInputRef.current && searchQuery.trim() !== '') {
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
                        placeholder="Search Customer..."
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm h-full"
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
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

        {/* LIVE ORDER SUMMARY (Moved Here - Center/Below List) */}
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
          {loading ? <div className="h-full flex items-center justify-center text-gray-400">Loading products from cloud...</div> : (
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

      {/* --- COLUMN 2: ACTIONS BOX (Vertical) --- */}
      <div className="w-80 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-6">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Zap className="text-yellow-500 fill-current" size={20}/> Actions</h2>

              {/* 1. Quick Actions */}
              <div className="space-y-2">
                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleHoldSale} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><PauseCircle size={20} className="text-orange-500 mb-1"/><span className="text-xs font-bold text-gray-700">Hold</span></button>
                    <button onClick={handleOpenHeld} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><PlayCircle size={20} className="text-blue-500 mb-1"/><span className="text-xs font-bold text-gray-700">Open</span></button>
                    <button onClick={handleRefundClick} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-red-300 hover:shadow-sm transition-all group"><RotateCcw size={20} className="text-red-500 mb-1 group-hover:scale-110 transition-transform"/><span className="text-xs font-bold text-gray-700">Refund</span></button>
                    <button onClick={handleReprint} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><FileText size={20} className="text-gray-500 mb-1"/><span className="text-xs font-bold text-gray-700">Reprint</span></button>
                    <button onClick={() => handleCashIO('in')} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><LogIn size={20} className="text-green-500 mb-1"/><span className="text-xs font-bold text-gray-700">Cash In</span></button>
                    <button onClick={() => handleCashIO('out')} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><LogOut size={20} className="text-purple-500 mb-1"/><span className="text-xs font-bold text-gray-700">Cash Out</span></button>
                 </div>
              </div>

              {/* 2. Recent / Favorites */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm h-64 flex flex-col">
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setSidebarTab('recent')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${sidebarTab === 'recent' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50'}`}>Recent</button>
                    <button onClick={() => setSidebarTab('favorites')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${sidebarTab === 'favorites' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50'}`}>Favorites</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                     {sidebarTab === 'recent' ? (
                       recentProducts.map(p => (
                         <div key={p.id} onClick={() => validateAndAdd(p)} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer group">
                             <div className="flex items-center gap-2 overflow-hidden">
                                 {/* ✅ ADDED: Star Icon in Recent to Toggle Favorite */}
                                 <button onClick={(e) => toggleFavorite(e, p)} className="text-gray-300 hover:text-blue-500 transition-colors">
                                     <Star size={14} fill={p.isFavorite ? "#3b82f6" : "none"} className={p.isFavorite ? "text-blue-500" : ""} />
                                 </button>
                                 <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                 {/* ✅ ADDED: X Icon to Remove from Recent */}
                                 <button onClick={(e) => handleRemoveFromRecent(e, p.id)} className="text-gray-300 hover:text-red-500 p-1"><X size={14}/></button>
                                 <Plus size={14} className="text-gray-300 group-hover:text-blue-500"/>
                             </div>
                         </div>
                       ))
                     ) : (
                       favoriteProducts.map(p => (
                         <div key={p.id} onClick={() => validateAndAdd(p)} className="flex justify-between items-center p-2 hover:bg-blue-50 rounded-lg cursor-pointer group">
                             <div className="flex items-center gap-2 overflow-hidden">
                                 <Star size={12} className="text-blue-500 fill-current"/>
                                 <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                  {/* ✅ ADDED: Trash Icon to Remove from Favorites */}
                                  <button onClick={(e) => toggleFavorite(e, p)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                  <Plus size={14} className="text-gray-300 group-hover:text-blue-500"/>
                             </div>
                         </div>
                       ))
                     )}
                  </div>
              </div>

              {/* 3. Item Controls */}
              <div className={`space-y-2 transition-opacity duration-200 ${!selectedCartItemId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                 <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">Item Controls {selectedCartItemId && <span className="text-blue-600">Active</span>}</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => selectedCartItemId && dispatch(updateQuantity({ id: selectedCartItemId, quantity: cartItems.find(i=>i.id===selectedCartItemId)!.quantity - 1 }))} className="bg-white border border-gray-200 rounded-lg py-3 font-bold text-gray-700 hover:border-red-300 hover:text-red-600 shadow-sm"><Minus size={16} className="mx-auto"/></button>
                    <button onClick={() => {
                       if(!selectedCartItemId) return;
                       const item = cartItems.find(i => i.id === selectedCartItemId);
                       if(item) {
                           const original = products.find(p => p.id === item.id);
                           if(original && original.type === 'Stock' && !original.allowNegativeStock && item.quantity >= original.stock) {
                               alert(`Max stock reached (${original.stock})`); return;
                           }
                           dispatch(updateQuantity({ id: selectedCartItemId, quantity: item.quantity + 1 }));
                       }
                    }} className="bg-white border border-gray-200 rounded-lg py-3 font-bold text-gray-700 hover:border-green-300 hover:text-green-600 shadow-sm"><Plus size={16} className="mx-auto"/></button>
                    <button onClick={() => openControlModal('price')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50">Price</button>
                    <button onClick={() => openControlModal('discount')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50">Disc %</button>
                    <button onClick={() => openControlModal('note')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50 col-span-2">Add Note</button>
                    <button onClick={handleControlRemove} className="bg-red-50 border border-red-200 text-red-600 rounded-lg py-2 font-bold text-xs hover:bg-red-100 col-span-2 flex items-center justify-center gap-2"><Trash2 size={14}/> Remove Item</button>
                 </div>
              </div>

              {/* 4. Custom Item */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Item</h4>
                  <input type="text" placeholder="Item Name" value={customItemName} onChange={e => setCustomItemName(e.target.value)} onFocus={handleInputFocus} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"/>
                  <div className="flex gap-2">
                      <input type="number" placeholder="Price" value={customItemPrice} onChange={e => setCustomItemPrice(e.target.value)} onFocus={handleInputFocus} className="w-2/3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-right focus:ring-2 focus:ring-blue-500 outline-none"/>
                      <button onClick={() => setCustomItemTax(!customItemTax)} className={`w-1/3 rounded-lg text-xs font-bold border ${customItemTax ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{customItemTax ? 'Tax On' : 'No Tax'}</button>
                  </div>
                  <button onClick={handleAddCustomItem} className="w-full bg-gray-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg">Add to Cart</button>
              </div>

          </div>
      </div>

      {/* --- COLUMN 3: CART PANEL (Right) --- */}
      <div className="w-96 flex-shrink-0 bg-white shadow-xl z-20 border-l border-gray-200">
        <CartPanel
            onCancelItem={handleControlRemove}
            onInputFocus={handleInputFocus}
            onCheckout={handleCheckoutClick}
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