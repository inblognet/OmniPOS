import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { db, Customer } from '../db/db';

// --- EXPORT FUNCTION ---
export const exportCustomers = async () => {
  const customers = await db.customers.toArray();

  // Flatten data for the CSV/Excel
  const exportData = customers.map(c => ({
    "Customer ID": c.id,
    "Name": c.name,
    "Full Name": c.fullName || '',
    "Phone": c.phone || '',
    "Address": c.address || '',
    "Type": c.type,
    "Registration Date": c.createdAt,
    "Loyalty Active": c.loyaltyJoined ? "Yes" : "No",
    "Loyalty Points": c.loyaltyPoints || 0,
    "Total Spend": c.totalSpend || 0,
    "Last Purchase": c.lastPurchaseDate || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  // Generate Filename: customers_export_YYYY_MM_DD.csv
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  const buffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
  const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8' });

  saveAs(blob, `customers_export_${dateStr}.csv`);
};

// --- IMPORT FUNCTION ---
export const parseCustomerFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

// --- UPSERT LOGIC (The Brains) ---
export const processImport = async (
  rawData: any[],
  mode: 'create' | 'update' | 'upsert'
) => {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const row of rawData) {
    try {
      // 1. Validate Mandatory Fields
      if (!row['Name'] && !row['Customer Name']) {
        errors.push(`Row missing Name: ${JSON.stringify(row)}`);
        continue;
      }

      const name = row['Name'] || row['Customer Name'];
      const phone = row['Phone'] || row['Customer Phone Number'];

      // 2. Check for Duplicates (Match by Phone or Name)
      let existing: Customer | undefined;
      if (phone) {
        existing = await db.customers.where('phone').equals(String(phone)).first();
      }
      if (!existing && name) {
        existing = await db.customers.where('name').equals(name).first();
      }

      // 3. Handling Modes
      if (existing) {
        if (mode === 'create') {
          skipped++;
          continue;
        }

        // Update Logic
        await db.customers.update(existing.id!, {
          fullName: row['Full Name'] || existing.fullName,
          address: row['Address'] || existing.address,
          type: row['Type'] || existing.type,
          // Don't overwrite sensitive/system data like ID or Points unless specifically mapped
        });
        updated++;

      } else {
        if (mode === 'update') {
          skipped++;
          continue;
        }

        // Create Logic
        await db.customers.add({
          name: name,
          fullName: row['Full Name'],
          phone: phone ? String(phone) : undefined,
          address: row['Address'],
          type: row['Type'] || 'Walk-in',
          createdAt: new Date().toISOString(),
          // Defaults
          loyaltyJoined: false,
          totalPurchases: 0,
          totalSpend: 0
        });
        added++;
      }
    } catch (err) {
      errors.push(`Error processing ${row['Name']}: ${err}`);
    }
  }

  return { added, updated, skipped, errors };
};