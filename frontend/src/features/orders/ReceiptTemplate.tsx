import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useCurrency } from '../../hooks/useCurrency';

// ✅ Import Barcode & QR Code
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

// Define a flexible interface that accepts both DB Order and Frontend enriched Order
interface ReceiptProps {
  order: any;
}

export const ReceiptTemplate: React.FC<ReceiptProps> = ({ order }) => {
  const currency = useCurrency();

  // Fetch settings safely from local Dexie for custom receipt branding
  const settings = useLiveQuery(async () => {
     const lastSetting = await db.settings.orderBy('id').last();
     return lastSetting || await db.settings.get(1);
  });

  // Automatically trigger print when this component renders
  useEffect(() => {
    // Note: The parent component usually handles window.print(),
    // but having it here acts as a failsafe if this is used standalone.
  }, []);

  if (!settings || !order) return null;

  const taxRate = settings.taxRate ?? 0.08;

  // --- Dynamic Styling ---
  const fontSizeClass = settings.receiptWidth === '58mm' ? 'text-[10px]' : 'text-xs';

  // Ensure total is a number (handles potential string from PG Decimal)
  const displayTotal = Number(order.total || order.total_amount || 0);

  return (
    <div id="printable-receipt" className="hidden print:block">
      {/* FLUID WIDTH + PADDING FIX */}
      <div
        className={`bg-white ${fontSizeClass} font-mono leading-tight text-black`}
        style={{
            width: '100%',
            padding: '4mm',
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
          <div className="flex justify-between items-center">
            <span>Order #:</span>
            <span className="font-bold">{order.id}</span>
          </div>
          {/* ✅ BARCODE REMOVED FROM HERE */}

          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(order.created_at || order.date || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{new Date(order.created_at || order.date || Date.now()).toLocaleTimeString()}</span>
          </div>
          {/* Use customer_name if available in cloud sync */}
          {order.customer_name && (
            <div className="flex justify-between font-bold mt-1"><span>Customer:</span><span>{order.customer_name}</span></div>
          )}
        </div>

        {/* --- ITEMS --- */}
        <div className="mb-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1 pr-2 break-words max-w-[100px]">{item.name || "Item"}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{Number(item.price).toFixed(2)}</td>
                  <td className="py-1 text-right font-medium">
                    {(Number(item.price) * item.quantity).toFixed(2)}
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
             <span>{currency}{displayTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-gray-500 text-[9px] border-b border-dashed border-gray-300 pb-1 mb-1">
             <span>Tax (Included)</span>
             <span>{(taxRate * 100).toFixed(0)}%</span>
          </div>

          <div className="flex justify-between font-bold text-xl mt-2 pt-1 border-t border-black">
            <span>TOTAL</span>
            <span>{currency}{displayTotal.toFixed(2)}</span>
          </div>

          <div className="mt-2 text-[10px] text-gray-500 uppercase flex justify-between">
            <span>Paid via {order.payment_method || order.paymentMethod || 'Cash'}</span>
            <span>{currency}{displayTotal.toFixed(2)}</span>
          </div>

          {/* Payment Details (Tendered / Change) */}
          {order.tendered !== undefined && (
             <>
               <div className="flex justify-between text-xs mt-1">
                 <span>Cash Tendered:</span>
                 <span>{currency}{Number(order.tendered).toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold">
                 <span>Change:</span>
                 <span>{currency}{Number(order.change).toFixed(2)}</span>
               </div>
             </>
          )}
        </div>

        {/* ✅ LOYALTY SECTION */}
        {(order.pointsRedeemed > 0 || order.pointsEarned > 0) && (
            <div className="mb-4 border-t border-black border-dashed pt-2">
               <p className="text-center font-bold mb-1">--- LOYALTY PROGRAM ---</p>
               {order.pointsRedeemed > 0 && (
                 <div className="flex justify-between">
                   <span>Points Redeemed:</span>
                   <span>-{order.pointsRedeemed}</span>
                 </div>
               )}
               {order.pointsEarned > 0 && (
                 <div className="flex justify-between">
                   <span>Points Earned:</span>
                   <span>+{order.pointsEarned}</span>
                 </div>
               )}
               {order.loyaltyBalance !== undefined && (
                 <div className="flex justify-between font-bold mt-1 border-t border-gray-200 pt-1">
                   <span>New Balance:</span>
                   <span>{order.loyaltyBalance} Pts</span>
                 </div>
               )}
            </div>
        )}

        {/* --- FOOTER --- */}
        <div className="text-center mt-4">
          {settings.footerText && <p className="mb-2 font-medium px-4 whitespace-pre-wrap">{settings.footerText}</p>}
          <p className="mb-2 text-gray-500">Thank you for your visit!</p>

          {/* ✅ BARCODE & QR CODE SIDE-BY-SIDE */}
          <div className="flex justify-center items-end gap-4 mb-2 mt-4 pt-2 border-t border-dashed border-gray-200">
             {/* Barcode */}
             <div>
                 <Barcode
                   value={order.id ? order.id.toString() : '0000'}
                   width={1.2}
                   height={45}
                   fontSize={9}
                   displayValue={true} // Show number below barcode
                   margin={0}
                 />
             </div>

             {/* QR Code */}
             <div className="p-1 bg-white">
                <QRCode
                  value={order.id ? order.id.toString() : '0'}
                  size={60}
                  level="M"
                />
             </div>
          </div>
          <div className="text-[9px] text-gray-400">Scan codes to find order</div>
        </div>
      </div>
    </div>
  );
};