// cspell:ignore dexie Dexie cust Cust
import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { clearCart, resumeSale, holdSale, updateQuantity, setCustomer, removeFromCart, updateItemDiscount } from '../../store/cartSlice';
import {
  Printer, Search, X, Trash2, Save, RotateCcw, List, Scale, Plus,
  Calendar, Calculator, Loader2, Package, PauseCircle, PlayCircle,
  FileText, Star, UserPlus, Edit3, ShoppingCart
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { customerService, Customer } from '../../services/customerService';
import { productService } from '../../services/productService';
import { useCurrency } from '../../hooks/useCurrency';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// ✅ Custom Keypad for Add Custom Item
const CustomKeypad = ({ layout, onKeyPress, onBackspace, onEnter }: { layout: 'numeric' | 'full', onKeyPress: (k: string) => void, onBackspace: () => void, onEnter: () => void }) => {
    if (layout === 'numeric') {
        const rows = [['1', '2', '3'],['4', '5', '6'],['7', '8', '9'],['.', '0', '-']];
        return (
            <div className="flex flex-col gap-2 h-full justify-center p-2">
                {rows.map((row, i) => (
                    <div key={i} className="flex gap-2 justify-center">
                        {row.map(k => (
                            <button key={k} type="button" onClick={() => onKeyPress(k)} className="w-24 py-3 bg-white border border-gray-100 hover:border-blue-300 hover:bg-blue-50 text-blue-600 rounded-xl font-bold text-xl transition-all active:scale-95 shadow-sm">
                                {k}
                            </button>
                        ))}
                    </div>
                ))}
                <div className="flex gap-2 justify-center mt-1">
                    <button type="button" onClick={onBackspace} className="w-[148px] py-3 bg-red-50 hover:bg-red-100 text-blue-600 border border-red-100 rounded-xl font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center">
                        <X size={20} className="mr-1" />
                    </button>
                    <button type="button" onClick={onEnter} className="w-[148px] py-3 bg-gray-900 hover:bg-black text-blue-500 rounded-xl font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center">
                        ✓
                    </button>
                </div>
            </div>
        );
    }
    const rows = [['1','2','3','4','5','6','7','8','9','0'],['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M']];
    return (
        <div className="flex flex-col gap-2 h-full justify-center">
            {rows.map((row, i) => (
                <div key={i} className={`flex justify-center gap-1.5 ${i===2 ? 'px-6' : ''} ${i===3 ? 'px-12' : ''}`}>
                    {row.map(k => (
                        <button key={k} type="button" onClick={() => onKeyPress(k)} className="flex-1 py-3 bg-white border border-gray-100 hover:border-blue-300 hover:bg-blue-50 text-blue-600 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm">
                            {k}
                        </button>
                    ))}
                </div>
            ))}
            <div className="flex justify-center gap-2 mt-1 px-1">
                <button type="button" onClick={onBackspace} className="w-20 py-3 bg-red-50 hover:bg-red-100 text-blue-600 border border-red-100 rounded-lg font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center">
                    <X size={16} />
                </button>
                <button type="button" onClick={() => onKeyPress(' ')} className="flex-1 py-3 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-500 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2">
                    ␣ SPACE
                </button>
                <button type="button" onClick={onEnter} className="w-20 py-3 bg-gray-900 hover:bg-black text-blue-500 rounded-lg font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center">
                    ✓
                </button>
            </div>
        </div>
    );
};

interface CartPanelProps {
    onCancelItem: () => void;
    onInputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onCheckout?: () => void;
    selectedCartItemId?: number | null;
    onOpenControlModal?: (type: 'price' | 'discount' | 'note') => void;
    onRefundClick?: () => void;
    onReprintClick?: () => void;
    onAddItem: (product: any) => void;
}

const CartPanel: React.FC<CartPanelProps> = ({
    onCancelItem, onInputFocus, onCheckout, selectedCartItemId,
    onOpenControlModal, onRefundClick, onReprintClick, onAddItem
}) => {
  const dispatch = useAppDispatch();
  const { items, heldSales, customer } = useAppSelector((state) => state.cart);
  const currency = useCurrency();

  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showRecords, setShowRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');

  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemTax, setCustomItemTax] = useState(true);
  const [activeCustomField, setActiveCustomField] = useState<'name' | 'price'>('name');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({ name: '', phone: '', email: '', type: 'Walk-in' as Customer['type'], loyaltyJoined: false });
  const [activeCustField, setActiveCustField] = useState<'name' | 'phone' | 'email'>('name');

  const [showInternalUnitCalc, setShowInternalUnitCalc] = useState(false);
  const [ucItemName, setUcItemName] = useState('');
  const [ucBasePrice, setUcBasePrice] = useState<string>('');
  const [ucUnitSize, setUcUnitSize] = useState<string>('1');
  const [ucQuantity, setUcQuantity] = useState<string>('');
  const [ucUnitType, setUcUnitType] = useState<string>('g');
  const [activeUcField, setActiveUcField] = useState<'name' | 'price' | 'size' | 'qty'>('name');

  const [sidebarTab, setSidebarTab] = useState<'recent' | 'favorites'>('recent');
  const [hiddenRecentIds, setHiddenRecentIds] = useState<number[]>([]);
  const [cloudProducts, setCloudProducts] = useState<any[]>([]);
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // ✅ NEW: Full Cart Management Modal State
  const [showFullCartModal, setShowFullCartModal] = useState(false);

  const customItemRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLDivElement>(null);
  const unitCalcRef = useRef<HTMLDivElement>(null);
  const cartModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCustomItemModal) customItemRef.current?.focus();
    if (showCustomerModal) customerRef.current?.focus();
    if (showItemSearch) searchRef.current?.focus();
    if (showRecords) recordsRef.current?.focus();
    if (showInternalUnitCalc) unitCalcRef.current?.focus();
    if (showFullCartModal) cartModalRef.current?.focus();
  }, [showCustomItemModal, showCustomerModal, showItemSearch, showRecords, showInternalUnitCalc, showFullCartModal]);

  const handleModalKeyboardNav = (e: React.KeyboardEvent<HTMLDivElement>, modalRef: React.RefObject<HTMLDivElement>, completeAction?: () => void) => {
      if (!modalRef.current) return;
      const active = document.activeElement as HTMLElement;
      const isTextInput = active.tagName === 'INPUT' && active.getAttribute('type') !== 'checkbox' && active.getAttribute('type') !== 'radio';

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (!isTextInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
          e.preventDefault();
          const focusable = Array.from(modalRef.current.querySelectorAll('input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')) as HTMLElement[];
          if(focusable.length === 0) return;
          const index = focusable.indexOf(active);
          let nextIndex = index >= 0 ? index : 0;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIndex = (index + 1) % focusable.length;
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIndex = (index - 1 + focusable.length) % focusable.length;
          focusable[nextIndex]?.focus();
      } else if (e.key === 'Tab') {
          const searchInput = modalRef.current.querySelector('input[placeholder*="Search"], input[placeholder*="search"]') as HTMLElement;
          if (searchInput && active !== searchInput) {
              e.preventDefault();
              searchInput.focus();
          }
      } else if (e.key === 'Enter') {
          if (completeAction && !isTextInput) {
              e.preventDefault();
              completeAction();
          }
      } else if (e.key === ' ' && (active.tagName === 'BUTTON' || (active.tagName === 'INPUT' && active.getAttribute('type') === 'checkbox'))) {
          e.preventDefault();
          active.click();
      }
  };

  useEffect(() => {
    const fetchData = async () => { try { const prodData = await productService.getAll(); setCloudProducts(prodData.filter((p: any) => p.isActive !== false)); } catch (err) { console.error(err); } };
    fetchData();
  }, []);

  useEffect(() => {
      if (showRecords) { const fetchOrders = async () => { setRecordsLoading(true); try { setCloudOrders(await orderService.getAllOrders()); } catch (err) { console.error(err); } finally { setRecordsLoading(false); } }; fetchOrders(); }
  }, [showRecords]);

  useEffect(() => {
      const handleGlobalShortcuts = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              setShowItemSearch(false); setShowCustomItemModal(false); setShowInternalUnitCalc(false); setShowCustomerModal(false); setShowRecords(false); setShowFullCartModal(false);
              return;
          }

          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

          switch (e.key) {
              case 'F1': e.preventDefault(); if (customer) handleOpenEditCustomer(); else alert("Please select a customer first to edit."); break;
              case 'F2': e.preventDefault(); setShowItemSearch(true); break;
              case 'F3': e.preventDefault(); setShowCustomItemModal(true); break;
              case 'F6': e.preventDefault(); setShowInternalUnitCalc(true); break;
              case 'F7': e.preventDefault(); handleOpenAddCustomer(); break;
              case 'F10': e.preventDefault(); setShowRecords(true); break;
          }
      };

      window.addEventListener('keydown', handleGlobalShortcuts);
      return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [customer]);

  const filteredItems = cloudProducts.filter(p => p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || (p.barcode && p.barcode.includes(itemSearchQuery)) || (p.sku && p.sku.includes(itemSearchQuery))).slice(0, 15);
  const filteredHistory = cloudOrders.filter(order => order.id.toString().includes(recordSearch));

  const recentProducts = cloudProducts.filter(p => p.id && !hiddenRecentIds.includes(p.id)).sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 10);
  const favoriteProducts = cloudProducts.filter(p => p.isFavorite);

  const handleToggleFavorite = async (e: React.MouseEvent, product: any) => {
      e.stopPropagation(); if (!product.id) return;
      const newStatus = !product.isFavorite;
      setCloudProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: newStatus } : p));
      try { await productService.update(product.id, { ...product, isFavorite: newStatus }); } catch (err) { setCloudProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: !newStatus } : p)); }
  };

  const handleOpenAddCustomer = () => { setEditingCustomerId(null); setCustomerFormData({ name: '', phone: '', email: '', type: 'Walk-in', loyaltyJoined: false }); setActiveCustField('name'); setShowCustomerModal(true); };
  const handleOpenEditCustomer = () => { if (!customer) { alert("Please select a customer first to edit."); return; } setEditingCustomerId(customer.id!); setCustomerFormData({ name: customer.name, phone: (customer as any).phone || '', email: (customer as any).email || '', type: (customer as any).type || 'Walk-in', loyaltyJoined: (customer as any).loyaltyJoined || false }); setActiveCustField('name'); setShowCustomerModal(true); };

  const handleCustKeyPress = (key: string) => setCustomerFormData(prev => ({ ...prev, [activeCustField]: prev[activeCustField] + key }));
  const handleCustBackspace = () => setCustomerFormData(prev => ({ ...prev, [activeCustField]: prev[activeCustField].slice(0, -1) }));

  const handleSaveCustomer = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!customerFormData.name.trim()) return;
      setIsSavingCustomer(true);
      try {
          let payload: Partial<Customer> = { name: customerFormData.name.trim(), phone: customerFormData.phone, email: customerFormData.email, type: customerFormData.type, loyaltyJoined: customerFormData.loyaltyJoined };
          if (editingCustomerId) { const updatedCust = await customerService.update(editingCustomerId, payload); dispatch(setCustomer(updatedCust as any)); }
          else { const newCust = await customerService.create({ ...(payload as Customer), loyaltyPoints: 0, totalSpend: 0, totalPurchases: 0 }); dispatch(setCustomer(newCust as any)); }
          setShowCustomerModal(false);
      } catch (error) { alert("Failed to sync customer."); }
      finally { setIsSavingCustomer(false); }
  };

  const getNormalizedValue = (val: number, unit: string): number => (unit === 'kg' || unit === 'L') ? val * 1000 : val;
  const calculateUnitTotal = () => { const basePrice = parseFloat(ucBasePrice); const singleUnitSize = parseFloat(ucUnitSize); const quantity = parseFloat(ucQuantity); if (!basePrice || !singleUnitSize || !quantity || basePrice <= 0 || singleUnitSize <= 0 || quantity <= 0) return 0; const normSingleUnit = getNormalizedValue(singleUnitSize, ucUnitType); const normQuantity = getNormalizedValue(quantity, ucUnitType); const pricePerBaseUnit = basePrice / normSingleUnit; return parseFloat((pricePerBaseUnit * normQuantity).toFixed(4)); };
  const unitCalcTotal = calculateUnitTotal();

  const handleUcKeyPress = (key: string) => { const updateNum = (prev: string) => { if (key === '.' && prev.includes('.')) return prev; return prev + key; }; if (activeUcField === 'name') setUcItemName(prev => prev + key); if (activeUcField === 'price') setUcBasePrice(prev => updateNum(prev)); if (activeUcField === 'size') setUcUnitSize(prev => updateNum(prev)); if (activeUcField === 'qty') setUcQuantity(prev => updateNum(prev)); };
  const handleUcBackspace = () => { if (activeUcField === 'name') setUcItemName(prev => prev.slice(0, -1)); if (activeUcField === 'price') setUcBasePrice(prev => prev.slice(0, -1)); if (activeUcField === 'size') setUcUnitSize(prev => prev.slice(0, -1)); if (activeUcField === 'qty') setUcQuantity(prev => prev.slice(0, -1)); };
  const handleSearchItemKeyPress = (key: string) => setItemSearchQuery(prev => prev + key);
  const handleSearchItemBackspace = () => setItemSearchQuery(prev => prev.slice(0, -1));
  const handleRecordKeyPress = (key: string) => setRecordSearch(prev => prev + key);
  const handleRecordBackspace = () => setRecordSearch(prev => prev.slice(0, -1));

  const handleItemSearchKeyDown = (e?: React.KeyboardEvent<HTMLInputElement>) => {
      if ((!e || e.key === 'Enter') && filteredItems.length > 0) {
          onAddItem(filteredItems[0]);
          setItemSearchQuery('');
      }
  };

  const handleCustomItemKeyPress = (key: string) => {
    if (activeCustomField === 'name') setCustomItemName(prev => prev + key);
    else { if (key === '.' && customItemPrice.includes('.')) return; setCustomItemPrice(prev => prev + key); }
  };
  const handleCustomItemBackspace = () => {
    if (activeCustomField === 'name') setCustomItemName(prev => prev.slice(0, -1));
    else setCustomItemPrice(prev => prev.slice(0, -1));
  };
  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    onAddItem({ id: Date.now(), name: customItemName, price: parseFloat(customItemPrice), stock: 9999, barcode: 'CUSTOM', category: 'Custom', isTaxIncluded: customItemTax, type: 'Non-Stock' });
    setCustomItemName(''); setCustomItemPrice(''); setShowCustomItemModal(false);
  };

  const handleAddUnitItem = () => { if (unitCalcTotal <= 0) return alert("Invalid input."); const finalName = ucItemName.trim() !== '' ? `${ucItemName} (${parseFloat(ucQuantity)} ${ucUnitType})` : `Custom (${parseFloat(ucQuantity)} ${ucUnitType})`; onAddItem({ id: Date.now(), name: finalName, price: parseFloat(unitCalcTotal.toFixed(2)), stock: 9999, barcode: 'UNIT-CALC', category: 'Custom', isTaxIncluded: true, type: 'Non-Stock' }); setUcItemName(''); setUcBasePrice(''); setUcUnitSize('1'); setUcQuantity(''); setShowInternalUnitCalc(false); };
  const handleResumeHeld = () => { if (heldSales.length > 0) dispatch(resumeSale(heldSales[heldSales.length - 1].id)); };

  // ✅ INCREASED GRID BUTTON SIZE AND HEIGHT
  const GridBtn = ({ icon: Icon, label, colorClass, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center py-3 bg-[var(--background-color,#ffffff)] dark:bg-[var(--card-color,#1e293b)] rounded-xl border border-[var(--sidebar-color,#e5e7eb)] dark:border-gray-700 hover:border-[var(--primary-color,#3b82f6)] dark:hover:border-blue-500 hover:shadow-md transition-all group active:scale-95">
        <Icon size={24} className={`${colorClass} mb-1.5 group-hover:scale-110 transition-transform`}/>
        <span className="text-[11px] sm:text-xs font-bold text-[var(--text-color,#374151)] dark:text-gray-300 text-center leading-tight whitespace-pre-wrap">{label}</span>
    </button>
  );

  return (
    <div className="bg-transparent px-4 pt-2 shrink-0 flex flex-col justify-end">

      {selectedCartItemId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 mb-2 shadow-inner animate-in fade-in zoom-in-95 duration-200 shrink-0">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Item Controls</span>
                <button onClick={onCancelItem} className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"><Trash2 size={50}/> Remove</button>
            </div>
            <div className="flex gap-2 h-8">
                <div className="flex bg-white rounded-lg border border-blue-200 overflow-hidden shrink-0 shadow-sm">
                    <button onClick={() => dispatch(updateQuantity({ id: selectedCartItemId, quantity: Math.max(1, items.find(i=>i.id===selectedCartItemId)!.quantity - 1) }))} className="px-3 hover:bg-gray-50 font-black text-gray-600 transition-colors">-</button>
                    <div className="w-8 flex items-center justify-center font-bold text-sm bg-gray-50 border-x border-gray-100">{items.find(i=>i.id===selectedCartItemId)?.quantity || 1}</div>
                    <button onClick={() => dispatch(updateQuantity({ id: selectedCartItemId, quantity: items.find(i=>i.id===selectedCartItemId)!.quantity + 1 }))} className="px-3 hover:bg-gray-50 font-black text-gray-600 transition-colors">+</button>
                </div>
                <button onClick={() => onOpenControlModal && onOpenControlModal('price')} className="flex-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm">Price</button>
                <button onClick={() => onOpenControlModal && onOpenControlModal('discount')} className="flex-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm">Disc%</button>
                <button onClick={() => onOpenControlModal && onOpenControlModal('note')} className="flex-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm">Note</button>
            </div>
        </div>
      )}

      {/* ✅ INCREASED RECENT/FAVORITES BOX HEIGHT */}
      <div className="bg-[var(--card-color,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-800 p-2 shadow-sm h-[160px] flex flex-col mb-2 shrink-0">
          <div className="flex gap-2 mb-1 shrink-0">
            <button onClick={() => setSidebarTab('recent')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${sidebarTab === 'recent' ? 'bg-[var(--background-color,#f3f4f6)] dark:bg-slate-800 text-[var(--text-color,#1f2937)] dark:text-white shadow-sm' : 'text-[var(--sub-text-color,#9ca3af)] hover:bg-[var(--background-color,#f9fafb)] dark:hover:bg-slate-800/50'}`}>Recent</button>
            <button onClick={() => setSidebarTab('favorites')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${sidebarTab === 'favorites' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-[var(--sub-text-color,#9ca3af)] hover:bg-[var(--background-color,#f9fafb)] dark:hover:bg-slate-800/50'}`}>Favorites</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {sidebarTab === 'recent' ? (
                recentProducts.map(p => (
                  <div key={p.id} onClick={() => onAddItem(p)} className="flex justify-between items-center p-2 hover:bg-[var(--background-color,#f9fafb)] dark:hover:bg-slate-800 rounded-lg cursor-pointer group">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors"><Star size={14} fill={p.isFavorite ? "#3b82f6" : "none"} className={p.isFavorite ? "text-blue-500" : ""} /></button>
                          <span className="text-xs font-bold text-[var(--text-color,#374151)] dark:text-gray-300 truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); setHiddenRecentIds(prev => [...prev, p.id]); }} className="text-gray-300 hover:text-red-500 p-1"><X size={14}/></button><Plus size={14} className="text-gray-300 group-hover:text-blue-500"/></div>
                  </div>
                ))
              ) : (
                favoriteProducts.map(p => (
                  <div key={p.id} onClick={() => onAddItem(p)} className="flex justify-between items-center p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg cursor-pointer group">
                      <div className="flex items-center gap-2 overflow-hidden"><Star size={14} className="text-blue-500 fill-current"/><span className="text-xs font-bold text-[var(--text-color,#374151)] dark:text-gray-300 truncate">{p.name}</span></div>
                      <div className="flex items-center gap-1"><button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button><Plus size={14} className="text-gray-300 group-hover:text-blue-500"/></div>
                  </div>
                ))
              )}
          </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2 shrink-0">
        <GridBtn icon={PauseCircle} label="Hold (F8)" colorClass="text-orange-500" onClick={() => dispatch(holdSale())} />
        <GridBtn icon={PlayCircle} label="Resume (F9)" colorClass="text-blue-500" onClick={handleResumeHeld} />
        <GridBtn icon={Save} label="Save (F8)" colorClass="text-green-500" onClick={() => dispatch(holdSale())} />
        <GridBtn icon={List} label="Records (F10)" colorClass="text-purple-500" onClick={() => setShowRecords(true)} />
        <GridBtn icon={Search} label="Search (F2)" colorClass="text-blue-600" onClick={() => setShowItemSearch(true)} />
        <GridBtn icon={Package} label="Custom (F3)" colorClass="text-pink-500" onClick={() => setShowCustomItemModal(true)} />
        <GridBtn icon={Scale} label="Calc (F6)" colorClass="text-purple-600" onClick={() => setShowInternalUnitCalc(true)} />
        <GridBtn icon={RotateCcw} label="Refund (F4)" colorClass="text-red-500" onClick={onRefundClick} />
        <GridBtn icon={UserPlus} label="Cust+ (F7)" colorClass="text-emerald-500" onClick={handleOpenAddCustomer} />
        <GridBtn icon={Edit3} label="Cust Edit (F1)" colorClass="text-teal-500" onClick={handleOpenEditCustomer} />
        <GridBtn icon={FileText} label="Reprint" colorClass="text-gray-600" onClick={onReprintClick} />
        <GridBtn icon={Trash2} label="Clear (DEL)" colorClass="text-red-600" onClick={() => dispatch(clearCart())} />
      </div>

      {/* ✅ NEW: BIG VIEW CART BUTTON */}
      <div className="flex gap-2 mb-2 shrink-0">
          <button
              onClick={() => setShowFullCartModal(true)}
              className="flex-1 py-3 bg-[var(--card-color,#f3f4f6)] dark:bg-slate-800 border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 text-[var(--text-color,#1f2937)] dark:text-gray-200 rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:shadow-md hover:border-[var(--primary-color,#3b82f6)] dark:hover:border-blue-500 active:scale-95"
          >
              <div className="relative">
                  <ShoppingCart size={28} className="text-[var(--primary-color,#3b82f6)]"/>
                  {items.length > 0 && (
                      <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[11px] font-black min-w-[22px] px-1 h-[22px] flex items-center justify-center rounded-full shadow-md animate-in zoom-in duration-300 border-2 border-white dark:border-slate-800">
                          {items.length}
                      </span>
                  )}
              </div>
              <span className="text-sm">Manage Cart</span>
          </button>
      </div>

      <button
          onClick={() => items.length > 0 && onCheckout && onCheckout()}
          disabled={items.length === 0}
          className="w-full py-4 bg-[var(--primary-color,#16a34a)] text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shrink-0"
      >
          <Printer size={20}/> PAY & PRINT
      </button>

      {heldSales.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 shadow-sm shrink-0">
              <span className="text-xs font-black text-yellow-700 flex items-center gap-1"><PauseCircle size={14}/> {heldSales.length} Sales on Hold</span>
              <button onClick={handleResumeHeld} className="text-xs font-bold text-blue-600 hover:underline">Resume Last</button>
          </div>
      )}

      {/* ✅ NEW: FULL CART MANAGEMENT MODAL */}
      {showFullCartModal && (
        <div ref={cartModalRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, cartModalRef)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 outline-none">
            <div className="bg-[var(--background-color,#f9fafb)] dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
                <div className="px-6 py-5 border-b border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-800 flex justify-between items-center shrink-0 bg-[var(--card-color,#ffffff)] dark:bg-slate-800/50 rounded-t-3xl">
                    <h2 className="text-2xl font-black flex items-center gap-3 text-[var(--text-color,#1f2937)] dark:text-white">
                        <ShoppingCart size={28} className="text-[var(--primary-color,#3b82f6)]"/>
                        Manage Cart Items
                    </h2>
                    <button onClick={() => setShowFullCartModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {items.length === 0 ? (
                        <div className="text-center text-gray-400 py-16 text-xl font-bold flex flex-col items-center gap-4">
                            <ShoppingCart size={64} className="opacity-20"/>
                            Your cart is currently empty
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex flex-col md:flex-row justify-between md:items-center bg-[var(--card-color,#ffffff)] dark:bg-slate-800 p-4 rounded-2xl border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 shadow-sm gap-4 hover:border-[var(--primary-color,#3b82f6)] dark:hover:border-blue-500 transition-all">
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-[var(--text-color,#1f2937)] dark:text-white text-lg leading-tight">{item.name}</h4>
                                    <div className="text-sm font-medium text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 mt-1">{currency}{item.price.toFixed(2)}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {/* Inline QTY Control */}
                                    <div className="flex bg-[var(--background-color,#f3f4f6)] dark:bg-slate-700 rounded-xl border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-600 overflow-hidden shadow-sm h-12">
                                        <button onClick={() => dispatch(updateQuantity({id: item.id, quantity: Math.max(1, item.quantity - 1)}))} className="px-5 hover:bg-gray-200 dark:hover:bg-slate-600 font-black text-[var(--text-color,#374151)] dark:text-gray-300 transition-colors text-lg">-</button>
                                        <div className="w-12 flex items-center justify-center font-bold text-base bg-[var(--card-color,#ffffff)] dark:bg-slate-800 text-[var(--text-color,#1f2937)] dark:text-white border-x border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-600">{item.quantity}</div>
                                        <button onClick={() => dispatch(updateQuantity({id: item.id, quantity: item.quantity + 1}))} className="px-5 hover:bg-gray-200 dark:hover:bg-slate-600 font-black text-[var(--text-color,#374151)] dark:text-gray-300 transition-colors text-lg">+</button>
                                    </div>

                                    {/* Inline Discount Control */}
                                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-700/50 h-12">
                                        <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wide">Disc:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={item.discount || ''}
                                            onChange={(e) => dispatch(updateItemDiscount({id: item.id, discount: parseFloat(e.target.value) || 0}))}
                                            className="w-16 bg-transparent font-black text-orange-800 dark:text-orange-300 outline-none text-right text-lg"
                                        />
                                    </div>

                                    <div className="text-xl font-black text-[var(--primary-color,#2563eb)] dark:text-blue-400 min-w-[100px] text-right">
                                        {currency}{((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}
                                    </div>

                                    {/* Remove Button */}
                                    <button onClick={() => dispatch(removeFromCart(item.id))} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors ml-2" title="Remove Item">
                                        <Trash2 size={22} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ✅ ADD CUSTOM ITEM MODAL */}
      {showCustomItemModal && (
        <div ref={customItemRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, customItemRef, handleAddCustomItem)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 outline-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[500px]">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-blue-600"/> Add Custom Item</h3>
                    <button onClick={() => setShowCustomItemModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/2 p-6 border-r border-gray-100 flex flex-col">
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                <input type="text" value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} onClick={() => setActiveCustomField('name')} className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-gray-800 cursor-pointer transition-all ${activeCustomField === 'name' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}/>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="text" value={customItemPrice} onChange={(e) => setCustomItemPrice(e.target.value)} onClick={() => setActiveCustomField('price')} className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-gray-800 cursor-pointer transition-all ${activeCustomField === 'price' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}/>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax</label>
                                    <button onClick={()=>setCustomItemTax(!customItemTax)} className={`w-full py-3.5 rounded-xl text-xs font-bold border transition-colors ${customItemTax ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{customItemTax ? 'Tax On' : 'No Tax'}</button>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddCustomItem} disabled={!customItemName || !customItemPrice} className="w-full py-4 mt-4 bg-gray-900 text-white rounded-xl font-bold shadow-xl active:scale-95 transition-all">Add to Cart</button>
                    </div>
                    <div className="w-1/2 bg-gray-50 p-4 border-l border-gray-200">
                        <div className="h-full flex flex-col justify-end">
                            <CustomKeypad layout={activeCustomField === 'price' ? 'numeric' : 'full'} onKeyPress={handleCustomItemKeyPress} onBackspace={handleCustomItemBackspace} onEnter={handleAddCustomItem} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ✅ CUSTOMER ADD/EDIT MODAL */}
      {showCustomerModal && (
        <div ref={customerRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, customerRef, () => { if(!isSavingCustomer) handleSaveCustomer(); })} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 outline-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[600px]">
                <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        {editingCustomerId ? <Edit3 className="text-teal-500"/> : <UserPlus className="text-emerald-500"/>}
                        {editingCustomerId ? "Update Customer" : "Quick Add Customer"}
                    </h3>
                    <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/2 p-6 border-r border-gray-100 overflow-y-auto flex flex-col">
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name *</label>
                                <input type="text" value={customerFormData.name} onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})} onClick={() => setActiveCustField('name')} className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-gray-800 cursor-pointer transition-all ${activeCustField === 'name' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Phone</label>
                                <input type="tel" value={customerFormData.phone} onChange={(e) => setCustomerFormData({...customerFormData, phone: e.target.value})} onClick={() => setActiveCustField('phone')} className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-gray-800 cursor-pointer transition-all ${activeCustField === 'phone' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                                <input type="email" value={customerFormData.email} onChange={(e) => setCustomerFormData({...customerFormData, email: e.target.value})} onClick={() => setActiveCustField('email')} className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-gray-800 cursor-pointer transition-all ${activeCustField === 'email' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tier Classification</label>
                                    <select value={customerFormData.type} onChange={(e) => setCustomerFormData({...customerFormData, type: e.target.value as Customer['type']})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold bg-white outline-none focus:border-blue-500 cursor-pointer">
                                        <option value="Walk-in">Walk-in</option>
                                        <option value="Registered">Registered</option>
                                        <option value="Member">Member</option>
                                        <option value="Wholesale">Wholesale</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Loyalty Program</label>
                                    <div className="h-[52px] bg-blue-50/50 px-4 rounded-xl border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setCustomerFormData({...customerFormData, loyaltyJoined: !customerFormData.loyaltyJoined})}>
                                        <span className="text-sm font-black text-blue-900">Enroll</span>
                                        <input type="checkbox" readOnly checked={customerFormData.loyaltyJoined} className="w-5 h-5 text-blue-600 rounded cursor-pointer pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleSaveCustomer()} disabled={isSavingCustomer || !customerFormData.name.trim()} className="w-full py-4 mt-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2">
                            {isSavingCustomer ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> {editingCustomerId ? "Save Changes" : "Create & Select"}</>}
                        </button>
                    </div>
                    <div className="w-1/2 bg-gray-50 p-4 border-l border-gray-200">
                        <div className="h-full flex flex-col justify-end">
                            <VirtualKeyboard layout={activeCustField === 'phone' ? 'numeric' : 'full'} onKeyPress={handleCustKeyPress} onBackspace={handleCustBackspace} onEnter={() => handleSaveCustomer()} className="h-full border-none shadow-none bg-transparent" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showItemSearch && (
        <div ref={searchRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, searchRef)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 outline-none"><div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[700px] animate-in fade-in zoom-in-95"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Search size={18} className="text-blue-600"/> Search Item</h3><button onClick={() => {setShowItemSearch(false); setItemSearchQuery('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results ({filteredItems.length})</div><div className="flex-1 overflow-y-auto p-2">{filteredItems.length === 0 ? <div className="text-center text-gray-400 py-10">Type to search...</div> :<div className="space-y-2">{filteredItems.map(product => (<button key={product.id} onClick={() => onAddItem(product)} className="w-full flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"><div><div className="font-bold text-gray-800 group-hover:text-blue-700">{product.name}</div><div className="text-xs text-gray-400">SKU: {product.sku || 'N/A'} • {product.stock} in stock</div></div><div className="font-bold text-gray-600 group-hover:text-blue-600">{currency}{Number(product.price).toFixed(2)}</div></button>))}</div>}</div></div><div className="w-1/2 p-5 flex flex-col bg-white"><div className="mb-4"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Search Query</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" autoFocus value={itemSearchQuery} onChange={(e) => setItemSearchQuery(e.target.value)} onKeyDown={handleItemSearchKeyDown} placeholder="Type Name, SKU or Barcode..." className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-lg font-bold" /></div></div><div className="flex-1"><VirtualKeyboard layout="full" onKeyPress={handleSearchItemKeyPress} onBackspace={handleSearchItemBackspace} onEnter={() => handleItemSearchKeyDown()} className="h-full border-none shadow-none bg-gray-50" /></div></div></div></div></div>
      )}

      {showRecords && (
        <div ref={recordsRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, recordsRef)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 outline-none"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={18} className="text-blue-600"/> Sales Records</h3><button onClick={() => {setShowRecords(false); setRecordSearch('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-2/3 flex flex-col border-r border-gray-100"><div className="p-4 border-b border-gray-100 bg-white"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Search Sale ID (e.g. 24)" value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" /></div></div><div className="flex-1 overflow-y-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] sticky top-0"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{recordsLoading ? (<tr><td colSpan={5} className="text-center py-8 text-gray-400"><Loader2 className="animate-spin inline mr-2"/> Loading Records...</td></tr>) : filteredHistory.length === 0 ? (<tr><td colSpan={5} className="text-center py-8 text-gray-400">No records found.</td></tr>) : (filteredHistory.map(order => (<tr key={order.id} className="hover:bg-blue-50 transition-colors group"><td className="px-4 py-3 font-bold text-gray-700">#{order.id}</td><td className="px-4 py-3 text-gray-500 flex items-center gap-1"><Calendar size={12}/> {new Date(order.created_at || order.timestamp).toLocaleDateString()}</td><td className="px-4 py-3 text-gray-600">{(order.items || []).length} items</td><td className="px-4 py-3 text-right font-bold text-gray-800">{currency}{Number(order.total || order.total_amount).toFixed(2)}</td><td className="px-4 py-3 flex justify-center gap-2"><button onClick={() => onReprintClick && onReprintClick()} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Reprint"><Printer size={14}/></button></td></tr>)))}</tbody></table></div></div><div className="w-1/3 bg-gray-50 p-4"><div className="h-full flex flex-col justify-end"><VirtualKeyboard layout="numeric" onKeyPress={handleRecordKeyPress} onBackspace={handleRecordBackspace} onEnter={() => {}} className="h-full border-none shadow-none bg-transparent" /></div></div></div></div></div>
      )}

      {/* ✅ UNIT CALCULATOR MODAL */}
      {showInternalUnitCalc && (
        <div ref={unitCalcRef} tabIndex={-1} onKeyDown={(e) => handleModalKeyboardNav(e, unitCalcRef, handleAddUnitItem)} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 outline-none"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[700px]"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18} className="text-purple-600"/> Unit Calculator</h3><button onClick={() => setShowInternalUnitCalc(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-1/2 p-5 border-r border-gray-100 overflow-y-auto flex flex-col gap-4"><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Unit Type</label><div className="flex bg-gray-100 p-1 rounded-lg">{['g', 'kg', 'ml', 'L', 'pcs'].map(u => (<button key={u} onClick={() => setUcUnitType(u)} className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${ucUnitType === u ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{u}</button>))}</div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label><input type="text" placeholder="e.g. Loose Rice" value={ucItemName} onChange={(e) => setUcItemName(e.target.value)} onClick={() => setActiveUcField('name')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'name' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 mb-1">Base Price ($)</label><input type="text" placeholder="0.00" value={ucBasePrice} onChange={(e) => setUcBasePrice(e.target.value)} onClick={() => setActiveUcField('price')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'price' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Unit Size ({ucUnitType})</label><input type="text" placeholder="1" value={ucUnitSize} onChange={(e) => setUcUnitSize(e.target.value)} onClick={() => setActiveUcField('size')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'size' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Customer Quantity ({ucUnitType})</label><input type="text" placeholder="0" value={ucQuantity} onChange={(e) => setUcQuantity(e.target.value)} onClick={() => setActiveUcField('qty')} className={`w-full px-3 py-2 border rounded-lg font-bold text-lg outline-none cursor-pointer transition-all ${activeUcField === 'qty' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div className="bg-purple-50 p-3 rounded-lg flex justify-between items-center border border-purple-100 mt-auto"><div className="text-xs text-purple-600 font-medium">Calculated Cost</div><div className="text-xl font-black text-purple-800">{currency}{unitCalcTotal.toFixed(2)}</div></div><button onClick={handleAddUnitItem} disabled={unitCalcTotal <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Plus size={18} /> Add Calculated Item</button></div><div className="w-1/2 bg-gray-50 p-4 border-l border-gray-200"><div className="h-full flex flex-col justify-end"><VirtualKeyboard layout={activeUcField === 'name' ? 'full' : 'numeric'} onKeyPress={handleUcKeyPress} onBackspace={handleUcBackspace} onEnter={handleAddUnitItem} className="h-full border-none shadow-none bg-transparent" /></div></div></div></div></div>
      )}

    </div>
  );
};
export default CartPanel;