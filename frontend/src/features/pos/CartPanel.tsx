import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  clearCart,
  setCustomer, removeCustomer, resumeSale, holdSale,
  addToCart
} from '../../store/cartSlice';
import {
  Printer, Search, X,
  Trash2, Save, RotateCcw,
  AlertTriangle, List, Scale, Plus, Award, Calendar, User, Calculator, Loader2
} from 'lucide-react';
import { db, Order, Product } from '../../db/db'; // Keep db for Settings only
import { useLiveQuery } from 'dexie-react-hooks';
import { ReceiptTemplate } from '../orders/ReceiptTemplate';
import { useCurrency } from '../../hooks/useCurrency';
import VirtualKeyboard from '../../components/VirtualKeyboard';

// ✅ IMPORT CLOUD SERVICES
import { customerService, Customer } from '../../services/customerService';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';

interface CartPanelProps {
    onCancelItem: () => void;
    onInputFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onCheckout?: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ onCancelItem, onInputFocus, onCheckout }) => {
  const dispatch = useAppDispatch();
  const { items, customer, heldSales } = useAppSelector((state) => state.cart);
  const currency = useCurrency();

  // --- Local State ---
  const [discount, setDiscount] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [calcInput, setCalcInput] = useState('0');

  // --- UI Toggles ---
  const [customerSearch, setCustomerSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // --- Modals ---
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [showRecords, setShowRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');

  // --- Unit Calculator ---
  const [showInternalUnitCalc, setShowInternalUnitCalc] = useState(false);
  const [ucItemName, setUcItemName] = useState('');
  const [ucBasePrice, setUcBasePrice] = useState<string>('');
  const [ucUnitSize, setUcUnitSize] = useState<string>('1');
  const [ucQuantity, setUcQuantity] = useState<string>('');
  const [ucUnitType, setUcUnitType] = useState<string>('g');
  const [activeUcField, setActiveUcField] = useState<'name' | 'price' | 'size' | 'qty'>('name');

  // --- Global Settings (Local) ---
  const settings = useLiveQuery(() => db.settings.get(1));
  const taxRate = settings?.taxRate ?? 0.08;
  const redemptionValue = settings?.loyaltyRedemptionRate || 1;

  // --- ✅ CLOUD DATA STATE ---
  const [cloudCustomers, setCloudCustomers] = useState<Customer[]>([]);
  const [cloudProducts, setCloudProducts] = useState<any[]>([]);
  const [cloudOrders, setCloudOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false); // New state for records modal

  // --- ✅ INITIAL FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custData, prodData] = await Promise.all([
            customerService.getAll(),
            productService.getAll()
        ]);
        setCloudCustomers(custData);
        setCloudProducts(prodData.filter((p: any) => p.isActive !== false));
      } catch (err) {
        console.error("Error syncing cart panel data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lastOrder]);

  // --- ✅ FETCH RECORDS WHEN MODAL OPENS ---
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
  }, [showRecords, lastOrder]); // Reload when modal opens or sale happens

  // --- ✅ FILTERING LOGIC ---

  const filteredCustomers = cloudCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  ).slice(0, 5);

  const filteredItems = cloudProducts.filter(p =>
      p.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(itemSearchQuery)) ||
      (p.sku && p.sku.includes(itemSearchQuery))
  ).slice(0, 15);

  const filteredHistory = cloudOrders.filter(order =>
      order.id.toString().includes(recordSearch)
  );

  // --- Mock Data ---
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 60000);
      return () => clearInterval(timer);
  }, []);

  const saleNumber = `#${String(cloudOrders.length + 1).padStart(5, '0')}`;
  const cashierName = "Admin";

  // ==========================================
  // 🧮 MATH LOGIC
  // ==========================================
  let calculatedTax = 0;
  let totalExcludingTax = 0;
  let finalPayable = 0;

  items.forEach(item => {
      const itemPrice = item.price - (item.discount || 0);
      const lineTotal = itemPrice * item.quantity;

      if (item.isTaxIncluded) {
          const taxComponent = lineTotal - (lineTotal / (1 + taxRate));
          calculatedTax += taxComponent;
          totalExcludingTax += (lineTotal - taxComponent);
          finalPayable += lineTotal;
      } else {
          const taxComponent = lineTotal * taxRate;
          calculatedTax += taxComponent;
          totalExcludingTax += lineTotal;
          finalPayable += lineTotal + taxComponent;
      }
  });

  const effectiveDiscount = Math.min(discount, finalPayable);
  const finalTotalBeforePoints = Math.max(0, finalPayable - effectiveDiscount);

  const maxRedeemablePoints = customer
    ? Math.min(customer.loyaltyPoints || 0, Math.floor(finalTotalBeforePoints / redemptionValue))
    : 0;

  const actualPointsRedeemed = Math.min(pointsToRedeem, maxRedeemablePoints);
  const pointsMonetaryValue = actualPointsRedeemed * redemptionValue;
  const finalTotal = Math.max(0, finalTotalBeforePoints - pointsMonetaryValue);

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

      if (!basePrice || !singleUnitSize || !quantity || basePrice <= 0 || singleUnitSize <= 0 || quantity <= 0) {
          return 0;
      }

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
      const updateNum = (prev: string) => {
          if (key === '.' && prev.includes('.')) return prev;
          return prev + key;
      };
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
  const handleAddUnitItem = () => {
      if (unitCalcTotal <= 0) return alert("Invalid input.");
      const finalName = ucItemName.trim() !== '' ? `${ucItemName} (${parseFloat(ucQuantity)} ${ucUnitType})` : `Custom (${parseFloat(ucQuantity)} ${ucUnitType})`;
      dispatch(addToCart({
          id: Date.now(),
          name: finalName,
          price: parseFloat(unitCalcTotal.toFixed(2)),
          stock: 9999,
          barcode: 'UNIT-CALC',
          category: 'Custom',
          isTaxIncluded: true,
          quantity: 1,
          unit: ucUnitType,
          unitValue: parseFloat(ucQuantity),
          discount: 0,
          note: ''
      }));
      setUcItemName(''); setUcBasePrice(''); setUcUnitSize('1'); setUcQuantity(''); setShowInternalUnitCalc(false);
  };

  const handleAddItem = (product: any) => {
      if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) return alert("Out of Stock");
      dispatch(addToCart({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          stock: Number(product.stock),
          barcode: product.barcode,
          category: product.category,
          isTaxIncluded: product.isTaxIncluded,
          quantity: 1,
          discount: 0,
          note: ''
      }));
  };

  const handleItemSearchKeyDown = (e?: React.KeyboardEvent) => {
      if ((!e || e.key === 'Enter') && filteredItems.length > 0) handleAddItem(filteredItems[0]);
  };

  const handleReprintOld = (order: Order) => {
      setLastOrder(order);
      setTimeout(() => window.print(), 100);
  };

  const handleDeleteOrder = async (id: number) => {
      alert("⚠️ Deleting cloud records is restricted in POS mode.");
  };

  const handleCalcPress = (key: string) => {
    if (key === 'C') setCalcInput('0');
    else if (key === '⌫') setCalcInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    else setCalcInput(prev => prev === '0' ? key : prev + key);
  };

  const CalcButton = ({ label, secondary }: { label: string, secondary?: boolean }) => (
    <button onClick={() => handleCalcPress(label)} className={`h-10 rounded-lg font-bold text-lg transition-colors ${secondary ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white border border-gray-200 text-gray-800 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm'}`}>{label}</button>
  );

  const ControlTile = ({ icon: Icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group">
        <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center mb-1 group-hover:scale-110 transition-transform`}>
            <Icon size={14} className="text-white"/>
        </div>
        <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{label}</span>
    </button>
  );

  const handleResumeHeld = () => {
      if (heldSales.length > 0) dispatch(resumeSale(heldSales[heldSales.length - 1].id));
  };

  // --- Global Listeners ---
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchWrapperRef]);

  // ==========================================
  // 🖥️ RENDER
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">

      {lastOrder && <ReceiptTemplate order={lastOrder} />}

      {/* 1. Header */}
      <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
        <div><h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sale {saleNumber}</h2><div className="text-lg font-black text-gray-800">{currentTime}</div></div>
        <div className="text-right"><div className="flex items-center justify-end gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online</div><div className="text-[10px] text-gray-400 font-mono mt-1">{cashierName}</div></div>
      </div>

      {/* 2. Customer Search */}
      <div className="p-3 bg-white border-b border-gray-100 relative" ref={searchWrapperRef}>
        {customer ? (
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">{customer.name.charAt(0)}</div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm leading-tight">{customer.name}</p>
                        <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                            <Award size={10} /> {customer.loyaltyPoints || 0} Pts
                        </p>
                    </div>
                </div>
                <button onClick={() => {dispatch(removeCustomer()); setPointsToRedeem(0);}}><X size={16} className="text-gray-400 hover:text-red-500"/></button>
            </div>
        ) : (
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    type="text"
                    placeholder="Add Customer..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={customerSearch}
                    onChange={(e) => {setCustomerSearch(e.target.value); setShowResults(true);}}
                    onFocus={onInputFocus}
                />
                {showResults && customerSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-40 overflow-y-auto">
                        {loading ? <div className="p-3 text-xs text-center text-gray-400">Loading...</div> :
                         filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                                <button
                                    key={c.id}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center group border-b border-gray-50 last:border-0"
                                    onClick={() => {
                                        dispatch(setCustomer({
                                            id: c.id!,
                                            name: c.name,
                                            loyaltyPoints: c.loyaltyPoints || 0,
                                        } as any));
                                        setCustomerSearch('');
                                        setShowResults(false);
                                    }}
                                >
                                    <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                        {c.loyaltyPoints || 0} pts
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="p-3 text-center text-xs text-gray-400">No customers found.</div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* 3. Main Body */}
      <div className="flex-1 p-3 bg-gray-50 overflow-y-auto">

        {/* Totals Box */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3 space-y-2">
            <div className="flex justify-between text-gray-500 text-xs"><span>Subtotal</span><span>{currency}{totalExcludingTax.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500 text-xs"><span>Tax ({(taxRate*100).toFixed(0)}%)</span><span>{currency}{calculatedTax.toFixed(2)}</span></div>
            <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                <span>Discount</span>
                <input type="number" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value)||0)} className="w-20 text-right border-b border-gray-300 focus:border-blue-500 outline-none" placeholder="0.00"/>
            </div>
            {pointsToRedeem > 0 && (
                <div className="flex justify-between font-bold text-purple-700 text-sm">
                    <span>Points Redeemed</span>
                    <span>-{currency}{pointsMonetaryValue.toFixed(2)}</span>
                </div>
            )}
            <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between items-end">
                    <span className="text-gray-600 font-bold">TOTAL</span>
                    <span className="text-2xl font-black text-gray-900">{currency}{finalTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Operation Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
            <ControlTile icon={Trash2} label="Cancel Sale" color="bg-red-500" onClick={() => dispatch(clearCart())} />
            <ControlTile icon={RotateCcw} label="Cancel Item" color="bg-orange-500" onClick={onCancelItem} />
            <ControlTile icon={Search} label="Search Item" color="bg-blue-500" onClick={() => setShowItemSearch(true)} />
            <ControlTile icon={Scale} label="Unit Calc" color="bg-purple-500" onClick={() => setShowInternalUnitCalc(true)} />
        </div>

        {/* Calculator */}
        <div className="bg-gray-100 rounded-xl p-2 mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-2 mb-2 text-right font-mono text-xl font-bold text-gray-800">{calcInput}</div>
              <div className="grid grid-cols-4 gap-1.5">
                  <CalcButton label="7" /> <CalcButton label="8" /> <CalcButton label="9" /> <CalcButton label="⌫" secondary />
                  <CalcButton label="4" /> <CalcButton label="5" /> <CalcButton label="6" /> <CalcButton label="+" secondary />
                  <CalcButton label="1" /> <CalcButton label="2" /> <CalcButton label="3" /> <CalcButton label="-" secondary />
                  <button onClick={() => handleCalcPress('0')} className="col-span-2 h-10 bg-white border border-gray-200 rounded-lg font-bold text-lg hover:bg-blue-50 hover:text-blue-600 shadow-sm">0</button>
                  <CalcButton label="." /> <CalcButton label="=" secondary />
              </div>
        </div>

        {/* Bottom Actions */}
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

        {/* Pay Button */}
        <button
            onClick={() => items.length > 0 && onCheckout && onCheckout()}
            disabled={items.length === 0}
            className="w-full mt-3 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={14}/></button>
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