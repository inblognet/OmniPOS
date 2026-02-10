// cspell:ignore dexie IMEI qrcode react-barcode
// src/config/inventoryConfig.ts

export type BusinessType =
  | 'General_Retail'
  | 'Computer_Shop'
  | 'Grocery_Store'
  | 'Pharmacy'
  | 'Clothing_Store'
  | 'Restaurant'
  | 'Beauty_Salon'
  | 'Hardware_Store';

// 1. Feature Flags (What can the system do?)
export interface InventoryFeatures {
  expiryTracking: boolean;     // Enable Batch/Expiry Management
  damageTracking: boolean;     // Enable Damaged Stock Isolation
  variantSupport: boolean;     // Enable Size/Color/Model
  serialTracking: boolean;     // Enable Serial Numbers (IMEI/SN)
  lowStockAlerts: boolean;
  negativeStock: boolean;
  barcodeGeneration: boolean;  // Enable the "Gen" button and dashboard manager
}

// 2. Field Visibility (What shows on the form?)
export interface FieldConfig {
  visible: boolean;
  required: boolean;
  label?: string; // Allow overriding label (e.g., "IMEI" instead of "Serial")
}

// 3. The Master Preset Structure
export interface InventoryPreset {
  id: string;
  name: string;
  features: InventoryFeatures;
  fields: {
    sku: FieldConfig;
    barcode: FieldConfig;
    brand: FieldConfig;
    category: FieldConfig;
    costPrice: FieldConfig;
    supplier: FieldConfig;
    stockIssueDate: FieldConfig;
    stockExpiryDate: FieldConfig;
    batchNumber: FieldConfig;
    serialNumber: FieldConfig;
  };
  defaultUnit: string;
}

// --- BASE DEFAULTS (The "Factory Settings") ---
const BASE_DEFAULTS: InventoryPreset = {
  id: 'default',
  name: 'General Retail',
  defaultUnit: 'pcs',
  features: {
    expiryTracking: false,
    damageTracking: true,
    variantSupport: true,
    serialTracking: false,
    lowStockAlerts: true,
    negativeStock: false,
    barcodeGeneration: true,
  },
  fields: {
    sku: { visible: true, required: false },
    barcode: { visible: true, required: true },
    brand: { visible: true, required: false },
    category: { visible: true, required: true },
    costPrice: { visible: true, required: true },
    supplier: { visible: true, required: false },
    stockIssueDate: { visible: false, required: false },
    stockExpiryDate: { visible: false, required: false },
    batchNumber: { visible: false, required: false },
    serialNumber: { visible: false, required: false },
  }
};

// --- INDUSTRY PRESETS ---
// Updated to match the recaptured list to prevent blank page errors
export const PRESETS: Record<BusinessType, InventoryPreset> = {
  'General_Retail': { ...BASE_DEFAULTS },

  'Computer_Shop': {
    ...BASE_DEFAULTS,
    name: 'Computer & Mobile',
    features: { ...BASE_DEFAULTS.features, serialTracking: true },
    fields: {
      ...BASE_DEFAULTS.fields,
      brand: { visible: true, required: true },
      serialNumber: { visible: true, required: true, label: "Serial / IMEI" },
    }
  },

  'Grocery_Store': {
    ...BASE_DEFAULTS,
    name: 'Grocery Store',
    features: { ...BASE_DEFAULTS.features, expiryTracking: true },
    fields: {
      ...BASE_DEFAULTS.fields,
      stockExpiryDate: { visible: true, required: false },
      batchNumber: { visible: true, required: false },
    }
  },

  'Pharmacy': {
    ...BASE_DEFAULTS,
    name: 'Pharmacy',
    features: { ...BASE_DEFAULTS.features, expiryTracking: true },
    fields: {
      ...BASE_DEFAULTS.fields,
      stockExpiryDate: { visible: true, required: true },
      batchNumber: { visible: true, required: true },
    }
  },

  'Clothing_Store': {
    ...BASE_DEFAULTS,
    name: 'Clothing Store',
    features: { ...BASE_DEFAULTS.features, variantSupport: true },
  },

  'Restaurant': {
    ...BASE_DEFAULTS,
    name: 'Restaurant / Cafe',
    defaultUnit: 'portion',
    features: { ...BASE_DEFAULTS.features, expiryTracking: true, variantSupport: false, barcodeGeneration: false },
    fields: {
       ...BASE_DEFAULTS.fields,
       barcode: { visible: false, required: false },
    }
  },

  'Beauty_Salon': {
    ...BASE_DEFAULTS,
    name: 'Beauty & wellness',
    features: { ...BASE_DEFAULTS.features, variantSupport: false, barcodeGeneration: false },
    fields: {
      ...BASE_DEFAULTS.fields,
      barcode: { visible: false, required: false },
      brand: { visible: true, required: false },
    }
  },

  'Hardware_Store': {
    ...BASE_DEFAULTS,
    name: 'Hardware Store',
    defaultUnit: 'kg',
    features: { ...BASE_DEFAULTS.features, variantSupport: true },
  }
};

// --- MERGE LOGIC ---
export const mergeConfiguration = (preset: InventoryPreset, override?: Partial<InventoryPreset>): InventoryPreset => {
    if (!override) return preset;

    return {
        ...preset,
        features: { ...preset.features, ...override.features },
        fields: {
            sku: { ...preset.fields.sku, ...override.fields?.sku },
            barcode: { ...preset.fields.barcode, ...override.fields?.barcode },
            brand: { ...preset.fields.brand, ...override.fields?.brand },
            category: { ...preset.fields.category, ...override.fields?.category },
            costPrice: { ...preset.fields.costPrice, ...override.fields?.costPrice },
            supplier: { ...preset.fields.supplier, ...override.fields?.supplier },
            stockIssueDate: { ...preset.fields.stockIssueDate, ...override.fields?.stockIssueDate },
            stockExpiryDate: { ...preset.fields.stockExpiryDate, ...override.fields?.stockExpiryDate },
            batchNumber: { ...preset.fields.batchNumber, ...override.fields?.batchNumber },
            serialNumber: { ...preset.fields.serialNumber, ...override.fields?.serialNumber },
        }
    };
};