import Dexie, { Table } from "dexie";
// ✅ Import Configuration Types
import { BusinessType, InventoryPreset } from "../config/inventoryConfig";

// --- Interfaces ---

// ✅ Category Interface for separate management
export interface Category {
  id?: number;
  name: string;
}

// --- ✅ NEW: Business Settings & Logs ---
export interface BusinessSettings {
  id?: number;
  businessType: BusinessType;
  storeName: string;
  createdAt: string;
}

export interface InventoryOverride {
  id?: number;
  businessId?: number;
  overrideJson: Partial<InventoryPreset>; // Stores user customizations
}

export interface InventoryDamageLog {
  id?: number;
  productId: number;
  productName: string; // Snapshot for history
  quantity: number;
  note: string;
  damageDate: string;
  reportedBy: string;
}

// ✅ NEW: Product Batch Structure (For Lifecycle/Expiry Tracking)
export interface ProductBatch {
  id: string;           // Unique Batch ID (timestamp or uuid)
  batchNumber: string;  // e.g. "BATCH-001"
  quantity: number;     // Quantity specific to this batch
  issueDate?: string;   // Optional Issue Date
  expiryDate?: string;  // Optional Expiry Date
}

// ✅ Universal Product Master Data (Inventory Upgrade)
export interface Product {
  id?: number;

  // 1.1 Basic Identification
  sku?: string;             // Stock Keeping Unit (Manual/Auto)
  name: string;             // System Name
  displayName?: string;     // Invoice Name (Optional)
  category: string;         // Stores categories (comma-separated)
  brand?: string;
  barcode: string;          // Primary Scanner Code
  type: 'Stock' | 'Service' | 'Non-Stock';

  // 1.2 Pricing
  costPrice: number;        // For Profit Calculation
  price: number;            // Selling Price (Retail)
  wholesalePrice?: number;  // Optional
  minSellingPrice?: number; // Floor Price
  isTaxIncluded: boolean;   // VAT/Tax Logic
  allowDiscount: boolean;

  // 1.3 Unit & Measurement
  unit: string;             // pcs, kg, ltr, box
  fractionalAllowed: boolean; // Allow selling 0.5 kg?

  // 2. Stock Control
  stock: number;            // SELLABLE Quantity (Available for POS)
  reorderLevel?: number;    // Low Stock Alert Threshold
  maxStockLevel?: number;   // Optional

  // ✅ NEW: Batch Handling (Array of batches)
  batches?: ProductBatch[];

  // ✅ NEW: Extended Stock Status
  totalQty?: number;        // Physical count (Stock + Damaged + Expired)
  damagedQty?: number;      // Unsellable (Broken)
  expiredQty?: number;      // Unsellable (Expired)

  // 3. Supplier (Optional)
  supplierName?: string;
  supplierReference?: string;
  lastPurchaseDate?: string;
  lastPurchaseCost?: number;

  // 4. Expiry & Batch (Optional Legacy Fields - kept for backward compatibility)
  stockIssueDate?: string;
  stockExpiryDate?: string;
  batchNumber?: string;
  serialNumber?: string;    // Unique Serial/IMEI

  // 5. Variants (Simplified Flat Structure)
  variantGroup?: string;    // Link items together (e.g. "T-Shirt 001")
  variantName?: string;     // Specifics (e.g. "Red / L")

  // 6. Operational Status
  isActive: boolean;        // Soft Delete (Show/Hide in POS)
  allowNegativeStock: boolean;

  // ✅ NEW: Favorite Status
  isFavorite?: boolean;

  // 7. Audit
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  returnedQuantity?: number;
  returnReason?: 'refund' | 'warranty' | 'exchange';
}

// ✅ UPDATE: Order Interface with Payment Details for Receipts
export interface Order {
  id?: number;
  timestamp: number;
  total: number;
  status: "completed" | "pending" | "synced" | "refunded";
  items: OrderItem[];
  discount?: number;
  paymentMethod: string;
  refundedAmount?: number;

  // Link Order to a Customer
  customerId?: number;

  // Track Point Redemption
  pointsRedeemed?: number;
  pointsMonetaryValue?: number;

  // ✅ NEW FIELDS: Receipt & Payment Logic
  tendered?: number;        // Amount customer handed over
  change?: number;          // Change returned
  pointsEarned?: number;    // Points gained from this specific sale
}

// Full Customer Profile (CRM)
export interface Customer {
  id?: number;
  name: string;
  fullName?: string;
  phone?: string;
  address?: string;
  type: 'Walk-in' | 'Registered' | 'Wholesale' | 'Retail' | 'Member';
  createdAt: string;

  // Loyalty Data
  loyaltyJoined?: boolean;
  loyaltyId?: string;
  loyaltyPoints?: number;
  loyaltyDiscountRate?: number;
  loyaltyStatus?: 'Enable' | 'Disable';

  // Metrics
  totalPurchases?: number;
  totalSpend?: number;
  lastPurchaseDate?: string;
  averageOrderValue?: number;
  preferredCategory?: string;
}

export interface OfflineRequest {
  id?: number;
  requestData: any;
  retryCount: number;
  url: string;
  method: string;
}

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  navbarColor: string;
  sidebarColor: string;
  cardColor: string;
  textColor: string;
  sidebarTextColor: string;
  labelColor: string;
  subTextColor: string;
}

export interface StoreSettings {
  id?: number;
  storeName: string;
  address: string;
  phone: string;
  email?: string;
  taxRate: number;
  currency: string;
  logoUrl?: string;
  showLogo?: boolean;
  headerText?: string;
  footerText?: string;
  receiptWidth?: string;
  theme?: AppTheme;

  // Loyalty Rules
  loyaltySpendThreshold?: number;
  loyaltyEarnRate?: number;
  loyaltyRedemptionRate?: number;

  // ✅ NEW: WhatsApp Integration
  whatsappEnabled?: boolean;
  whatsappToken?: string;
  whatsappPhoneId?: string;

  // ✅ NEW: Email Integration (Provider Agnostic / Brevo)
  emailEnabled?: boolean;
  emailApiKey?: string;        // API Key for Email Service
  emailSenderName?: string;    // e.g. "OmniPOS Store"
  emailSenderAddress?: string; // e.g. "receipts@mystore.com"

  // ✅ NEW: SMS Integration (Provider Agnostic)
  smsEnabled?: boolean;
  smsProvider?: 'brevo' | 'textlk' | 'twilio' | 'bird' | 'plivo'; // Enum for providers
  smsAccountSid?: string;       // For Twilio, Plivo
  smsAuthToken?: string;        // For Twilio, Plivo, Brevo (API Key), Bird (API Key)
  smsFromNumber?: string;       // For Twilio, Plivo, Brevo (Sender ID), Bird (Originator)
  smsApiEndpoint?: string;      // For Text.lk (HTTP API Endpoint)
  smsApiToken?: string;         // For Text.lk (API Token)
  smsTemplateId?: string;       // Optional for some providers
}

// --- Database Class ---

export class OmniPOSDatabase extends Dexie {
  products!: Table<Product>;
  orders!: Table<Order>;
  offlineQueue!: Table<OfflineRequest>;
  settings!: Table<StoreSettings>;
  customers!: Table<Customer>;
  categories!: Table<Category>;

  // ✅ NEW TABLES
  businessSettings!: Table<BusinessSettings>;
  inventoryOverrides!: Table<InventoryOverride>;
  damageLogs!: Table<InventoryDamageLog>;

  constructor() {
    super("OmniPOS_DB");

    // ✅ Version 16: Updated schema with new inventory tables
    this.version(16).stores({
      products: "++id, name, sku, barcode, category, type, isActive, isFavorite, stockExpiryDate",
      orders: "++id, timestamp, status, paymentMethod, customerId",
      offlineQueue: "++id, retryCount",
      settings: "++id",
      customers: "++id, name, phone, loyaltyId, type",
      categories: "++id, name",

      // New Tables
      businessSettings: "++id",
      inventoryOverrides: "++id",
      damageLogs: "++id, productId, damageDate"
    });
  }
}

export const db = new OmniPOSDatabase();

// --- Defaults ---

export const DEFAULT_THEME: AppTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  backgroundColor: '#f3f4f6',
  navbarColor: '#ffffff',
  sidebarColor: '#ffffff',
  cardColor: '#ffffff',
  textColor: '#2563eb', // ✅ Changed to #2563eb
  sidebarTextColor: '#1f2937',
  labelColor: '#374151',
  subTextColor: '#6b7280',
};

export const DEFAULT_CUSTOMER: Customer = {
    name: "Walk-in Customer",
    type: 'Walk-in',
    createdAt: new Date().toISOString(),
    loyaltyJoined: false,
    totalPurchases: 0,
    totalSpend: 0
};

// --- Data Seeder ---

export async function seedDatabase() {
  // Seed Products with NEW Universal Schema
  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd([
      {
        name: "Classic Burger",
        sku: "BUR-001",
        price: 8.99,
        costPrice: 4.50,
        category: "Food",
        stock: 100,
        reorderLevel: 20,
        barcode: "1001",
        type: 'Stock',
        unit: 'pcs',
        fractionalAllowed: false,
        isActive: true,
        isFavorite: true, // Example Favorite
        allowDiscount: true,
        isTaxIncluded: false,
        allowNegativeStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: "Cola Zero",
        sku: "DRK-001",
        price: 2.00,
        costPrice: 0.80,
        category: "Drink",
        stock: 200,
        reorderLevel: 50,
        barcode: "1003",
        type: 'Stock',
        unit: 'can',
        fractionalAllowed: false,
        isActive: true,
        isFavorite: false,
        allowDiscount: true,
        isTaxIncluded: true,
        allowNegativeStock: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: "Cheese Fries",
        sku: "FRI-002",
        price: 4.5,
        costPrice: 1.5,
        category: "Food",
        stock: 50,
        reorderLevel: 10,
        barcode: "1002",
        type: 'Stock',
        unit: 'box',
        fractionalAllowed: false,
        isActive: true,
        isFavorite: true, // Example Favorite
        allowDiscount: true,
        isTaxIncluded: false,
        allowNegativeStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    console.log("Database seeded with Universal Product Data.");
  }

  // ✅ Seed Default Categories
  const catCount = await db.categories.count();
  if (catCount === 0) {
      await db.categories.bulkAdd([
          { name: "Food" },
          { name: "Drink" },
          { name: "Snacks" },
          { name: "Electronics" },
          { name: "Service" }
      ]);
      console.log("Database seeded with default Categories.");
  }

  // Seed Default Settings
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 1,
      storeName: "OmniPOS Store",
      address: "123 Commerce St, Tech City",
      phone: "555-0123",
      email: "support@omnipos.com",
      taxRate: 0.08,
      currency: "LKR ",
      receiptWidth: "80mm",
      showLogo: false,
      headerText: "Welcome to our store!",
      footerText: "Thank you for your visit.",
      theme: DEFAULT_THEME,

      // Default Loyalty Config
      loyaltySpendThreshold: 100,
      loyaltyEarnRate: 1,
      loyaltyRedemptionRate: 1,

      // WhatsApp Defaults
      whatsappEnabled: false,

      // ✅ Email Defaults
      emailEnabled: false,
      emailSenderName: "OmniPOS Store",
      emailSenderAddress: "receipts@omnipos.com",

      // ✅ SMS Defaults
      smsEnabled: false,
      smsProvider: 'textlk', // Default to Text.lk as requested
      smsAccountSid: '',
      smsAuthToken: '',
      smsFromNumber: '',
      smsApiEndpoint: 'https://app.text.lk/api/v3/sms/send', // Default endpoint suggestion
      smsApiToken: '',
      smsTemplateId: ''
    });
    console.log("Database seeded with default settings.");
  }

  // Seed Default Customer
  const customerCount = await db.customers.count();
  if (customerCount === 0) {
      await db.customers.add(DEFAULT_CUSTOMER);
      console.log("Database seeded with default Walk-in Customer.");
  }
}