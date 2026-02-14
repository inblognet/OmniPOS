-- 1. Enable UUID extension (optional, but good for scaling IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCTS TABLE
-- Mirrors Dexie 'products' store
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY, -- Maps to Dexie '++id'
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    category TEXT, -- Stored as comma-separated string based on current frontend logic
    brand TEXT,
    type TEXT DEFAULT 'Stock', -- 'Stock', 'Non-Stock', 'Service'
    variant_group TEXT, -- Mapped from 'variantGroup'
    variant_name TEXT,  -- Mapped from 'variantName'
    stock_issue_date TIMESTAMP, -- Mapped from 'stockIssueDate'
    stock_expiry_date TIMESTAMP, -- Mapped from 'stockExpiryDate'
    batch_number TEXT, -- Mapped from 'batchNumber'
    serial_number TEXT, -- Mapped from 'serialNumber'

    -- Numeric Fields
    cost_price DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'costPrice'
    price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'wholesalePrice'
    min_selling_price DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'minSellingPrice'

    -- Boolean Flags
    is_tax_included BOOLEAN DEFAULT FALSE, -- Mapped from 'isTaxIncluded'
    allow_discount BOOLEAN DEFAULT TRUE, -- Mapped from 'allowDiscount'
    fractional_allowed BOOLEAN DEFAULT FALSE, -- Mapped from 'fractionalAllowed'
    allow_negative_stock BOOLEAN DEFAULT FALSE, -- Mapped from 'allowNegativeStock'
    is_active BOOLEAN DEFAULT TRUE, -- Mapped from 'isActive'

    -- Inventory Data
    unit TEXT DEFAULT 'pcs',
    stock DECIMAL(10, 2) DEFAULT 0,
    reorder_level DECIMAL(10, 2) DEFAULT 5, -- Mapped from 'reorderLevel'
    max_stock_level DECIMAL(10, 2) DEFAULT 100, -- Mapped from 'maxStockLevel'

    -- Calculated/Aggregate Fields
    total_qty DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'totalQty'
    damaged_qty DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'damagedQty'
    expired_qty DECIMAL(10, 2) DEFAULT 0, -- Mapped from 'expiredQty'

    -- Complex Data (Mirrors Dexie Object Arrays)
    batches JSONB DEFAULT '[]'::jsonb, -- Stores array of batch objects

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Speed (Reflecting Dexie's simple indexes)
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 4. ORDERS TABLE (Sales History)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER, -- Can link to customers table later
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT, -- 'CASH', 'CARD', etc.
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'refunded'
    items JSONB NOT NULL, -- Stores the cart items snapshot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points DECIMAL(10, 2) DEFAULT 0,
    total_spend DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. SETTINGS TABLE (Store Config)
CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    store_name TEXT,
    phone_number TEXT,
    address TEXT,
    currency_symbol TEXT DEFAULT '$',
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. OVERRIDES TABLE (Feature Flags)
CREATE TABLE IF NOT EXISTS inventory_overrides (
    id SERIAL PRIMARY KEY,
    override_json JSONB -- Stores the feature toggles
);