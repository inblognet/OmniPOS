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
  Search, X, Save, Package, QrCode, User, Keyboard, Lock, Unlock,
  MonitorPlay, Monitor, ShoppingCart, Filter, CheckSquare, Square
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import QuickScanModal from './QuickScanModal';
import VirtualKeyboard from '../../components/VirtualKeyboard';
import CheckoutModal from './CheckoutModal';
import RefundModal from './RefundModal';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';
import { productService } from '../../services/productService';
import { customerService, Customer } from '../../services/customerService';
import { useCFDSync } from '../../hooks/useCFDSync.ts';

const PosScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const currency = useCurrency();
  const { items: cartItems, customer } = useAppSelector((state) => state.cart);
  const { broadcast } = useCFDSync();

  const [isCFDEnabled, setIsCFDEnabled] = useState(false);
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

  const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const grossAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalDiscount = cartItems.reduce((acc, item) => acc + ((item.discount || 0) * item.quantity), 0);
  const taxRate = 0.00;
  const totalTax = (grossAmount - totalDiscount) * taxRate;
  const roundOff = 0.00;
  const netPayable = grossAmount - totalDiscount + totalTax - roundOff;

  // 🛑 NUCLEAR SCROLLBAR LOCK
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    };
  }, []);

  const handleToggleCFD = () => {
    const nextState = !isCFDEnabled;
    setIsCFDEnabled(nextState);
    if (nextState) window.open(window.location.origin + window.location.pathname + '#/cfd-display', 'CustomerDisplayWindow', 'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no');
  };

  useEffect(() => {
    if (!isCFDEnabled) return broadcast({ type: 'IDLE' });
    if (lastOrder) return broadcast({ type: 'CHECKOUT_SUCCESS' });
    if (cartItems.length === 0) return broadcast({ type: 'IDLE' });
    broadcast({
      type: isCheckoutOpen ? 'CHECKOUT_INTERACTION' : 'ACTIVE_CART',
      cart: cartItems,
      totals: { subtotal: grossAmount, tax: totalTax, discount: totalDiscount, total: netPayable, itemCount: totalQty },
      customerData: customer ? { name: customer.name, phone: (customer as any).phone, email: (customer as any).email } : undefined
    });
  }, [cartItems, grossAmount, totalTax, totalDiscount, netPayable, totalQty, isCheckoutOpen, lastOrder, customer, isCFDEnabled, broadcast]);

  const loadData = async () => {
    try {
      setLoading(true);
      let prodData: any[] = [];
      let custData: Customer[] = [];
      if (navigator.onLine) {
        prodData = await productService.getAll();
        custData = await customerService.getAll();
      } else if (window.electronAPI) {
        const cachedProducts = await window.electronAPI.getCache('products');
        const cachedCustomers = await window.electronAPI.getCache('customers');
        if (cachedProducts.success && cachedProducts.data) prodData = cachedProducts.data;
        if (cachedCustomers.success && cachedCustomers.data) custData = cachedCustomers.data;
      }
      setProducts(prodData.filter(p => p.isActive !== false));
      setCustomers(custData);
      setCategories(Array.from(new Set(prodData.map(p => p.category).filter(Boolean))).map((cat, idx) => ({ id: idx, name: cat as string })) as any);
    } catch (error) { console.error("Failed to load POS data", error); } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

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
      const handleGlobalKeyDown = (e: KeyboardEvent) => { if (e.key === 'Home') { e.preventDefault(); setIsQuickScanOpen(prev => !prev); } };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
      if (type === 'discount') setModalValue((item.discount || 0).toString());
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
      try { await productService.update(editingProduct.id, { ...editingProduct, name: editingProduct.name, price: Number(editingProduct.price), stock: Number(editingProduct.stock) }); setEditingProduct(null); loadData(); } catch (err) { alert("Failed to update product via API"); }
  };
  const handleCheckoutClick = () => { if (cartItems.length > 0) setIsCheckoutOpen(true); };
  const handleSaleComplete = (orderData: any) => { setLastOrder(orderData); setTimeout(() => { window.print(); setLastOrder(null); dispatch(clearCart()); loadData(); }, 500); };
  const handleRefundComplete = (refundOrder: any) => { setLastOrder({ ...refundOrder, total_amount: refundOrder.totalAmount || refundOrder.total_amount }); setTimeout(() => { window.print(); setLastOrder(null); loadData(); }, 500); };
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => { if (!activeModal && !editingProduct) { activeInputRef.current = e.target; setShowMainKeyboard(true); } };
  const handleVirtualKeyPress = (key: string) => { if (activeInputRef.current) { const input = activeInputRef.current; if (input.name === "customerSearchInput") { setCustomerSearch(prev => prev + key); } else { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if (setter) { const start = input.selectionStart || 0; const end = input.selectionEnd || 0; setter.call(input, input.value.substring(0, start) + key + input.value.substring(end)); input.dispatchEvent(new Event('input', { bubbles: true })); } } } };
  const handleVirtualBackspace = () => { if (activeInputRef.current) { const input = activeInputRef.current; if (input.name === "customerSearchInput") { setCustomerSearch(prev => prev.slice(0, -1)); } else { const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if (setter) { setter.call(input, input.value.slice(0, -1)); input.dispatchEvent(new Event('input', { bubbles: true })); } } } };
  const handleVirtualEnter = () => { if (activeInputRef.current && activeInputRef.current.name !== "customerSearchInput" && searchQuery.trim() !== '') { const query = searchQuery.trim(); const exactMatch = products.find(p => p.barcode === query || p.sku === query); if (exactMatch) { validateAndAdd(exactMatch); setSearchQuery(''); } else if (filteredProducts.length === 1) { validateAndAdd(filteredProducts[0]); setSearchQuery(''); } } if (!isKeyboardLocked) { setShowMainKeyboard(false); } };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { const target = e.target as HTMLElement; if (!isKeyboardLocked && target.tagName !== 'INPUT' && !target.closest('.virtual-keyboard-container')) { setShowMainKeyboard(false); } };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isKeyboardLocked]);

  return (
    <div className="flex w-full h-full overflow-hidden bg-transparent relative">

      <style>{`
        /* Global Scrollbar KILLER */
        body, html, #root { overflow: hidden !important; }

        /* Internal Scrollbar Hider */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- LEFT PANEL --- */}
      <div className="flex-1 flex flex-col h-full min-w-0 mr-4 relative bg-transparent rounded-tr-2xl">
        <div className="px-6 py-4 bg-transparent shadow-sm z-10 flex gap-3 items-center border-b border-gray-100 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" name="productSearchInput" onFocus={handleInputFocus} className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm transition-all shadow-inner" placeholder="Scan Barcode, SKU, or Search Product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} />
            </div>
            <button onClick={() => setIsQuickScanOpen(true)} className="bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"><QrCode size={18} /> SCAN</button>
            <div className="relative">
                <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className={`px-5 py-3 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 ${selectedCategories.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    <Filter size={18} /> Filter
                </button>
                {showFilterDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-gray-100"><span className="text-xs font-bold text-gray-500 uppercase">Select Categories</span>{selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} className="text-[10px] text-red-500 hover:underline">Clear All</button>}</div>
                        {categories.length === 0 ? <div className="p-3 text-center text-xs text-gray-400">No categories found.</div> : categories.map(cat => (
                                <button key={cat.id} onClick={() => toggleCategory(cat.name)} className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg text-left transition-colors">
                                    {selectedCategories.includes(cat.name) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-300"/>}
                                    <span className={`text-sm ${selectedCategories.includes(cat.name) ? 'font-bold text-blue-700' : 'text-gray-700'}`}>{cat.name}</span>
                                </button>
                        ))}
                    </div>
                )}
                {showFilterDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)}></div>}
            </div>
            <button onClick={handleToggleCFD} className={`py-3 px-5 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-95 ${isCFDEnabled ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700' : 'bg-transparent border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {isCFDEnabled ? <MonitorPlay size={18} className="animate-pulse" /> : <Monitor size={18} />} CFD {isCFDEnabled ? 'ON' : 'OFF'}
            </button>
        </div>
        {selectedCategories.length > 0 && (
          <div className="bg-transparent px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Active Filters:</span>
              {selectedCategories.map(cat => (<button key={cat} onClick={() => toggleCategory(cat)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">{cat} <X size={14}/></button>))}
              <button onClick={() => setSelectedCategories([])} className="text-xs text-gray-500 hover:text-gray-800 font-medium underline px-2">Clear All</button>
          </div>
        )}

        {/* 📦 Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
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

        {showMainKeyboard && !activeModal && (
          <div className="virtual-keyboard-container absolute bottom-4 left-4 right-4 z-[100] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-10 fade-in duration-200">
             <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase"><Keyboard size={14}/> Virtual Keyboard</div><div className="flex items-center gap-2"><button onClick={() => setIsKeyboardLocked(!isKeyboardLocked)} className={`p-1.5 rounded-full transition-colors ${isKeyboardLocked ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>{isKeyboardLocked ? <Lock size={16} /> : <Unlock size={16} />}</button><button onClick={() => setShowMainKeyboard(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"><X size={16}/></button></div></div>
             <VirtualKeyboard onKeyPress={handleVirtualKeyPress} onBackspace={handleVirtualBackspace} onEnter={handleVirtualEnter} layout="full" />
          </div>
        )}
      </div>

      {/* --- RIGHT PANEL (Border Removed to fix Dark Mode line) --- */}
      <div className="w-[450px] flex-shrink-0 bg-transparent z-20 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-transparent border-b border-gray-200 shrink-0 relative">
            <div className="relative w-full">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                {customer ? (
                    <div className="flex items-center justify-between w-full p-3 border border-blue-200 bg-blue-50 rounded-xl text-sm text-blue-800 font-bold shadow-inner"><span className="truncate">{customer.name}</span><button onClick={() => dispatch(setCustomer(undefined as any))} className="p-1.5 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-full transition-colors"><X size={14}/></button></div>
                ) : (
                    <input type="text" name="customerSearchInput" placeholder="Attach Customer to Sale..." className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-transparent outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm shadow-inner transition-all" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} onFocus={(e) => { handleInputFocus(e); setShowCustomerDropdown(true); }} />
                )}
                {showCustomerDropdown && customerSearch && !customer && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 mt-2 max-h-64 overflow-y-auto">
                        {filteredCustomers.length === 0 ? <div className="p-4 text-sm text-gray-400 text-center font-medium">No customers found</div> : filteredCustomers.map(c => (<div key={c.id} onClick={() => { dispatch(setCustomer(c as any)); setCustomerSearch(''); setShowCustomerDropdown(false); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"><p className="font-bold text-gray-800 text-sm">{c.name}</p><p className="text-xs text-gray-500 mt-0.5">{c.phone}</p></div>))}
                    </div>
                )}
                {showCustomerDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)}></div>}
            </div>
        </div>

        <div className="bg-transparent border-b border-gray-200 px-4 py-2 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2"><ShoppingCart size={14}/> Current Order</h3><span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{cartItems.length} Items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-transparent no-scrollbar min-h-[50px]">
            {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50"><ShoppingCart size={48} className="mb-4" /><p className="font-bold text-lg">Cart is empty</p><p className="text-sm">Scan or tap products to add</p></div>
            ) : (
                cartItems.map((item) => (
                    <div key={item.id} onClick={() => setSelectedCartItemId(item.id)} className={`flex justify-between items-center p-3 border-b cursor-pointer transition-all ${selectedCartItemId === item.id ? 'bg-blue-50 ring-2 ring-blue-500 border-blue-500 rounded-lg shadow-sm' : 'hover:bg-gray-50 border-gray-100'}`}>
                        <div className="flex-1 pr-2"><span className="font-bold text-sm text-gray-800 line-clamp-2">{item.name}</span> <span className="text-xs font-medium text-gray-500">{currency}{item.price.toFixed(2)}</span>{(item.discount || 0) > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-2 font-bold">Disc: {currency}{(item.discount || 0).toFixed(2)}</span>}</div>
                        <div className="flex flex-col items-end gap-1"><span className="text-sm font-black text-blue-600">{currency}{((item.price - (item.discount||0)) * item.quantity).toFixed(2)}</span><span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">Qty: {item.quantity}</span></div>
                    </div>
                ))
            )}
        </div>

        <div className="bg-transparent border-t border-b border-gray-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="space-y-2 mb-3 border-b border-gray-200 pb-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Subtotal</span><span className="font-bold">{currency}{grossAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Discount</span><span className="font-bold text-red-500">-{currency}{totalDiscount.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Tax</span><span className="font-bold">{currency}{totalTax.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between items-end"><span className="text-lg font-black text-gray-800">Total</span><span className="text-3xl font-black text-blue-600 tracking-tight">{currency}{netPayable.toFixed(2)}</span></div>
        </div>

        <div className="shrink-0 pb-2">
            <CartPanel
                onCancelItem={() => { if (!selectedCartItemId) return alert("Please select an item from the list first."); dispatch(removeFromCart(selectedCartItemId)); setSelectedCartItemId(null); }}
                onInputFocus={handleInputFocus}
                onCheckout={handleCheckoutClick}
                selectedCartItemId={selectedCartItemId}
                onOpenControlModal={openControlModal}
                onRefundClick={handleRefundClick}
                onReprintClick={handleReprint}
                onAddItem={validateAndAdd}
            />
        </div>
      </div>

      <QuickScanModal isOpen={isQuickScanOpen} onClose={() => setIsQuickScanOpen(false)} products={products} onAddToCart={validateAndAdd} />
      <RefundModal isOpen={isRefundOpen} onClose={() => setIsRefundOpen(false)} onRefundComplete={handleRefundComplete} />
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onMouseDown={(e) => { if(e.target === e.currentTarget) setActiveModal(null); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative" onMouseDown={(e) => e.stopPropagation()}><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2 capitalize">Update {activeModal}</h3><button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-5 space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeModal === 'note' ? 'Note Content' : `Value (${currency})`}</label><input ref={activeInputRef} type={activeModal === 'note' ? 'text' : 'number'} autoFocus required value={modalValue} onChange={(e) => setModalValue(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" /></div><div className="flex justify-center"><VirtualKeyboard layout={activeModal === 'note' ? 'full' : 'numeric'} onKeyPress={(key) => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if(setter){ setter.call(input, input.value + key); input.dispatchEvent(new Event('input', { bubbles: true })); } } }} onBackspace={() => { if (activeInputRef.current) { const input = activeInputRef.current; const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set; if(setter){ setter.call(input, input.value.slice(0, -1)); input.dispatchEvent(new Event('input', { bubbles: true })); } } }} onEnter={() => saveControlModal({ preventDefault: () => {} } as any)} className="bg-gray-100 border-none shadow-none" /></div><button type="submit" onClick={saveControlModal} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"><Save size={18} /> Save Changes</button></div></div>
        </div>
      )}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Quick Edit</h3><button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><form onSubmit={handleSaveEdit} className="p-5 space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label><input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"/></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label><input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock</label><input type="number" required value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg"/></div></div><button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 mt-2"><Save size={18} /> Save Changes</button></form></div></div>
      )}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} subtotal={cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)} itemsCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} cartItems={cartItems} customer={customer as any} onComplete={handleSaleComplete} />
      {lastOrder && <ReceiptTemplate order={lastOrder} />}
    </div>
  );
};
export default PosScreen;