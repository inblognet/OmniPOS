import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../app/hooks'; // ✅ Use typed dispatch
import { addToCart } from '../store/cartSlice';
import { db } from '../db/db';

export const useGlobalScanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Buffer to hold keystrokes
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement;

      // 1. IGNORE inputs: If user is typing in a text box, don't hijack it
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // 2. TIMING CHECK: Scanners type very fast (<30ms between keys)
      // If it's been too long since the last key, reset the buffer (it's likely manual typing)
      if (now - lastKeyTime.current > 100 && buffer.current.length > 0) {
        buffer.current = '';
      }
      lastKeyTime.current = now;

      // 3. DETECT ENTER: The signal that the scan is finished
      if (e.key === 'Enter') {
        if (buffer.current.length > 2) { // Minimal length check
          const scannedBarcode = buffer.current;
          console.log("Global Scan Detected:", scannedBarcode);

          // --- ACTION: FIND PRODUCT ---
          try {
            const product = await db.products.where('barcode').equals(scannedBarcode).first();

            if (product) {
              // A. Check Stock Logic (Optional but recommended)
              if (product.type === 'Stock' && product.stock <= 0 && !product.allowNegativeStock) {
                 alert(`"${product.name}" is out of stock!`);
                 buffer.current = '';
                 return;
              }

              // B. Add to Cart (Redux)
              // ✅ FIXED: Added all required fields for CartItem
              dispatch(addToCart({
                 id: product.id!,
                 name: product.displayName || product.name,
                 price: product.price,
                 stock: product.stock,
                 barcode: product.barcode,
                 category: product.category,
                 quantity: 1,                        // ✅ Added
                 discount: 0,                        // ✅ Added
                 isTaxIncluded: product.isTaxIncluded ?? false, // ✅ Added
                 note: ''                            // ✅ Added
              }));

              // C. If not on POS screen, jump there!
              if (location.pathname !== '/pos') {
                navigate('/pos');
              }
            } else {
              console.warn("Product not found for barcode:", scannedBarcode);
              // Optional: Play error sound or show toast
            }
          } catch (error) {
            console.error("Scanner DB Error:", error);
          }
        }
        // Reset buffer after Enter
        buffer.current = '';
      } else if (e.key.length === 1) {
        // 4. BUILD BUFFER: Add printable characters
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, navigate, location.pathname]);
};