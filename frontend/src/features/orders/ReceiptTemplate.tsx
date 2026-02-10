import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Order } from '../../db/db';

interface ReceiptProps {
  order: Order;
}

export const ReceiptTemplate: React.FC<ReceiptProps> = ({ order }) => {
  // Fetch settings safely
  const settings = useLiveQuery(async () => {
     const lastSetting = await db.settings.orderBy('id').last();
     return lastSetting || await db.settings.get(1);
  });

  if (!settings) return null;

  const currency = settings.currency ?? '$';
  const taxRate = settings.taxRate ?? 0.08;

  // --- Dynamic Styling ---
  // If user selected 58mm in settings, we force smaller text.
  // Otherwise, we use standard size text.
  const fontSizeClass = settings.receiptWidth === '58mm' ? 'text-[10px]' : 'text-xs';

  return (
    <div id="printable-receipt" className="hidden">

      {/* ✅ FLUID WIDTH + PADDING FIX:
          - width: 100% -> Fills the paper width (whether 80mm or A4).
          - padding: 4mm -> Adds the requested "bit of space" on left/right.
      */}
      <div
        className={`bg-white ${fontSizeClass} font-mono leading-tight text-black`}
        style={{
            width: '100%',     // Fill the selected paper size
            padding: '4mm',    // ✅ Safe zone so text doesn't hit edges
            boxSizing: 'border-box'
        }}
      >

        {/* --- HEADER --- */}
        <div className="text-center mb-4">
          {settings.showLogo && settings.logoUrl && (
            <img src={settings.logoUrl} alt="Store Logo" className="mx-auto max-h-16 mb-2 grayscale" />
          )}
          <h1 className="text-xl font-bold uppercase tracking-wider">{settings.storeName}</h1>
          {settings.headerText && <p className="mt-1 italic font-medium">{settings.headerText}</p>}

          <div className="mt-2 text-gray-600 space-y-0.5">
             <p>{settings.address}</p>
             <p>Tel: {settings.phone}</p>
             {settings.email && <p>Email: {settings.email}</p>}
          </div>
        </div>

        {/* --- METADATA --- */}
        <div className="border-b border-dashed border-black mb-2 pb-2">
          <div className="flex justify-between"><span>Order #:</span><span>{order.id}</span></div>
          <div className="flex justify-between"><span>Date:</span><span>{new Date(order.timestamp).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span>Time:</span><span>{new Date(order.timestamp).toLocaleTimeString()}</span></div>
          {order.customerId && <div className="flex justify-between"><span>Cust ID:</span><span>#{order.customerId}</span></div>}
        </div>

        {/* --- ITEMS --- */}
        <div className="mb-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1 pr-2 break-words max-w-[100px]">{item.name}</td>
                  <td className="py-1 text-right">{item.quantity}</td>
                  <td className="py-1 text-right">{item.price.toFixed(2)}</td>
                  <td className="py-1 text-right font-medium">
                    {((item.price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- TOTALS --- */}
        <div className="border-t border-dashed border-black pt-2 mb-2 space-y-1">
          <div className="flex justify-between text-gray-600">
             <span>Subtotal</span>
             <span>{currency}{(order.total + (order.discount || 0) + (order.pointsMonetaryValue || 0)).toFixed(2)}</span>
          </div>

          {(order.discount || 0) > 0 && (
             <div className="flex justify-between font-bold text-gray-800">
                <span>Discount</span>
                <span>-{currency}{(order.discount || 0).toFixed(2)}</span>
             </div>
          )}

          {(order.pointsMonetaryValue || 0) > 0 && (
             <div className="flex justify-between font-bold text-gray-800">
                <span>Points Used ({order.pointsRedeemed} pts)</span>
                <span>-{currency}{(order.pointsMonetaryValue || 0).toFixed(2)}</span>
             </div>
          )}

          <div className="flex justify-between text-gray-500 text-[9px] border-b border-dashed border-gray-300 pb-1 mb-1">
             <span>Tax (Included)</span>
             <span>{(taxRate * 100).toFixed(0)}%</span>
          </div>

          <div className="flex justify-between font-bold text-xl mt-2 pt-1 border-t border-black">
            <span>TOTAL</span>
            <span>{currency}{order.total.toFixed(2)}</span>
          </div>

          {order.tendered !== undefined ? (
            <>
                <div className="flex justify-between text-xs font-bold mt-1">
                    <span>CASH / PAID</span>
                    <span>{currency}{order.tendered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                    <span>CHANGE</span>
                    <span>{currency}{(order.change || 0).toFixed(2)}</span>
                </div>
            </>
          ) : (
             <div className="mt-2 text-[10px] text-gray-500 uppercase flex justify-between">
                <span>Paid via {order.paymentMethod}</span>
                <span>{currency}{order.total.toFixed(2)}</span>
             </div>
          )}
        </div>

        {/* --- LOYALTY --- */}
        {(order.pointsEarned || 0) > 0 && (
            <div className="border-t border-dashed border-black py-2 text-center">
                <div className="font-bold text-xs">Points Earned: +{order.pointsEarned}</div>
                {order.pointsRedeemed && order.pointsRedeemed > 0 ? (
                    <div className="text-[10px]">Points Redeemed: -{order.pointsRedeemed}</div>
                ) : null}
            </div>
        )}

        {/* --- FOOTER --- */}
        <div className="text-center mt-4">
          {settings.footerText && <p className="mb-2 font-medium px-4 whitespace-pre-wrap">{settings.footerText}</p>}
          <p className="mb-2 text-gray-500">Thank you for your visit!</p>
          <div className="flex justify-center mb-1">
             <div className="h-8 w-40 bg-black flex items-center justify-center text-white text-[10px]">
                {order.id ? `* ${order.id} *` : '||| || |||'}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};