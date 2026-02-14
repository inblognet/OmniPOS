import React, { useEffect, useState } from 'react';
import {
  CheckCircle, ShoppingBag, Printer, Search,
  RefreshCcw, AlertTriangle, X, CornerUpLeft,
  Eye, Download
} from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';
import { useCurrency } from '../../hooks/useCurrency';
import { orderService, Order, OrderItem } from '../../services/orderService'; // ✅ Imported OrderItem

const OrdersScreen: React.FC = () => {
  const currency = useCurrency();

  // --- STATE ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState<string>('');

  // Modal & Selection State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]); // ✅ New State
  const [itemsLoading, setItemsLoading] = useState(false); // ✅ New State

  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

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
    if (selectedOrder) {
      const loadItems = async () => {
        try {
          setItemsLoading(true);
          // ✅ API Call to get specific products for this order
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
      setSelectedOrderItems([]); // Clear on close
    }
  }, [selectedOrder]);

  const filteredOrders = orders.filter(o =>
    o.id.toString().includes(searchId) ||
    (o.customer_name?.toLowerCase() || '').includes(searchId.toLowerCase())
  );

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Stub for processing returns (will connect to backend later)
  const handleProcessReturn = async (order: Order, item: OrderItem, qty: number, type: string) => {
     alert(`Feature coming next: Process ${type} for ${qty} x ${item.name}`);
  };

  const handleFullRefund = async (order: Order) => {
    if(!confirm("⚠️ WARNING: Mark ENTIRE order as refunded?")) return;
    try {
      alert("✅ Cloud Sync: Full refund processed.");
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert("Error processing full refund.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {printingOrder && <ReceiptTemplate order={printingOrder} />}

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
          <p className="text-gray-500">Cloud-synced management</p>
        </div>

        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
           <input
              type="text"
              placeholder="Search ID or Customer..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full outline-none"
           />
        </div>
      </div>

      {/* --- ORDER LIST --- */}
      <div className="grid gap-4">
        {loading ? (
          <div className="bg-white p-12 text-center border rounded-xl">
            <RefreshCcw className="mx-auto h-12 w-12 text-blue-400 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center border rounded-xl">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900">No orders found</h3>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-xl shadow-sm border p-4 transition-shadow ${order.status === 'refunded' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-gray-500">#{order.id}</span>
                  <div className="flex flex-col text-sm">
                      <span className="font-bold">{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                    {order.status === 'refunded' ? (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CornerUpLeft size={12}/> REFUNDED
                        </span>
                    ) : (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200 flex items-center gap-1">
                          <CheckCircle size={14} /> Synced
                        </span>
                    )}

                    <div className="text-right">
                        <p className={`font-bold ${order.status === 'refunded' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {currency}{Number(order.total_amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 uppercase">{order.payment_method}</p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setSelectedOrder(order)} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">Manage</button>
                        <button onClick={() => handlePrint(order)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><Printer size={20} /></button>
                    </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MANAGEMENT MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Order #{selectedOrder.id}</h2>
                        <p className="text-sm text-gray-500">Cloud Data</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Summary Card */}
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                            <p className="font-bold capitalize text-gray-800">{selectedOrder.status}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</p>
                             <p className="font-bold text-lg text-blue-600">{currency}{Number(selectedOrder.total_amount).toFixed(2)}</p>
                        </div>
                    </div>

                    {/* ✅ ITEMIZED TABLE (Fetching from Cloud) */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                <tr>
                                    <th className="p-3 font-medium">Product</th>
                                    <th className="p-3 font-medium text-center">Qty</th>
                                    <th className="p-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {itemsLoading ? (
                                  <tr><td colSpan={3} className="p-8 text-center animate-pulse text-gray-500">Loading items...</td></tr>
                                ) : selectedOrderItems.length === 0 ? (
                                  <tr><td colSpan={3} className="p-8 text-center text-gray-400">No items found for this order.</td></tr>
                                ) : (
                                  selectedOrderItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-3">
                                        <div className="font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">{currency}{Number(item.price).toFixed(2)}</div>
                                      </td>
                                      <td className="p-3 text-center font-bold text-gray-600">{item.quantity}</td>
                                      <td className="p-3 text-right">
                                        {/* Placeholder button for next step */}
                                        <button
                                          className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-100"
                                          onClick={() => handleProcessReturn(selectedOrder, item, 1, 'refund')}
                                        >
                                          Refund 1
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex justify-between items-center rounded-b-xl">
                    <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">Close</button>
                    {selectedOrder.status !== 'refunded' && (
                        <button onClick={() => handleFullRefund(selectedOrder)} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">
                            <AlertTriangle size={16} /> Full Refund
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrdersScreen;