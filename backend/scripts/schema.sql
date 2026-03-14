-- 1. Enable UUID extension (optional, but good for scaling IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    category TEXT,
    brand TEXT,
    type TEXT DEFAULT 'Stock',
    variant_group TEXT,
    variant_name TEXT,
    stock_issue_date TIMESTAMP,
    stock_expiry_date TIMESTAMP,
    batch_number TEXT,
    serial_number TEXT,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    wholesale_price DECIMAL(10, 2) DEFAULT 0,
    min_selling_price DECIMAL(10, 2) DEFAULT 0,
    is_tax_included BOOLEAN DEFAULT FALSE,
    allow_discount BOOLEAN DEFAULT TRUE,
    fractional_allowed BOOLEAN DEFAULT FALSE,
    allow_negative_stock BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    unit TEXT DEFAULT 'pcs',
    stock DECIMAL(10, 2) DEFAULT 0,
    reorder_level DECIMAL(10, 2) DEFAULT 5,
    max_stock_level DECIMAL(10, 2) DEFAULT 100,
    total_qty DECIMAL(10, 2) DEFAULT 0,
    damaged_qty DECIMAL(10, 2) DEFAULT 0,
    expired_qty DECIMAL(10, 2) DEFAULT 0,
    batches JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Speed
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
    customer_id INTEGER,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    type TEXT DEFAULT 'Walk-in',
    loyalty_joined BOOLEAN DEFAULT false,
    loyalty_points DECIMAL(10, 2) DEFAULT 0,
    total_spend DECIMAL(10, 2) DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    last_purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. BUSINESS SETTINGS TABLE (Store Config)
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
    override_json JSONB
);

-- 8. DAMAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS damage_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    qty DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    returned_quantity INTEGER DEFAULT 0
);

-- 10. STORE INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS store_integrations (
    id SERIAL PRIMARY KEY,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);