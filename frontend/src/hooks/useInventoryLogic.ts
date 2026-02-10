// cspell:ignore dexie
import { useLiveQuery } from "dexie-react-hooks";
// ✅ FIX: Use 'type Product' to tell TypeScript this is an interface, not a variable
import { db, type Product } from "../db/db";
import { PRESETS, mergeConfiguration, BusinessType, InventoryPreset } from "../config/inventoryConfig";

export const useInventoryLogic = () => {
  // 1. Fetch Business Type (Defaults to 'General_Retail' if not set)
  const businessSetting = useLiveQuery(() => db.businessSettings.get(1));
  const userOverride = useLiveQuery(() => db.inventoryOverrides.get(1));

  // 2. Determine Configuration
  const currentBusinessType: BusinessType = businessSetting?.businessType || 'General_Retail';
  const basePreset = PRESETS[currentBusinessType];

  // 3. Merge Base Preset + User Override
  const config: InventoryPreset = mergeConfiguration(basePreset, userOverride?.overrideJson);

  // --- Helper: Stock Calculation Logic ---
  // ✅ Product is used here as a Type Annotation
  const calculateStock = (product: Product, changeType: 'damage' | 'expire', qty: number) => {
    let newSellable = product.stock;
    let newDamaged = product.damagedQty || 0;
    let newExpired = product.expiredQty || 0;

    // Fallback: If totalQty isn't set yet, assume it matches stock (migration support)
    const currentTotal = product.totalQty || product.stock;

    if (changeType === 'damage') {
       newSellable = Math.max(0, newSellable - qty);
       newDamaged += qty;
    }
    else if (changeType === 'expire') {
       newSellable = Math.max(0, newSellable - qty);
       newExpired += qty;
    }

    return {
        stock: newSellable,
        damagedQty: newDamaged,
        expiredQty: newExpired,
        totalQty: currentTotal // Physical total remains the same, just shifted buckets
    };
  };

  // 4. Logic: Mark Stock as Damaged
  const reportDamage = async (productId: number, qty: number, note: string) => {
      const product = await db.products.get(productId);
      if(!product) return;

      const currentStock = product.stock || 0;

      if (currentStock < qty) {
          alert("Error: Cannot damage more items than available in stock.");
          return;
      }

      // Calculate new spread
      const newStats = calculateStock(product, 'damage', qty);

      await db.transaction('rw', db.products, db.damageLogs, async () => {
          // Update Product
          await db.products.update(productId, {
              stock: newStats.stock,
              damagedQty: newStats.damagedQty,
              updatedAt: new Date().toISOString()
          });

          // Create Log Entry
          await db.damageLogs.add({
              productId,
              productName: product.name,
              quantity: qty,
              note,
              damageDate: new Date().toISOString(),
              reportedBy: "Admin"
          });
      });
  };

  // 5. Logic: Check for Expired Items (Run this on load or background)
  const checkExpiries = async () => {
      if (!config.features.expiryTracking) return;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Find items that are expired but still in 'stock' (sellable)
      // Note: Dexie queries work best with simple comparisons.
      // Complex date logic is safer in the filter or JS loop for small datasets.
      const expiredItems = await db.products
          .filter(p => !!p.stockExpiryDate && p.stockExpiryDate < today && p.stock > 0)
          .toArray();

      if (expiredItems.length > 0) {
          await db.transaction('rw', db.products, async () => {
              for (const p of expiredItems) {
                   // Move ALL remaining stock to expired bucket
                   const newStats = calculateStock(p, 'expire', p.stock);

                   await db.products.update(p.id!, {
                       stock: 0,
                       expiredQty: newStats.expiredQty,
                       updatedAt: new Date().toISOString()
                   });
              }
          });
          console.log(`Moved ${expiredItems.length} expired items to Unsellable.`);
      }
  };

  return { config, reportDamage, checkExpiries };
};