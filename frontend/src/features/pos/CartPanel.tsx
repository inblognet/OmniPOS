// cspell:ignore dexie Dexie cust Cust
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { clearCart, resumeSale, holdSale, updateQuantity, setCustomer } from '../../store/cartSlice';
import {
  Printer, Search, X, Trash2, Save, RotateCcw, List, Scale, Plus,
  Calendar, Calculator, Loader2, Package, PauseCircle, PlayCircle,
  FileText, Star, UserPlus, Edit3
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { customerService, Customer } from '../../services/customerService';
import { productService } from '../../services/productService';
import { useCurrency } from '../../hooks/useCurrency';
import VirtualKeyboard from '../../components/VirtualKeyboard';

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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({ name: '', phone: '', email: '', type: 'Walk-in' as Customer['type'], loyaltyJoined: false });

  const [showInternalUnitCalc, setShowInternalUnitCalc] = useState(false);
  const [ucItemName, setUcItemName] = useState('');
  const [ucBasePrice, setUcBasePrice] = useState<string>('');
  const [ucUnitSize, setUcUnitSize] = useState<string>('1');
  const [ucQuantity, setUcQuantity] = useState<string>('');
  const [ucUnitType, setUcUnitType] = useState<string>('g');
  const [activeUcField, setActiveUcField] = useState<'name' | 'price' | 'size' | 'qty'>('name');

  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemTax, setCustomItemTax] = useState(true);

  const [sidebarTab, setSidebarTab] = useState<'recent' | 'favorites'>('recent');
  const [hiddenRecentIds, setHiddenRecentIds] = useState<number[]>([]);

  const [cloudProducts, setCloudProducts] = useState<any[]>([]);
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => { try { const prodData = await productService.getAll(); setCloudProducts(prodData.filter((p: any) => p.isActive !== false)); } catch (err) { console.error(err); } };
    fetchData();
  }, []);

  useEffect(() => {
      if (showRecords) { const fetchOrders = async () => { setRecordsLoading(true); try { setCloudOrders(await orderService.getAllOrders()); } catch (err) { console.error(err); } finally { setRecordsLoading(false); } }; fetchOrders(); }
  }, [showRecords]);

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

  const handleOpenAddCustomer = () => { setEditingCustomerId(null); setCustomerFormData({ name: '', phone: '', email: '', type: 'Walk-in', loyaltyJoined: false }); setShowCustomerModal(true); };
  const handleOpenEditCustomer = () => { if (!customer) { alert("Please select a customer first to edit."); return; } setEditingCustomerId(customer.id!); setCustomerFormData({ name: customer.name, phone: (customer as any).phone || '', email: (customer as any).email || '', type: (customer as any).type || 'Walk-in', loyaltyJoined: (customer as any).loyaltyJoined || false }); setShowCustomerModal(true); };
  const handleSaveCustomer = async (e: React.FormEvent) => {
      e.preventDefault(); if (!customerFormData.name.trim()) return; setIsSavingCustomer(true);
      try { let payload: Partial<Customer> = { name: customerFormData.name.trim(), phone: customerFormData.phone, email: customerFormData.email, type: customerFormData.type, loyaltyJoined: customerFormData.loyaltyJoined }; if (editingCustomerId) { const updatedCust = await customerService.update(editingCustomerId, payload); dispatch(setCustomer(updatedCust as any)); } else { const newCust = await customerService.create({ ...(payload as Customer), loyaltyPoints: 0, totalSpend: 0, totalPurchases: 0 }); dispatch(setCustomer(newCust as any)); } setShowCustomerModal(false); } catch (error) { alert("Failed to sync customer."); } finally { setIsSavingCustomer(false); }
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

  // ✅ FIXED: Re-added missing search key down handler
  const handleItemSearchKeyDown = (e?: React.KeyboardEvent<HTMLInputElement>) => {
      if ((!e || e.key === 'Enter') && filteredItems.length > 0) {
          onAddItem(filteredItems[0]);
          setItemSearchQuery('');
      }
  };

  const handleAddCustomItem = () => { if (!customItemName || !customItemPrice) return; onAddItem({ id: Date.now(), name: customItemName, price: parseFloat(customItemPrice), stock: 9999, barcode: 'CUSTOM', category: 'Custom', isTaxIncluded: customItemTax, type: 'Non-Stock' }); setCustomItemName(''); setCustomItemPrice(''); };
  const handleAddUnitItem = () => { if (unitCalcTotal <= 0) return alert("Invalid input."); const finalName = ucItemName.trim() !== '' ? `${ucItemName} (${parseFloat(ucQuantity)} ${ucUnitType})` : `Custom (${parseFloat(ucQuantity)} ${ucUnitType})`; onAddItem({ id: Date.now(), name: finalName, price: parseFloat(unitCalcTotal.toFixed(2)), stock: 9999, barcode: 'UNIT-CALC', category: 'Custom', isTaxIncluded: true, type: 'Non-Stock' }); setUcItemName(''); setUcBasePrice(''); setUcUnitSize('1'); setUcQuantity(''); setShowInternalUnitCalc(false); };
  const handleResumeHeld = () => { if (heldSales.length > 0) dispatch(resumeSale(heldSales[heldSales.length - 1].id)); };

  const GridBtn = ({ icon: Icon, label, colorClass, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center py-1.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group active:scale-95">
        <Icon size={16} className={`${colorClass} mb-1 group-hover:scale-110 transition-transform`}/>
        <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{label}</span>
    </button>
  );

  return (
    <div className="bg-transparent px-4 pt-2 shrink-0 flex flex-col justify-end">

      {selectedCartItemId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 mb-2 shadow-inner animate-in fade-in zoom-in-95 duration-200 shrink-0">
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">Item Controls</span>
                <button onClick={onCancelItem} className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"><Trash2 size={12}/> Remove</button>
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

      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm h-[110px] flex flex-col mb-2 shrink-0">
          <div className="flex gap-2 mb-1 shrink-0">
            <button onClick={() => setSidebarTab('recent')} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${sidebarTab === 'recent' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50'}`}>Recent</button>
            <button onClick={() => setSidebarTab('favorites')} className={`flex-1 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${sidebarTab === 'favorites' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50'}`}>Favorites</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {sidebarTab === 'recent' ? (
                recentProducts.map(p => (
                  <div key={p.id} onClick={() => onAddItem(p)} className="flex justify-between items-center p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer group">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 hover:text-blue-500 transition-colors"><Star size={12} fill={p.isFavorite ? "#3b82f6" : "none"} className={p.isFavorite ? "text-blue-500" : ""} /></button>
                          <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); setHiddenRecentIds(prev => [...prev, p.id]); }} className="text-gray-300 hover:text-red-500 p-1"><X size={12}/></button><Plus size={12} className="text-gray-300 group-hover:text-blue-500"/></div>
                  </div>
                ))
              ) : (
                favoriteProducts.map(p => (
                  <div key={p.id} onClick={() => onAddItem(p)} className="flex justify-between items-center p-1.5 hover:bg-blue-50 rounded-lg cursor-pointer group">
                      <div className="flex items-center gap-2 overflow-hidden"><Star size={12} className="text-blue-500 fill-current"/><span className="text-xs font-bold text-gray-700 truncate">{p.name}</span></div>
                      <div className="flex items-center gap-1"><button onClick={(e) => handleToggleFavorite(e, p)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12}/></button><Plus size={12} className="text-gray-300 group-hover:text-blue-500"/></div>
                  </div>
                ))
              )}
          </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-2 shrink-0">
        <GridBtn icon={PauseCircle} label="Hold" colorClass="text-orange-500" onClick={() => dispatch(holdSale())} />
        <GridBtn icon={PlayCircle} label="Resume" colorClass="text-blue-500" onClick={handleResumeHeld} />
        <GridBtn icon={Save} label="Save" colorClass="text-green-500" onClick={() => dispatch(holdSale())} />
        <GridBtn icon={List} label="Records" colorClass="text-purple-500" onClick={() => setShowRecords(true)} />
        <GridBtn icon={Search} label="Search" colorClass="text-blue-600" onClick={() => setShowItemSearch(true)} />
        <GridBtn icon={Package} label="Custom" colorClass="text-pink-500" onClick={() => setShowCustomItemModal(true)} />
        <GridBtn icon={Scale} label="Unit Calc" colorClass="text-purple-600" onClick={() => setShowInternalUnitCalc(true)} />
        <GridBtn icon={RotateCcw} label="Refund" colorClass="text-red-500" onClick={onRefundClick} />
        <GridBtn icon={UserPlus} label="Cust +" colorClass="text-emerald-500" onClick={handleOpenAddCustomer} />
        <GridBtn icon={Edit3} label="Cust Edit" colorClass="text-teal-500" onClick={handleOpenEditCustomer} />
        <GridBtn icon={FileText} label="Reprint" colorClass="text-gray-600" onClick={onReprintClick} />
        <GridBtn icon={Trash2} label="Clear" colorClass="text-red-600" onClick={() => dispatch(clearCart())} />
      </div>

      <button
          onClick={() => items.length > 0 && onCheckout && onCheckout()}
          disabled={items.length === 0}
          className="w-full py-3 bg-blue-600 text-white font-black text-base rounded-xl shadow-[0_8px_15px_-3px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shrink-0"
      >
          <Printer size={18}/> PAY & PRINT
      </button>

      {heldSales.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 shadow-sm shrink-0">
              <span className="text-xs font-black text-yellow-700 flex items-center gap-1"><PauseCircle size={14}/> {heldSales.length} Sales on Hold</span>
              <button onClick={handleResumeHeld} className="text-xs font-bold text-blue-600 hover:underline">Resume Last</button>
          </div>
      )}

      {/* --- ALL MODALS --- */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-blue-600"/> Add Custom Item</h3><button onClick={() => setShowCustomItemModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="p-5 space-y-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label><input type="text" autoFocus value={customItemName} onChange={e=>setCustomItemName(e.target.value)} onFocus={onInputFocus} className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"/></div><div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label><input type="number" value={customItemPrice} onChange={e=>setCustomItemPrice(e.target.value)} onFocus={onInputFocus} className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"/></div><div className="w-1/3"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax</label><button onClick={()=>setCustomItemTax(!customItemTax)} className={`w-full py-3 rounded-xl text-xs font-bold border transition-colors ${customItemTax ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{customItemTax ? 'Tax On' : 'No Tax'}</button></div></div><button onClick={() => { handleAddCustomItem(); setShowCustomItemModal(false); }} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-xl mt-2 active:scale-95 transition-all">Add to Cart</button></div></div></div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"><div className="px-6 py-5 border-b flex justify-between items-center bg-gray-50"><h3 className="font-black text-gray-900 uppercase tracking-tight">{editingCustomerId ? "Update Customer" : "Quick Add Customer"}</h3><button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button></div><form onSubmit={handleSaveCustomer} className="p-8 space-y-5"><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name *</label><input type="text" required autoFocus value={customerFormData.name} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Phone</label><input type="tel" value={customerFormData.phone} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"/></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label><input type="email" value={customerFormData.email} onFocus={onInputFocus} onChange={(e) => setCustomerFormData({...customerFormData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" placeholder="customer@email.com"/></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tier Classification</label><select value={customerFormData.type} onChange={(e) => setCustomerFormData({...customerFormData, type: e.target.value as Customer['type']})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500"><option value="Walk-in">Walk-in</option><option value="Registered">Registered</option><option value="Member">Member</option><option value="Wholesale">Wholesale</option></select></div><div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between"><span className="text-xs font-black text-blue-900">Enroll in Loyalty Program</span><input type="checkbox" checked={customerFormData.loyaltyJoined} onChange={(e) => setCustomerFormData({...customerFormData, loyaltyJoined: e.target.checked})} className="w-5 h-5 text-blue-600 rounded cursor-pointer"/></div><button type="submit" disabled={isSavingCustomer} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{isSavingCustomer ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> {editingCustomerId ? "Save Changes" : "Create & Select"}</>}</button></form></div></div>
      )}

      {showItemSearch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[700px] animate-in fade-in zoom-in-95"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Search size={18} className="text-blue-600"/> Search Item</h3><button onClick={() => {setShowItemSearch(false); setItemSearchQuery('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-1/2 border-r border-gray-100 flex flex-col bg-gray-50"><div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results ({filteredItems.length})</div><div className="flex-1 overflow-y-auto p-2">{filteredItems.length === 0 ? <div className="text-center text-gray-400 py-10">Type to search...</div> :<div className="space-y-2">{filteredItems.map(product => (<button key={product.id} onClick={() => onAddItem(product)} className="w-full flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"><div><div className="font-bold text-gray-800 group-hover:text-blue-700">{product.name}</div><div className="text-xs text-gray-400">SKU: {product.sku || 'N/A'} • {product.stock} in stock</div></div><div className="font-bold text-gray-600 group-hover:text-blue-600">{currency}{Number(product.price).toFixed(2)}</div></button>))}</div>}</div></div><div className="w-1/2 p-5 flex flex-col bg-white"><div className="mb-4"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Search Query</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" autoFocus value={itemSearchQuery} onChange={(e) => setItemSearchQuery(e.target.value)} onKeyDown={handleItemSearchKeyDown} placeholder="Type Name, SKU or Barcode..." className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none text-lg font-bold" /></div></div><div className="flex-1"><VirtualKeyboard layout="full" onKeyPress={handleSearchItemKeyPress} onBackspace={handleSearchItemBackspace} onEnter={() => handleItemSearchKeyDown()} className="h-full border-none shadow-none bg-gray-50" /></div></div></div></div></div>
      )}

      {showRecords && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={18} className="text-blue-600"/> Sales Records</h3><button onClick={() => {setShowRecords(false); setRecordSearch('');}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-2/3 flex flex-col border-r border-gray-100"><div className="p-4 border-b border-gray-100 bg-white"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Search Sale ID (e.g. 24)" value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold" /></div></div><div className="flex-1 overflow-y-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] sticky top-0"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{recordsLoading ? (<tr><td colSpan={5} className="text-center py-8 text-gray-400"><Loader2 className="animate-spin inline mr-2"/> Loading Records...</td></tr>) : filteredHistory.length === 0 ? (<tr><td colSpan={5} className="text-center py-8 text-gray-400">No records found.</td></tr>) : (filteredHistory.map(order => (<tr key={order.id} className="hover:bg-blue-50 transition-colors group"><td className="px-4 py-3 font-bold text-gray-700">#{order.id}</td><td className="px-4 py-3 text-gray-500 flex items-center gap-1"><Calendar size={12}/> {new Date(order.created_at || order.timestamp).toLocaleDateString()}</td><td className="px-4 py-3 text-gray-600">{(order.items || []).length} items</td><td className="px-4 py-3 text-right font-bold text-gray-800">{currency}{Number(order.total || order.total_amount).toFixed(2)}</td><td className="px-4 py-3 flex justify-center gap-2"><button onClick={() => onReprintClick && onReprintClick()} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Reprint"><Printer size={14}/></button></td></tr>)))}</tbody></table></div></div><div className="w-1/3 bg-gray-50 p-4"><div className="h-full flex flex-col justify-end"><VirtualKeyboard layout="numeric" onKeyPress={handleRecordKeyPress} onBackspace={handleRecordBackspace} onEnter={() => {}} className="h-full border-none shadow-none bg-transparent" /></div></div></div></div></div>
      )}

      {showInternalUnitCalc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[700px]"><div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18} className="text-purple-600"/> Unit Calculator</h3><button onClick={() => setShowInternalUnitCalc(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div><div className="flex flex-1 overflow-hidden"><div className="w-1/2 p-5 border-r border-gray-100 overflow-y-auto flex flex-col gap-4"><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Unit Type</label><div className="flex bg-gray-100 p-1 rounded-lg">{['g', 'kg', 'ml', 'L', 'pcs'].map(u => (<button key={u} onClick={() => setUcUnitType(u)} className={`flex-1 py-1 text-sm font-bold rounded-md transition-all ${ucUnitType === u ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{u}</button>))}</div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Item Name</label><input type="text" readOnly placeholder="e.g. Loose Rice" value={ucItemName} onClick={() => setActiveUcField('name')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'name' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 mb-1">Base Price ($)</label><input type="text" readOnly placeholder="0.00" value={ucBasePrice} onClick={() => setActiveUcField('price')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'price' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Unit Size ({ucUnitType})</label><input type="text" readOnly placeholder="1" value={ucUnitSize} onClick={() => setActiveUcField('size')} className={`w-full px-3 py-2 border rounded-lg font-bold outline-none cursor-pointer transition-all ${activeUcField === 'size' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">Customer Quantity ({ucUnitType})</label><input type="text" readOnly placeholder="0" value={ucQuantity} onClick={() => setActiveUcField('qty')} className={`w-full px-3 py-2 border rounded-lg font-bold text-lg outline-none cursor-pointer transition-all ${activeUcField === 'qty' ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-300 bg-gray-50'}`} /></div><div className="bg-purple-50 p-3 rounded-lg flex justify-between items-center border border-purple-100 mt-auto"><div className="text-xs text-purple-600 font-medium">Calculated Cost</div><div className="text-xl font-black text-purple-800">{currency}{unitCalcTotal.toFixed(2)}</div></div><button onClick={handleAddUnitItem} disabled={unitCalcTotal <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Plus size={18} /> Add Calculated Item</button></div><div className="w-1/2 bg-gray-50 p-4 border-l border-gray-200"><div className="h-full flex flex-col justify-end"><VirtualKeyboard layout={activeUcField === 'name' ? 'full' : 'numeric'} onKeyPress={handleUcKeyPress} onBackspace={handleUcBackspace} onEnter={handleAddUnitItem} className="h-full border-none shadow-none bg-transparent" /></div></div></div></div></div>
      )}

    </div>
  );
};
export default CartPanel;