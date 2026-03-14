// cspell:ignore dexie Dexie
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  clearCart,
  resumeSale, holdSale,
  addToCart, updateQuantity,
  setCustomer // ✅ Imported to automatically select the newly created customer
} from '../../store/cartSlice';
import {
  Printer, Search, X, Trash2, Save, RotateCcw, AlertTriangle,
  List, Scale, Plus, Calendar, Calculator, Loader2,
  PauseCircle, PlayCircle, FileText, Minus, Star, Zap, UserPlus, Edit3 // ✅ Imported new icons
} from 'lucide-react';
import { db, Order } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';
import { useCurrency } from '../../hooks/useCurrency';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// ✅ IMPORT CLOUD SERVICES
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { customerService, Customer } from '../../services/customerService'; // ✅ Added Customer Service

interface CartPanelProps {
    onCancelItem: () => void;
    onInputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onCheckout?: () => void;
    selectedCartItemId?: number | null;
    onOpenControlModal?: (type: 'price' | 'discount' | 'note') => void;
    onRefundClick?: () => void;
    onReprintClick?: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({
    onCancelItem, onInputFocus, onCheckout,
    selectedCartItemId, onOpenControlModal, onRefundClick, onReprintClick
}) => {
  const dispatch = useAppDispatch();
  const { items, heldSales, customer } = useAppSelector((state) => state.cart);
  const currency = useCurrency();

  // --- Local State ---
  const [lastOrder, setLastOrder] = useState<any>(null);

  // --- Modals ---
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [showRecords, setShowRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');

  // --- Customer Add/Edit Modal State ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
      name: '',
      phone: '',
      email: '',
      type: 'Walk-in' as Customer['type'],
      loyaltyJoined: false
  });

  // --- Unit Calculator ---
  const [showInternalUnitCalc, setShowInternalUnitCalc] = useState(false);
  const [ucItemName, setUcItemName] = useState('');
  const [ucBasePrice, setUcBasePrice] = useState<string>('');
  const [ucUnitSize, setUcUnitSize] = useState<string>('1');
  const [ucQuantity, setUcQuantity] = useState<string>('');
  const [ucUnitType, setUcUnitType] = useState<string>('g');
  const [activeUcField, setActiveUcField] = useState<'name' | 'price' | 'size' | 'qty'>('name');

  // --- Sidebar State ---
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'favorites'>('recent');
  const [hiddenRecentIds, setHiddenRecentIds] = useState<number[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemTax, setCustomItemTax] = useState(true);

  // --- Global Settings (Local) ---
  const settings = useLiveQuery(() => db.settings.get(1));

  // --- CLOUD DATA STATE ---
  const [cloudProducts, setCloudProducts] = useState<any[]>([]);
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // --- INITIAL FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const prodData = await productService.getAll();
        setCloudProducts(prodData.filter((p: any) => p.isActive !== false));
      } catch (err) {
        console.error("Error syncing cart panel data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lastOrder]);

  // --- FETCH RECORDS WHEN MODAL OPENS ---
  useEffect(() => {
      if (showRecords) {
          const fetchOrders = async () => {
              setRecordsLoading(true);
              try {
                  const orders = await orderService.getAllOrders();
                  setCloudOrders(orders);
              } catch (err) {
                  console.error("Failed to load orders:", err);
              } finally {
                  setRecordsLoading(false);
              }
          };
          fetchOrders();
      }
  }, [showRecords, lastOrder]);

  // --- FILTERING LOGIC ---
  const filteredItems = cloudProducts.filter(p =>
      p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(itemSearchQuery)) ||
      (p.sku && p.sku.includes(itemSearchQuery))
  ).slice(0, 15);

  const filteredHistory = cloudOrders.filter(order =>
      order.id.toString().includes(recordSearch)
  );

  const recentProducts = cloudProducts.filter(p => p.id && !hiddenRecentIds.includes(p.id)).sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 10);
  const favoriteProducts = cloudProducts.filter(p => p.isFavorite);

  // --- Mock Data ---
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 60000);
      return () => clearInterval(timer);
  }, []);

  const saleNumber = `#${String(cloudOrders.length + 1).padStart(5, '0')}`;
  const cashierName = "Admin";

  // ==========================================
  // 👥 CUSTOMER ADD / EDIT LOGIC
  // ==========================================
  const handleOpenAddCustomer = () => {
      setEditingCustomerId(null);
      setCustomerFormData({ name: '', phone: '', email: '', type: 'Walk-in', loyaltyJoined: false });
      setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = () => {
      if (!customer) {
          alert("Please select a customer from the search bar first to edit them.");
          return;
      }
      setEditingCustomerId(customer.id!);
      setCustomerFormData({
          name: customer.name,
          phone: (customer as any).phone || '',
          email: (customer as any).email || '',
          type: (customer as any).type || 'Walk-in',
          loyaltyJoined: (customer as any).loyaltyJoined || false
      });
      setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!customerFormData.name.trim()) return;

      setIsSavingCustomer(true);
      try {
          let payload: Partial<Customer> = {
              name: customerFormData.name.trim(),
              phone: customerFormData.phone,
              email: customerFormData.email,
              type: customerFormData.type,
              loyaltyJoined: customerFormData.loyaltyJoined,
          };

          if (editingCustomerId) {
              const updatedCust = await customerService.update(editingCustomerId, payload);
              dispatch(setCustomer(updatedCust as any)); // Update POS state immediately
          } else {
              const newCust = await customerService.create({
                  ...(payload as Customer),
                  loyaltyPoints: 0,
                  totalSpend: 0,
                  totalPurchases: 0
              });
              dispatch(setCustomer(newCust as any)); // Auto-select the new customer in POS
          }
          setShowCustomerModal(false);
      } catch (error) {
          alert("Failed to sync customer with cloud database.");
      } finally {
          setIsSavingCustomer(false);
      }
  };

  // ==========================================
  // ⚖️ UNIT CALCULATOR
  // ==========================================
  const getNormalizedValue = (val: number, unit: string): number => {
      if (unit === 'kg' || unit === 'L') return val * 1000;
      return val;
  };

  const calculateUnitTotal = () => {
      const basePrice = parseFloat(ucBasePrice);
      const singleUnitSize = parseFloat(ucUnitSize);
      const quantity = parseFloat(ucQuantity);

      if (!basePrice || !singleUnitSize || !quantity || basePrice <= 0 || singleUnitSize <= 0 || quantity <= 0) return 0;
      const normSingleUnit = getNormalizedValue(singleUnitSize, ucUnitType);
      const normQuantity = getNormalizedValue(quantity, ucUnitType);
      const pricePerBaseUnit = basePrice / normSingleUnit;
      const totalCost = pricePerBaseUnit * normQuantity;
      return parseFloat(totalCost.toFixed(4));
  };
  const unitCalcTotal = calculateUnitTotal();

  // ==========================================
  // ⌨️ INPUT HANDLERS
  // ==========================================
  const handleUcKeyPress = (key: string) => {
      const updateNum = (prev: string) => { if (key === '.' && prev.includes('.')) return prev; return prev + key; };
      if (activeUcField === 'name') setUcItemName(prev => prev + key);
      if (activeUcField === 'price') setUcBasePrice(prev => updateNum(prev));
      if (activeUcField === 'size') setUcUnitSize(prev => updateNum(prev));
      if (activeUcField === 'qty') setUcQuantity(prev => updateNum(prev));
  };

  const handleUcBackspace = () => {
      if (activeUcField === 'name') setUcItemName(prev => prev.slice(0, -1));
      if (activeUcField === 'price') setUcBasePrice(prev => prev.slice(0, -1));
      if (activeUcField === 'size') setUcUnitSize(prev => prev.slice(0, -1));
      if (activeUcField === 'qty') setUcQuantity(prev => prev.slice(0, -1));
  };

  const handleSearchItemKeyPress = (key: string) => setItemSearchQuery(prev => prev + key);
  const handleSearchItemBackspace = () => setItemSearchQuery(prev => prev.slice(0, -1));
  const handleRecordKeyPress = (key: string) => setRecordSearch(prev => prev + key);
  const handleRecordBackspace = () => setRecordSearch(prev => prev.slice(0, -1));

  // ==========================================
  // ⚡ ACTIONS
  // ==========================================
  const validateAndAdd = (product: any) => {
    const existingItem = items.find(item => item.id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;
    if (product.type === 'Stock' && !product.allowNegativeStock) {
        if (product.stock <= 0) return alert(`Cannot sell "${product.name}". Out of stock.`);
        if (currentQty + 1 > product.stock) return alert(`Cannot sell "${product.name}". Only ${product.stock} in stock.`);
    }
    dispatch(addToCart({ id: product.id!, name: product.displayName || product.name, price: product.price, stock: product.stock, barcode: product.barcode, category: product.category, isTaxIncluded: product.isTaxIncluded, quantity: 1, discount: 0, note: '' }));
  };

  const handleToggleFavorite = async (e: React.MouseEvent, product: any) => {
      e.stopPropagation();
      if (!product.id) return;
      const newStatus = !product.isFavorite;
      setCloudProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: newStatus } : p));
      try { await productService.update(product.id, { ...product, isFavorite: newStatus }); }
      catch (err) { setCloudProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFavorite: !newStatus } : p)); }
  };

  const handleAddCustomItem = () => {
    if (!customItemName || !customItemPrice) return;
    dispatch(addToCart({ id: Date.now(), name: customItemName, price: parseFloat(customItemPrice), stock: 9999, barcode: 'CUSTOM', category: 'Custom', isTaxIncluded: customItemTax, quantity: 1, discount: 0, note: '' }));
    setCustomItemName(''); setCustomItemPrice('');
  };

  const handleAddUnitItem = () => {
      if (unitCalcTotal <= 0) return alert("Invalid input.");
      const finalName = ucItemName.trim() !== '' ? `${ucItemName} (${parseFloat(ucQuantity)} ${ucUnitType})` : `Custom (${parseFloat(ucQuantity)} ${ucUnitType})`;
      dispatch(addToCart({ id: Date.now(), name: finalName, price: parseFloat(unitCalcTotal.toFixed(2)), stock: 9999, barcode: 'UNIT-CALC', category: 'Custom', isTaxIncluded: true, quantity: 1, unit: ucUnitType, unitValue: parseFloat(ucQuantity), discount: 0, note: '' }));
      setUcItemName(''); setUcBasePrice(''); setUcUnitSize('1'); setUcQuantity(''); setShowInternalUnitCalc(false);
  };

  const handleAddItem = (product: any) => {
      if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) return alert("Out of Stock");
      dispatch(addToCart({ id: product.id, name: product.name, price: Number(product.price), stock: Number(product.stock), barcode: product.barcode, category: product.category, isTaxIncluded: product.isTaxIncluded, quantity: 1, discount: 0, note: '' }));
  };

  const handleItemSearchKeyDown = (e?: React.KeyboardEvent) => {
      if ((!e || e.key === 'Enter') && filteredItems.length > 0) handleAddItem(filteredItems[0]);
  };

  const handleReprintOld = (order: Order) => {
      setLastOrder(order);
      setTimeout(() => window.print(), 100);
  };

  const handleResumeHeld = () => { if (heldSales.length > 0) dispatch(resumeSale(heldSales[heldSales.length - 1].id)); };

  const ControlTile = ({ icon: Icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
        <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center mb-1 group-hover:scale-110 transition-transform`}><Icon size={14} className="text-white"/></div>
        <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{label}</span>
    </button>
  );

  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'End') {
              e.preventDefault();
              if (items.length > 0 && onCheckout) onCheckout();
          }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [items, onCheckout]);

  // ==========================================
  // 🖥️ RENDER
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 relative">
      {lastOrder && <ReceiptTemplate order={lastOrder} />}

      {/* 1. Header (Fixed) */}
      <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-start shrink-0">
        <div><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sale {saleNumber}</h2><div className="text-lg font-black text-gray-800">{currentTime}</div></div>
        <div className="text-right"><div className="flex items-center justify-end gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online</div><div className="text-[10px] text-gray-400 font-mono mt-1">{cashierName}</div></div>
      </div>

      {/* 2. Middle Section: SCROLLABLE ACTIONS */}
      <div className="flex-1 p-4 bg-white overflow-y-auto custom-scrollbar space-y-6">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><Zap className="text-yellow-500 fill-current" size={20}/> Actions</h2>

          {/* Quick Actions */}
          <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => dispatch(holdSale())} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><PauseCircle size={20} className="text-orange-500 mb-1"/><span className="text-xs font-bold text-gray-700">Hold</span></button>
                <button onClick={handleResumeHeld} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><PlayCircle size={20} className="text-blue-500 mb-1"/><span className="text-xs font-bold text-gray-700">Open</span></button>
                <button onClick={onRefundClick} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-red-300 hover:shadow-sm transition-all group"><RotateCcw size={20} className="text-red-500 mb-1 group-hover:scale-110 transition-transform"/><span className="text-xs font-bold text-gray-700">Refund</span></button>
                <button onClick={onReprintClick} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><FileText size={20} className="text-gray-500 mb-1"/><span className="text-xs font-bold text-gray-700">Reprint</span></button>

                {/* ✅ REPLACED CASH IN/OUT WITH CUSTOMER ADD/EDIT */}
                <button onClick={handleOpenAddCustomer} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><UserPlus size={20} className="text-green-500 mb-1"/><span className="text-xs font-bold text-gray-700">Add Cust.</span></button>
                <button onClick={handleOpenEditCustomer} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"><Edit3 size={20} className="text-purple-500 mb-1"/><span className="text-xs font-bold text-gray-700">Edit Cust.</span></button>
              </div>
          </div>

          {/* Recent / Favorites */}
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
                              <button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 hover:text-blue-500 transition-colors"><Star size={14} fill={p.isFavorite ? "#3b82f6" : "none"} className={p.isFavorite ? "text-blue-500" : ""} /></button>
                              <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setHiddenRecentIds(prev => [...prev, p.id]); }} className="text-gray-300 hover:text-red-500 p-1"><X size={14}/></button>
                              <Plus size={14} className="text-gray-300 group-hover:text-blue-500"/>
                          </div>
                      </div>
                    ))
                  ) : (
                    favoriteProducts.map(p => (
                      <div key={p.id} onClick={() => validateAndAdd(p)} className="flex justify-between items-center p-2 hover:bg-blue-50 rounded-lg cursor-pointer group">
                          <div className="flex items-center gap-2 overflow-hidden"><Star size={12} className="text-blue-500 fill-current"/><span className="text-xs font-bold text-gray-700 truncate">{p.name}</span></div>
                          <div className="flex items-center gap-1">
                              <button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                              <Plus size={14} className="text-gray-300 group-hover:text-blue-500"/>
                          </div>
                      </div>
                    ))
                  )}
              </div>
          </div>

          {/* Item Controls */}
          <div className={`space-y-2 transition-opacity duration-200 ${!selectedCartItemId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">Item Controls {selectedCartItemId && <span className="text-blue-600">Active</span>}</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => selectedCartItemId && dispatch(updateQuantity({ id: selectedCartItemId, quantity: items.find(i=>i.id===selectedCartItemId)!.quantity - 1 }))} className="bg-white border border-gray-200 rounded-lg py-3 font-bold text-gray-700 hover:border-red-300 hover:text-red-600 shadow-sm"><Minus size={16} className="mx-auto"/></button>
                <button onClick={() => {
                    if(!selectedCartItemId) return;
                    const item = items.find(i => i.id === selectedCartItemId);
                    if(item) {
                        const original = cloudProducts.find(p => p.id === item.id);
                        if(original && original.type === 'Stock' && !original.allowNegativeStock && item.quantity >= original.stock) {
                            alert(`Max stock reached (${original.stock})`); return;
                        }
                        dispatch(updateQuantity({ id: selectedCartItemId, quantity: item.quantity + 1 }));
                    }
                }} className="bg-white border border-gray-200 rounded-lg py-3 font-bold text-gray-700 hover:border-green-300 hover:text-green-600 shadow-sm"><Plus size={16} className="mx-auto"/></button>
                <button onClick={() => onOpenControlModal && onOpenControlModal('price')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50">Price</button>
                <button onClick={() => onOpenControlModal && onOpenControlModal('discount')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50">Disc %</button>
                <button onClick={() => onOpenControlModal && onOpenControlModal('note')} className="bg-white border border-gray-200 rounded-lg py-2 font-bold text-xs text-gray-600 hover:bg-gray-50 col-span-2">Add Note</button>
                <button onClick={onCancelItem} className="bg-red-50 border border-red-200 text-red-600 rounded-lg py-2 font-bold text-xs hover:bg-red-100 col-span-2 flex items-center justify-center gap-2"><Trash2 size={14}/> Remove Item</button>
              </div>
          </div>

          {/* Custom Item */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Item</h4>
              <input type="text" placeholder="Item Name" value={customItemName} onChange={e => setCustomItemName(e.target.value)} onFocus={onInputFocus} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"/>
              <div className="flex gap-2">
                  <input type="number" placeholder="Price" value={customItemPrice} onChange={e => setCustomItemPrice(e.target.value)} onFocus={onInputFocus} className="w-2/3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-right focus:ring-2 focus:ring-blue-500 outline-none"/>
                  <button onClick={() => setCustomItemTax(!customItemTax)} className={`w-1/3 rounded-lg text-xs font-bold border ${customItemTax ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{customItemTax ? 'Tax On' : 'No Tax'}</button>
              </div>
              <button onClick={handleAddCustomItem} className="w-full py-3 bg-white border border-gray-300 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm">Add to Cart</button>
          </div>
      </div>

      {/* 3. Bottom Operations Area (Fixed) */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0">
        <div className="grid grid-cols-4 gap-2 mb-3">
            <ControlTile icon={Trash2} label="Cancel Sale" color="bg-red-500" onClick={() => dispatch(clearCart())} />
            <ControlTile icon={RotateCcw} label="Cancel Item" color="bg-orange-500" onClick={onCancelItem} />
            <ControlTile icon={Search} label="Search Item" color="bg-blue-500" onClick={() => setShowItemSearch(true)} />
            <ControlTile icon={Scale} label="Unit Calc" color="bg-purple-500" onClick={() => setShowInternalUnitCalc(true)} />
        </div>

        <div className="grid grid-cols-3 gap-2">
            <button onClick={() => dispatch(holdSale())} className="col-span-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm flex flex-col items-center justify-center text-[10px]">
                <Save size={16} className="mb-1"/> Save Sale
            </button>
            <button onClick={() => setShowRecords(true)} className="col-span-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm flex flex-col items-center justify-center text-[10px]">
                <List size={16} className="mb-1"/> View Records
            </button>
            <button onClick={() => dispatch(clearCart())} className="col-span-1 py-3 bg-white border border-gray-300 text-red-600 font-bold rounded-xl hover:bg-red-50 shadow-sm flex flex-col items-center justify-center text-[10px]">
                <AlertTriangle size={16} className="mb-1"/> Delete Sale
            </button>
        </div>

        <button
            onClick={() => items.length > 0 && onCheckout && onCheckout()}
            disabled={items.length === 0}
            className="w-full mt-3 py-4 bg-white border border-gray-300 text-blue-600 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:bg-blue-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Printer size={20}/> Pay & Print (End)
        </button>

        {heldSales.length > 0 && (
            <div className="mt-3 p-2 bg-transparent border border-yellow-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-bold text-yellow-700">{heldSales.length} Sales on Hold</span>
                <button onClick={handleResumeHeld} className="text-xs font-bold text-blue-600 hover:underline">Resume Last</button>
            </div>
        )}
      </div>

      {/* --- ✅ NEW: CUSTOMER ADD/EDIT MODAL --- */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">{editingCustomerId ? "Update Customer" : "Quick Add Customer"}</h3>
                    <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveCustomer} className="p-8 space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name *</label>
                      <input type="text" required autoFocus value={customerFormData.name} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Phone</label>
                      <input type="tel" value={customerFormData.phone} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                      <input type="email" value={customerFormData.email} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" placeholder="customer@email.com"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tier Classification</label>
                        <select value={customerFormData.type} onChange={(e) => setCustomerFormData({...customerFormData, type: e.target.value as Customer['type']})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Walk-in">Walk-in</option>
                          <option value="Registered">Registered</option>
                          <option value="Member">Member</option>
                          <option value="Wholesale">Wholesale</option>
                        </select>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <span className="text-xs font-black text-blue-900">Enroll in Loyalty Program</span>
                        <input type="checkbox" checked={customerFormData.loyaltyJoined} onChange={(e) => setCustomerFormData({...customerFormData, loyaltyJoined: e.target.checked})} className="w-5 h-5 text-blue-600 rounded cursor-pointer"/>
                    </div>
                    <button type="submit" disabled={isSavingCustomer} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSavingCustomer ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> {editingCustomerId ? "Save Changes" : "Create & Select"}</>}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Item Search Modal */}
      {showItemSearch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[700px] animate-in fade-in zoom-in-95">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Search size={18} className="text-blue-600"/> Search Item</h3>
                    <button onClick={() => {setShowItemSearch(false); setItemSearchQuery('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/2 border-r border-gray-100 flex flex-col bg-gray-50">
                        <div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results ({filteredItems.length})</div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredItems.length === 0 ? <div className="text-center text-gray-400 py-10">Type to search...</div> :
                                <div className="space-y-2">
                                    {filteredItems.map(product => (
                                        <button key={product.id} onClick={() => handleAddItem(product)} className="w-full flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
                                            <div>
                                                <div className="font-bold text-gray-800 group-hover:text-blue-700">{product.name}</div>
                                                <div className="text-xs text-gray-400">SKU: {product.sku || 'N/A'} • {product.stock} in stock</div>
                                            </div>
                                            <div className="font-bold text-gray-600 group-hover:text-blue-600">{currency}{Number(product.price).toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            }
                        </div>
                    </div>
                    <div className="w-1/2 p-5 flex flex-col bg-white">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Search Query</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text" autoFocus
                                    value={itemSearchQuery}
                                    onChange={(e) => setItemSearchQuery(e.target.value)}
                                    onKeyDown={handleItemSearchKeyDown}
                                    placeholder="Type Name, SKU or Barcode..."
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-lg font-bold"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <VirtualKeyboard
                                layout="full"
                                onKeyPress={handleSearchItemKeyPress}
                                onBackspace={handleSearchItemBackspace}
                                onEnter={() => handleItemSearchKeyDown()}
                                className="h-full border-none shadow-none bg-gray-50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* View Records Modal */}
      {showRecords && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={18} className="text-blue-600"/> Sales Records</h3>
                    <button onClick={() => {setShowRecords(false); setRecordSearch('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-2/3 flex flex-col border-r border-gray-100">
                        <div className="p-4 border-b border-gray-100 bg-white">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search Sale ID (e.g. 24)"
                                    value={recordSearch}
                                    onChange={(e) => setRecordSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Items</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recordsLoading ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400"><Loader2 className="animate-spin inline mr-2"/> Loading Records...</td></tr>
                                    ) : filteredHistory.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">No records found.</td></tr>
                                    ) : (
                                        filteredHistory.map(order => (
                                            <tr key={order.id} className="hover:bg-blue-50 transition-colors group">
                                                <td className="px-4 py-3 font-bold text-gray-700">#{order.id}</td>
                                                <td className="px-4 py-3 text-gray-500 flex items-center gap-1"><Calendar size={12}/> {new Date(order.created_at || order.timestamp).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-gray-600">{(order.items || []).length} items</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-800">{currency}{Number(order.total || order.total_amount).toFixed(2)}</td>
                                                <td className="px-4 py-3 flex justify-center gap-2">
                                                    <button onClick={() => handleReprintOld(order)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Reprint"><Printer size={14}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="w-1/3 bg-gray-50 p-4">
                        <div className="h-full flex flex-col justify-end">
                            <VirtualKeyboard
                                layout="numeric"
                                onKeyPress={handleRecordKeyPress}
                                onBackspace={handleRecordBackspace}
                                onEnter={() => {}}
                                className="h-full border-none shadow-none bg-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Unit Calculator Modal */}
      {showInternalUnitCalc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[700px]">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18} className="text-purple-600"/> Unit Calculator</h3>
                    <button onClick={() => setShowInternalUnitCalc(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/2 p-5 border-r border-gray-100 overflow-y-auto flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Unit Type</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['g', 'kg', 'ml', 'L', 'pcs'].map(u => (
                                    <button key={u} onClick={() => setUcUnitType(u)} className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${ucUnitType === u ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{u}</button>
                                ))}
                            </div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label><input type="text" readOnly placeholder="e.g. Loose Rice" value={ucItemName} onClick={() => setActiveUcField('name')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'name' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Base Price ($)</label><input type="text" readOnly placeholder="0.00" value={ucBasePrice} onClick={() => setActiveUcField('price')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'price' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Unit Size ({ucUnitType})</label><input type="text" readOnly placeholder="1" value={ucUnitSize} onClick={() => setActiveUcField('size')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'size' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Customer Quantity ({ucUnitType})</label><input type="text" readOnly placeholder="0" value={ucQuantity} onClick={() => setActiveUcField('qty')} className={`w-full px-3 py-2 border rounded-lg font-bold text-lg outline-none cursor-pointer transition-all ${activeUcField === 'qty' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div>
                        <div className="bg-purple-50 p-3 rounded-lg flex justify-between items-center border border-purple-100 mt-auto">
                            <div className="text-xs text-purple-600 font-medium">Calculated Cost</div>
                            <div className="text-xl font-black text-purple-800">{currency}{unitCalcTotal.toFixed(2)}</div>
                        </div>
                        <button onClick={handleAddUnitItem} disabled={unitCalcTotal <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Plus size={18} /> Add Calculated Item</button>
                    </div>
                    <div className="w-1/2 bg-gray-50 p-4 border-l border-gray-200">
                        <div className="h-full flex flex-col justify-end">
                            <VirtualKeyboard layout={activeUcField === 'name' ? 'full' : 'numeric'} onKeyPress={handleUcKeyPress} onBackspace={handleUcBackspace} onEnter={handleAddUnitItem} className="h-full border-none shadow-none bg-transparent" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default CartPanel;