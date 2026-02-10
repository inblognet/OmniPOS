import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Order, OrderItem } from '../../db/db';
import {
  CheckCircle, Clock, ShoppingBag, Printer, Search,
  RefreshCcw, AlertTriangle, X, ShieldCheck, CornerUpLeft
} from 'lucide-react';
import { ReceiptTemplate } from './ReceiptTemplate';
import { useCurrency } from '../../hooks/useCurrency';

const OrdersScreen: React.FC = () => {
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Search State
  const [searchId, setSearchId] = useState<string>('');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const currency = useCurrency();

  // Fetch orders (filtered by search if active)
  const orders = useLiveQuery(() => {
    let collection = db.orders.orderBy('timestamp').reverse();
    if (searchId) {
      // Simple filtering: Check if ID string starts with search term
      return collection.filter(o => o.id?.toString().includes(searchId) || false).toArray();
    }
    return collection.toArray();
  }, [searchId]);

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // --- LOGIC: Process Return/Refund/Warranty ---
  const handleProcessReturn = async (order: Order, item: OrderItem, qtyToReturn: number, type: 'refund' | 'warranty') => {
    if (qtyToReturn <= 0) return;

    // Calculate value
    const refundValue = type === 'refund' ? (item.price * qtyToReturn) : 0;

    const confirmMsg = type === 'refund'
      ? `Refund ${currency}${refundValue.toFixed(2)} and return ${qtyToReturn} items to stock?`
      : `Process Warranty Claim for ${qtyToReturn} items? \n(Item will be marked broken and NOT returned to stock)`;

    if (!confirm(confirmMsg)) return;

    try {
      // ✅ TRANSACTION: Ensures both Order and Product Stock are updated together
      await db.transaction('rw', db.products, db.orders, async () => {

        // 1. STOCK UPDATE (Corrected Logic)
        // Only increase stock if it is a standard REFUND.
        // Warranty items are assumed broken and do not go back to inventory.
        if (type === 'refund') {
            const product = await db.products.get(item.productId);
            if (product) {
              const newStock = (product.stock || 0) + qtyToReturn;
              await db.products.update(item.productId, {
                stock: newStock
              });
              console.log(`Stock updated for Product #${item.productId}: ${product.stock} -> ${newStock}`);
            } else {
                console.warn("Product not found in database, skipping stock update.");
            }
        }

        // 2. ORDER ITEM STATUS UPDATE
        const updatedItems = order.items.map(i => {
          if (i.productId === item.productId) {
            return {
              ...i,
              returnedQuantity: (i.returnedQuantity || 0) + qtyToReturn,
              returnReason: type
            };
          }
          return i;
        });

        // 3. ORDER FINANCIALS UPDATE
        const newRefundedAmount = (order.refundedAmount || 0) + refundValue;

        // Check if fully returned
        const allReturned = updatedItems.every(i => (i.returnedQuantity || 0) >= i.quantity);
        const newStatus = allReturned ? 'refunded' : order.status;

        await db.orders.update(order.id!, {
          items: updatedItems,
          refundedAmount: newRefundedAmount,
          status: newStatus
        });
      });

      alert(`✅ Success! Processed ${type}.`);
      setSelectedOrder(null); // Close modal to refresh view
    } catch (err) {
      console.error("Return Transaction Failed:", err);
      alert("Failed to process return. Check console for details.");
    }
  };

  const handleFullRefund = async (order: Order) => {
      if(!confirm("⚠️ WARNING: This will mark the ENTIRE order as refunded, restore ALL items to stock, and deduct revenue. Continue?")) return;

      try {
        await db.transaction('rw', db.products, db.orders, async () => {
            // Restore stock for all items
            for(const item of order.items) {
                const remainingQty = item.quantity - (item.returnedQuantity || 0);
                if(remainingQty > 0) {
                    const product = await db.products.get(item.productId);
                    if(product) {
                        await db.products.update(item.productId, { stock: product.stock + remainingQty });
                    }
                }
            }

            // Mark items as returned
            const updatedItems = order.items.map(i => ({
                ...i,
                returnedQuantity: i.quantity,
                returnReason: 'refund' as const
            }));

            await db.orders.update(order.id!, {
                items: updatedItems,
                status: 'refunded',
                refundedAmount: order.total // Full refund means total amount is returned
            });
        });
        alert("Full refund processed successfully.");
        setSelectedOrder(null);
      } catch (err) {
          console.error(err);
          alert("Error processing full refund");
      }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden Receipt Component */}
      {printingOrder && <ReceiptTemplate order={printingOrder} />}

      {/* --- Header & Search --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
          <p className="text-gray-500">Manage orders, refunds, and warranty claims</p>
        </div>

        <div className="relative w-full md:w-64">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
           </div>
           <input
              type="text"
              placeholder="Search Order ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>
      </div>

      {/* --- Order List --- */}
      <div className="grid gap-4">
        {!orders || orders.length === 0 ? (
          <div className="bg-white p-12 rounded-xl text-center border border-gray-200">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
            <p className="text-gray-500">Try a different search ID or make a sale.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${order.status === 'refunded' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <div className="px-6 py-4 flex flex-wrap justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-gray-500">#{order.id}</span>
                  <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Badges */}
                    {order.status === 'refunded' ? (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                             <CornerUpLeft size={12}/> REFUNDED
                          </span>
                    ) : (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                          order.status === 'synced' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {order.status === 'synced' ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {order.status === 'synced' ? 'Synced' : 'Pending'}
                        </div>
                    )}

                    {/* Total & Refund Display */}
                    <div className="text-right">
                        <p className={`font-bold text-gray-800 ${order.status === 'refunded' ? 'line-through text-gray-400' : ''}`}>
                            {currency}{order.total.toFixed(2)}
                        </p>

                        {/* ✅ Show Refund Amount in Red if exists */}
                        {order.refundedAmount && order.refundedAmount > 0 ? (
                            <p className="text-xs font-bold text-red-600">
                                -{currency}{order.refundedAmount.toFixed(2)}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 uppercase">{order.paymentMethod || 'Cash'}</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                        >
                            Manage
                        </button>
                        <button
                            onClick={() => handlePrint(order)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Print Receipt"
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

      {/* --- ORDER DETAILS / REFUND MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Manage Order #{selectedOrder.id}</h2>
                        <p className="text-sm text-gray-500">Process refunds, returns, or warranty claims</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Order Summary */}
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                            <p className="font-bold capitalize text-gray-800">{selectedOrder.status}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Payment</p>
                            <p className="font-bold text-gray-800">{selectedOrder.paymentMethod || 'Cash'}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</p>
                             <p className="font-bold text-lg text-blue-600">{currency}{selectedOrder.total.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Refunded Amount Alert */}
                    {selectedOrder.refundedAmount && selectedOrder.refundedAmount > 0 && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-100">
                            <CornerUpLeft size={16}/>
                            Total Refunded so far: {currency}{selectedOrder.refundedAmount.toFixed(2)}
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-medium text-gray-600">Product</th>
                                    <th className="p-3 font-medium text-gray-600 text-center">Sold</th>
                                    <th className="p-3 font-medium text-gray-600 text-center">Returned</th>
                                    <th className="p-3 font-medium text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedOrder.items.map((item, idx) => {
                                    const availableToReturn = item.quantity - (item.returnedQuantity || 0);
                                    return (
                                        // ✅ UPDATED: Removed 'hover:bg-gray-50', added ring/outline effect
                                        <tr key={idx} className="hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-gray-300 transition-all">
                                            <td className="p-3">
                                                {/* ✅ UPDATED: Text style matches QTY/Sold column (inherits color) */}
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-xs opacity-75">{currency}{item.price.toFixed(2)} each</div>
                                            </td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-center font-bold text-red-600">
                                                {item.returnedQuantity || '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                {availableToReturn > 0 ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleProcessReturn(selectedOrder, item, 1, 'refund')}
                                                            className="flex items-center gap-1 px-3 py-1 bg-white text-red-600 rounded border border-red-200 hover:bg-red-50 text-xs font-medium transition-colors shadow-sm"
                                                            title="Refund Money & Return to Stock"
                                                        >
                                                            <RefreshCcw size={12} /> Refund 1
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcessReturn(selectedOrder, item, 1, 'warranty')}
                                                            className="flex items-center gap-1 px-3 py-1 bg-white text-orange-600 rounded border border-orange-200 hover:bg-orange-50 text-xs font-medium transition-colors shadow-sm"
                                                            title="Warranty Claim (Stock UNCHANGED)"
                                                        >
                                                            <ShieldCheck size={12} /> Claim 1
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Fully Returned</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
                    <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 font-medium text-sm">
                        Close
                    </button>
                    {selectedOrder.status !== 'refunded' && (
                        <button
                            onClick={() => handleFullRefund(selectedOrder)}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-bold"
                        >
                            <AlertTriangle size={16} />
                            Full Refund (All Items)
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