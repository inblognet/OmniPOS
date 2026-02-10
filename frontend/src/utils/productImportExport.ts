import { db, Product } from '../db/db';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// --- 1. EXPORT LOGIC ---
export const exportProducts = async () => {
  try {
    const products = await db.products.toArray();

    // Convert DB Object -> Excel Row
    const data = products.map(p => ({
      ID: p.id,
      Name: p.name,
      SKU: p.sku || '',
      Barcode: p.barcode,
      Category: p.category,
      Brand: p.brand || '',
      Type: p.type,
      // ✅ Added Variants
      'Variant Group': p.variantGroup || '',
      'Variant Name': p.variantName || '',
      'Cost Price': p.costPrice,
      'Selling Price': p.price,
      'Wholesale Price': p.wholesalePrice || 0,
      'Current Stock': p.stock,
      'Reorder Level': p.reorderLevel || 5,
      Unit: p.unit,
      Active: p.isActive ? 'Yes' : 'No'
    }));

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    const date = new Date().toISOString().split('T')[0];
    const fileName = `inventory_export_${date}.csv`;

    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error("Export failed:", error);
    return false;
  }
};

// --- 2. IMPORT LOGIC ---
export const parseProductFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    // ✅ FIX: Cast both file and config to 'any' to bypass strict Type mismatches
    Papa.parse(file as any, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => resolve(results.data),
      error: (error: any) => reject(error),
    } as any);
  });
};

export const processProductImport = async (
  rawData: any[],
  mode: 'create' | 'update' | 'upsert'
) => {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors: string[] = [];

  await db.transaction('rw', db.products, async () => {
    for (const row of rawData) {
      try {
        const name = row['Name']?.trim();
        const barcode = row['Barcode']?.toString().trim();
        const sku = row['SKU']?.toString().trim();
        const price = parseFloat(row['Selling Price']);

        if (!name || isNaN(price)) {
          if (!name && !price) continue; // Skip empty rows
          errors.push(`Skipped row: Missing Name or Price (${name})`);
          skipped++;
          continue;
        }

        let existing: Product | undefined;
        if (barcode) existing = await db.products.where('barcode').equals(barcode).first();
        if (!existing && sku) existing = await db.products.where('sku').equals(sku).first();

        const productData: Product = {
          name: name,
          sku: sku || '',
          barcode: barcode || '',
          category: row['Category'] || 'General',
          brand: row['Brand'] || '',
          type: (row['Type'] === 'Service' || row['Type'] === 'Non-Stock') ? row['Type'] : 'Stock',

          variantGroup: row['Variant Group'] || '',
          variantName: row['Variant Name'] || '',

          costPrice: parseFloat(row['Cost Price']) || 0,
          price: price,
          wholesalePrice: parseFloat(row['Wholesale Price']) || 0,
          minSellingPrice: 0,
          isTaxIncluded: false,
          allowDiscount: true,

          stock: parseFloat(row['Current Stock']) || 0,
          reorderLevel: parseFloat(row['Reorder Level']) || 5,
          unit: row['Unit'] || 'pcs',
          fractionalAllowed: false,

          isActive: row['Active'] !== 'No',
          allowNegativeStock: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (existing) {
          if (mode === 'create') {
            skipped++;
          } else {
            await db.products.update(existing.id!, {
              ...productData,
              id: existing.id,
              stock: productData.stock
            });
            updated++;
          }
        } else {
          if (mode === 'update') {
            skipped++;
          } else {
            await db.products.add(productData);
            added++;
          }
        }
      } catch (err) {
        errors.push(`Row error: ${JSON.stringify(row)}`);
      }
    }
  });

  return { added, updated, skipped, errors };
};