import React, { useEffect, useState } from 'react';
import {
  CheckCircle, ShoppingBag, Printer, Search,
  RefreshCcw, CornerUpLeft, X, AlertTriangle
} from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';
import { useCurrency } from '../../hooks/useCurrency';
import { orderService, Order, OrderItem } from '../../services/orderService';

const OrdersScreen: React.FC = () => {
  const currency = useCurrency();

  // --- STATE ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState<string>('');

  // Modal & Selection State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Refund State
  const [refundSelectedItems, setRefundSelectedItems] = useState<Set<number>>(new Set());
  const [isRefunding, setIsRefunding] = useState(false);

  const [printingOrder, setPrintingOrder] = useState<any>(null);

  // --- FETCH ALL ORDERS ---
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error("Cloud Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // --- FETCH ITEMS WHEN MODAL OPENS ---
  useEffect(() => {
    // Reset refund selection every time modal opens/changes
    setRefundSelectedItems(new Set());

    if (selectedOrder) {
      const loadItems = async () => {
        try {
          setItemsLoading(true);
          const items = await orderService.getOrderItems(selectedOrder.id);
          setSelectedOrderItems(items);
        } catch (error) {
          console.error("Failed to load items", error);
        } finally {
          setItemsLoading(false);
        }
      };
      loadItems();
    } else {
      setSelectedOrderItems([]);
    }
  }, [selectedOrder]);

  const filteredOrders = orders.filter(o =>
    o.id.toString().includes(searchId) ||
    (o.customer_name?.toLowerCase() || '').includes(searchId.toLowerCase())
  );

  // --- PRINT LOGIC ---
  const handlePrint = async (order: Order) => {
    try {
      const items = await orderService.getOrderItems(order.id);
      const fullOrderToPrint = { ...order, items: items };

      setPrintingOrder(fullOrderToPrint);
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintingOrder(null), 1000);
      }, 200);

    } catch (error) {
      console.error("Failed to prepare order for printing", error);
      alert("Could not load receipt details. Please check your connection.");
    }
  };

  // --- ✅ REFUND LOGIC ---
  const toggleRefundItem = (index: number) => {
    const newSelection = new Set(refundSelectedItems);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setRefundSelectedItems(newSelection);
  };

  const handleRefund = async (type: 'full' | 'partial') => {
    if (!selectedOrder) return;

    const confirmMessage = type === 'full'
        ? "⚠️ Are you sure you want to issue a FULL refund for this order? This action cannot be undone."
        : `⚠️ Are you sure you want to refund the ${refundSelectedItems.size} selected item(s)?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsRefunding(true);

      // Determine payload for backend
      const payload = type === 'full'
        ? { type: 'full' as const } // type assertion to keep TS happy
        : { type: 'partial' as const, items: Array.from(refundSelectedItems).map(idx => selectedOrderItems[idx]) };

      // ✅ Uses the new orderService method instead of raw axios
      await orderService.refundOrder(selectedOrder.id, payload);

      alert(`✅ ${type === 'full' ? 'Full' : 'Partial'} refund processed successfully.`);

      // Refresh Data
      setSelectedOrder(null);
      fetchOrders();

    } catch (error) {
      console.error("Refund Error:", error);
      alert("❌ Failed to process refund. Please check your network connection.");
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {printingOrder && <ReceiptTemplate order={printingOrder} />}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Cloud-synced database records
          </p>
        </div>

        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
           <input
              type="text"
              placeholder="Search ID or Customer..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all"
           />
        </div>
      </div>

      {/* --- ORDER LIST --- */}
      <div className="grid gap-4">
        {loading ? (
          <div className="bg-white p-12 text-center border rounded-xl shadow-sm">
            <RefreshCcw className="mx-auto h-12 w-12 text-blue-400 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Fetching secure transaction data...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center border rounded-xl shadow-sm">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900 font-bold">No transactions found</h3>
            <p className="text-gray-500 text-sm">New sales will appear here instantly after sync.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all ${order.status === 'refunded' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-3 rounded-lg font-mono font-bold text-gray-600">
                    #{order.id}
                  </div>
                  <div className="flex flex-col text-sm">
                      <span className="font-bold text-gray-800">{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                    {order.status === 'refunded' ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-red-200">
                          <CornerUpLeft size={12}/> REFUNDED
                        </span>
                    ) : (
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                          <CheckCircle size={14} /> SECURE SYNC
                        </span>
                    )}

                    <div className="text-right min-w-[100px]">
                        <p className={`font-black text-lg ${order.status === 'refunded' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {currency}{Number(order.total_amount).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{order.payment_method}</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-colors"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Printer size={20} />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MANAGEMENT MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Order Details</h2>
                        <p className="text-sm text-blue-600 font-bold">Transaction Reference: #{selectedOrder.id}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="flex justify-between p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Customer</p>
                            <p className="font-bold text-gray-800">{selectedOrder.customer_name || 'Guest Checkout'}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Net Amount</p>
                             <p className={`font-black text-2xl ${selectedOrder.status === 'refunded' ? 'line-through text-red-500' : 'text-blue-700'}`}>
                                 {currency}{Number(selectedOrder.total_amount).toFixed(2)}
                             </p>
                        </div>
                    </div>

                    {/* ✅ MODIFIED TABLE FOR REFUND SELECTION */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 border-b border-gray-200 text-gray-600">
                                <tr>
                                    {selectedOrder.status !== 'refunded' && (
                                        <th className="p-4 font-bold uppercase text-[11px] w-12 text-center">Ref</th>
                                    )}
                                    <th className="p-4 font-bold uppercase text-[11px]">Product Item</th>
                                    <th className="p-4 font-bold uppercase text-[11px] text-center">Qty</th>
                                    <th className="p-4 font-bold uppercase text-[11px] text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itemsLoading ? (
                                  <tr><td colSpan={4} className="p-12 text-center animate-pulse text-gray-400 font-medium">Retrieving itemized records...</td></tr>
                                ) : selectedOrderItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      {/* ✅ ITEM CHECKBOX */}
                                      {selectedOrder.status !== 'refunded' && (
                                          <td className="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                                checked={refundSelectedItems.has(idx)}
                                                onChange={() => toggleRefundItem(idx)}
                                            />
                                          </td>
                                      )}
                                      <td className="p-4">
                                        <div className="font-bold text-gray-900">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">SKU Ref: {item.productId}</div>
                                      </td>
                                      <td className="p-4 text-center font-black text-gray-700 bg-gray-50/50">{item.quantity}</td>
                                      <td className="p-4 text-right font-bold text-gray-900">{currency}{Number(item.price).toFixed(2)}</td>
                                    </tr>
                                  ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-900 font-bold text-sm uppercase tracking-wider">Cancel View</button>

                    <div className="flex flex-wrap gap-3 justify-end w-full sm:w-auto">
                      {/* ✅ REFUND BUTTONS (Hidden if already refunded) */}
                      {selectedOrder.status !== 'refunded' && (
                          <>
                              {refundSelectedItems.size > 0 && (
                                <button
                                    onClick={() => handleRefund('partial')}
                                    disabled={isRefunding}
                                    className="flex items-center gap-2 bg-orange-100 text-orange-700 border border-orange-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-200 transition-all disabled:opacity-50"
                                >
                                    <AlertTriangle size={18} /> Refund Selected
                                </button>
                              )}
                              <button
                                  onClick={() => handleRefund('full')}
                                  disabled={isRefunding}
                                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg transition-all disabled:opacity-50"
                              >
                                  <CornerUpLeft size={18} /> Full Refund
                              </button>
                          </>
                      )}

                      <button
                         onClick={() => handlePrint(selectedOrder)}
                         disabled={itemsLoading}
                         className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black shadow-lg transition-all disabled:opacity-50"
                      >
                          <Printer size={18} /> Print Copy
                      </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrdersScreen;