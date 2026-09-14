const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const ddl = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (Admin/Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  pricing_method TEXT DEFAULT 'markup',
  markup_value DECIMAL(5,2) DEFAULT 1.5,
  is_available BOOLEAN DEFAULT true,
  is_bestseller BOOLEAN DEFAULT false,
  is_ready_made BOOLEAN DEFAULT false,
  ready_made_stock INT DEFAULT 0,
  is_on_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10,2) DEFAULT 0,
  sale_tag TEXT DEFAULT '',
  is_sold_out BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Photos
CREATE TABLE IF NOT EXISTS public.product_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_cover BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Options
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  choices JSONB NOT NULL DEFAULT '[]',
  is_required BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materials
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  category TEXT DEFAULT 'Supplies',
  current_unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Materials (BOM)
CREATE TABLE IF NOT EXISTS public.product_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Movements (Audit Trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  facebook_name TEXT DEFAULT '',
  order_type TEXT NOT NULL DEFAULT 'pickup',
  status TEXT NOT NULL DEFAULT 'confirmed',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  rush_fee DECIMAL(10,2) DEFAULT 0,
  is_rush BOOLEAN DEFAULT false,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  preferred_date DATE,
  preferred_time TEXT,
  notes TEXT,
  messenger_opened_at TIMESTAMPTZ,
  sent_to_messenger BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Item Options
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  option_value TEXT NOT NULL,
  additional_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Locations
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  landmark_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Requests
CREATE TABLE IF NOT EXISTS public.custom_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT UNIQUE NOT NULL,
  source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  facebook_name TEXT DEFAULT '',
  description TEXT NOT NULL,
  preferred_color TEXT,
  budget DECIMAL(10,2),
  quantity INT DEFAULT 1,
  preferred_date DATE,
  additional_notes TEXT,
  status TEXT DEFAULT 'pending',
  quoted_price DECIMAL(10,2),
  admin_notes TEXT,
  converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Request Images
CREATE TABLE IF NOT EXISTS public.custom_request_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custom_request_id UUID REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL DEFAULT 'other',
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  receipt_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'M&M Artsy — Handmade & Creative Studio',
  tagline TEXT DEFAULT 'Create something made just for you.',
  pickup_address TEXT DEFAULT 'Barugo / Carigara, Leyte',
  pickup_notes TEXT DEFAULT 'Available for pickup 9 AM - 6 PM daily',
  facebook_page_url TEXT DEFAULT 'https://facebook.com/mmartsy',
  facebook_messenger_url TEXT DEFAULT 'https://m.me/mmartsy',
  default_delivery_fee DECIMAL(10,2) DEFAULT 35.00,
  default_markup DECIMAL(5,2) DEFAULT 1.5,
  currency_symbol TEXT DEFAULT '₱',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  topic TEXT NOT NULL DEFAULT 'General Feedback',
  message TEXT NOT NULL,
  customer_name TEXT,
  customer_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  customer_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_verified_buyer BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to recreate cleanly
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Create open access policies for public schema tables
CREATE POLICY "Full access profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access categories" ON public.categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access photos" ON public.product_photos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access options" ON public.product_options FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access order_items" ON public.order_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access order_item_options" ON public.order_item_options FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access delivery" ON public.delivery_locations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access requests" ON public.custom_requests FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access request_images" ON public.custom_request_images FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access materials" ON public.materials FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access BOM" ON public.product_materials FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access purchases" ON public.purchases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access movements" ON public.stock_movements FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access expenses" ON public.expenses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access settings" ON public.business_settings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access feedbacks" ON public.feedbacks FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Full access product_reviews" ON public.product_reviews FOR ALL TO public USING (true) WITH CHECK (true);

-- Grant privileges to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Enable Realtime for orders and custom requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
`;

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Running DDL script...');
    await client.query(ddl);
    console.log('Schema created successfully!');

    // Check tables
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
    console.log('Created tables:', res.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('Error running setup:', err);
    process.exit(1);
  }
}

run();
