import React, { useState } from 'react';
import { X, Search, RotateCcw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import { orderService } from '../../services/orderService';

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRefundComplete: (refundOrder: any) => void;
}

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, onRefundComplete }) => {
    const currency = useCurrency();

    const [searchId, setSearchId] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<any | null>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]); // Array of item indexes
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    // 1. Search for Order
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchId) return;

        setLoading(true);
        setError('');
        setOrder(null);
        setSelectedItems([]);

        try {
            // Fetch all orders and find the specific one (Simulating getById)
            const allOrders = await orderService.getAllOrders();
            // Loosely match ID (string/number)
            const found = allOrders.find((o: any) => o.id.toString() === searchId.toString());

            if (found) {
                // If the order object doesn't have items expanded (depends on backend), we might need to fetch details
                // Assuming getAllOrders returns items or we parse them if they are JSON string
                let parsedItems = found.items;
                if (typeof parsedItems === 'string') {
                    try { parsedItems = JSON.parse(parsedItems); } catch(e) {}
                }
                setOrder({ ...found, items: parsedItems || [] });
            } else {
                setError('Order not found.');
            }
        } catch (err) {
            setError('Failed to fetch order.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Toggle Item Selection
    const toggleItem = (index: number) => {
        if (selectedItems.includes(index)) {
            setSelectedItems(prev => prev.filter(i => i !== index));
        } else {
            setSelectedItems(prev => [...prev, index]);
        }
    };

    // 3. Process Refund
    const processRefund = async (refundAll: boolean) => {
        if (!order) return;
        setProcessing(true);

        try {
            // Filter items to refund
            const itemsToRefund = refundAll
                ? order.items
                : order.items.filter((_: any, idx: number) => selectedItems.includes(idx));

            if (itemsToRefund.length === 0) {
                setError("No items selected for refund.");
                setProcessing(false);
                return;
            }

            // Calculate totals (Negative values for refund)
            const refundTotal = itemsToRefund.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);

            // Construct Negative Order Payload
            const refundPayload = {
                customerId: order.customer_id,
                totalAmount: -Math.abs(refundTotal), // Negative Total
                paymentMethod: 'Cash', // Default to Cash refund
                status: 'refunded',
                items: itemsToRefund.map((item: any) => ({
                    productId: item.productId || item.id, // Handle different ID fields
                    name: item.name,
                    quantity: -Math.abs(item.quantity), // Negative Quantity (Restocks Inventory!)
                    price: item.price
                })),
                // Reverse Loyalty Logic if full refund (Optional refinement)
                pointsRedeemed: refundAll ? -Math.abs(order.points_redeemed || 0) : 0,
                pointsEarned: -Math.floor(refundTotal) // Simple logic: deduct points earned from this amount
            };

            const newRefundOrder = await orderService.create(refundPayload);

            onRefundComplete(newRefundOrder);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to process refund transaction.");
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <RotateCcw className="text-red-400" /> Process Refund
                    </h2>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white"/></button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {/* Search Box */}
                    <form onSubmit={handleSearch} className="relative mb-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Original Order ID</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none font-bold text-gray-800"
                                    placeholder="e.g. 24"
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                />
                            </div>
                            <button type="submit" disabled={loading} className="px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                                {loading ? <Loader2 className="animate-spin"/> : 'Find'}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1"><AlertTriangle size={12}/> {error}</p>}
                    </form>

                    {/* Order Details */}
                    {order && (
                        <div className="animate-in slide-in-from-bottom-2">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-sm">
                                <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{new Date(order.created_at || order.timestamp).toLocaleDateString()}</span></div>
                                <div className="flex justify-between"><span>Customer:</span> <span className="font-bold">{order.customer_name || 'Walk-in'}</span></div>
                                <div className="flex justify-between text-blue-600 border-t border-gray-200 mt-2 pt-1"><span>Total Paid:</span> <span className="font-bold">{currency}{Number(order.total_amount).toFixed(2)}</span></div>
                            </div>

                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Select Items to Refund</h4>
                            <div className="space-y-2 mb-6">
                                {order.items && order.items.map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onClick={() => toggleItem(idx)}
                                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedItems.includes(idx) ? 'bg-red-50 border-red-500 ring-1 ring-red-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItems.includes(idx) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>
                                                {selectedItems.includes(idx) && <CheckCircle size={14}/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.quantity} x {currency}{item.price}</div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-700">
                                            {currency}{(item.quantity * item.price).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {order && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => processRefund(false)}
                            disabled={processing || selectedItems.length === 0}
                            className="py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-50"
                        >
                            Refund Selected ({selectedItems.length})
                        </button>
                        <button
                            onClick={() => processRefund(true)}
                            disabled={processing}
                            className="py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {processing ? <Loader2 className="animate-spin"/> : 'Refund Whole Order'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RefundModal;