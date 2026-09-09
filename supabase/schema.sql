-- ============================================================
-- LIKHA Database Schema & Seed Data
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Profiles (Admin/Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  unit TEXT NOT NULL DEFAULT 'piece',
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
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'pickup',
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  preferred_date DATE,
  notes TEXT,
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
  customer_phone TEXT NOT NULL,
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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'LIKHA Arts & Crafts',
  tagline TEXT DEFAULT 'Create something made just for you.',
  pickup_address TEXT DEFAULT 'Poblacion, Carigara, Leyte',
  pickup_notes TEXT DEFAULT 'Available for pickup 9 AM - 6 PM daily',
  facebook_page_url TEXT DEFAULT 'https://facebook.com',
  facebook_messenger_url TEXT DEFAULT 'https://m.me',
  default_delivery_fee DECIMAL(10,2) DEFAULT 50.00,
  default_markup DECIMAL(5,2) DEFAULT 1.6,
  currency_symbol TEXT DEFAULT '₱',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (RLS)
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

-- Public can read active catalog & settings
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view available products" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Public can view product photos" ON public.product_photos FOR SELECT USING (true);
CREATE POLICY "Public can view product options" ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Public can view business settings" ON public.business_settings FOR SELECT USING (true);

-- Public can insert orders & tracking
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own orders by reference" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Public can insert order options" ON public.order_item_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view order options" ON public.order_item_options FOR SELECT USING (true);
CREATE POLICY "Public can insert delivery locations" ON public.delivery_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view delivery locations" ON public.delivery_locations FOR SELECT USING (true);

-- Public can insert custom requests
CREATE POLICY "Public can insert custom requests" ON public.custom_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own custom requests" ON public.custom_requests FOR SELECT USING (true);
CREATE POLICY "Public can insert request images" ON public.custom_request_images FOR INSERT WITH CHECK (true);

-- Admin has full access to all tables
CREATE POLICY "Admin full access categories" ON public.categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access products" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access photos" ON public.product_photos FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access options" ON public.product_options FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access orders" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access order_items" ON public.order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access order_options" ON public.order_item_options FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access delivery" ON public.delivery_locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access requests" ON public.custom_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access request_images" ON public.custom_request_images FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access materials" ON public.materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access BOM" ON public.product_materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access purchases" ON public.purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access movements" ON public.stock_movements FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access settings" ON public.business_settings FOR ALL TO authenticated USING (true);

-- 4. SEED DATA

-- Insert default settings
INSERT INTO public.business_settings (business_name, tagline, pickup_address, default_delivery_fee)
VALUES ('LIKHA — Handmade & Creative Studio', 'Create something made just for you.', 'Brackett St, Poblacion, Carigara, Leyte', 50.00)
ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO public.categories (id, name, slug, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bouquets & Flowers', 'bouquets', 1),
  ('22222222-2222-2222-2222-222222222222', 'Crochet Art', 'crochet', 2),
  ('33333333-3333-3333-3333-333333333333', 'Resin Keepsakes', 'resin', 3),
  ('44444444-4444-4444-4444-444444444444', 'Bloom Boxes & Gifts', 'gift-boxes', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert Products
INSERT INTO public.products (id, category_id, name, slug, description, base_price, pricing_method, display_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Fuzzy Wire Rose Bouquet', 'fuzzy-wire-rose-bouquet', 'Handcrafted velvety fuzzy-wire roses wrapped in waterproof Korean matte kraft paper and tied with a silky satin ribbon. Everlasting flower art that never wilts.', 250.00, 'markup', 1),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Potted Crochet Sunflower', 'potted-crochet-sunflower', 'Delicately hand-knitted vibrant sunflower in a miniature terracotta-style knit pot. Perfect cheerful desk companion that brings sunshine every day.', 380.00, 'manual', 2),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Custom Floral Resin Bookmark', 'custom-floral-resin-bookmark', 'Crystal-clear artisan resin bookmark embedded with real pressed baby’s breath, dried lavender petals, gleaming gold foil accents, and a handmade silky tassel.', 160.00, 'markup', 3),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Lavender & Daisy Bloom Box', 'lavender-daisy-bloom-box', 'A luxurious round cylinder hatbox filled with meticulously shaped fuzzy-wire French lavender and cheery white daisies. Includes fairy lights and a ribbon bow.', 680.00, 'markup', 4),
  ('a5555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Eternal Glass Tulip Nightlight', 'eternal-glass-tulip-nightlight', 'Enchanting glass bell dome with glowing handmade crystal tulip petals and soft LED fairy lights nestled on a solid natural wood base.', 520.00, 'markup', 5),
  ('a6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Crochet Amigurumi Couple Keychain', 'crochet-amigurumi-keychain', 'Set of two adorable pocket-sized crochet mascots hand-stitched with soft milk cotton yarn. Features a durable gold-toned swivel clasp.', 240.00, 'manual', 6)
ON CONFLICT (slug) DO NOTHING;

-- Insert Product Options
INSERT INTO public.product_options (product_id, option_name, is_required, display_order, choices) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Rose Color', true, 1, '[{"label":"Pastel Blush Pink","extra_cost":0},{"label":"Crimson Velvet Red","extra_cost":0},{"label":"Lilac Lavender","extra_cost":0},{"label":"Sunflower Warm Yellow","extra_cost":0}]'),
  ('a1111111-1111-1111-1111-111111111111', 'Arrangement Size', true, 2, '[{"label":"Single Rose Stem","extra_cost":0},{"label":"3-Rose Trio (+₱200)","extra_cost":200},{"label":"6-Rose Deluxe Bloom (+₱450)","extra_cost":450}]'),
  ('a1111111-1111-1111-1111-111111111111', 'Wrapper Style', true, 3, '[{"label":"Korean Matte Kraft","extra_cost":0},{"label":"Frosted Translucent White","extra_cost":0},{"label":"Noir Black Gold-Trim","extra_cost":30}]'),
  ('a2222222-2222-2222-2222-222222222222', 'Pot Color', true, 1, '[{"label":"Terracotta Clay","extra_cost":0},{"label":"Oatmeal Beige","extra_cost":0},{"label":"Forest Moss Green","extra_cost":0}]'),
  ('a2222222-2222-2222-2222-222222222222', 'Mini Greeting Tag', true, 2, '[{"label":"You Are My Sunshine ☀️","extra_cost":0},{"label":"Best Wishes ✨","extra_cost":0},{"label":"Happy Birthday 🎂","extra_cost":0}]'),
  ('a3333333-3333-3333-3333-333333333333', 'Metallic Accent', true, 1, '[{"label":"24K Gold Flakes","extra_cost":0},{"label":"Rose Gold Shimmer","extra_cost":0},{"label":"Silver Leaf","extra_cost":0}]'),
  ('a3333333-3333-3333-3333-333333333333', 'Tassel Color', true, 2, '[{"label":"Dusty Rose","extra_cost":0},{"label":"Champagne Gold","extra_cost":0},{"label":"Sage Emerald","extra_cost":0}]')
ON CONFLICT DO NOTHING;

-- Insert Materials
INSERT INTO public.materials (id, name, unit, current_stock, minimum_stock, current_unit_cost) VALUES
  ('m1111111-1111-1111-1111-111111111111', 'Chenille Fuzzy Wire (Blush Pink)', 'pcs', 18, 50, 2.50),
  ('m2222222-2222-2222-2222-222222222222', 'Satin Ribbon (Blush 2.5cm)', 'meters', 4.5, 15, 5.00),
  ('m3333333-3333-3333-3333-333333333333', 'Milk Cotton Yarn (Yellow)', 'skeins', 6, 2, 65.00),
  ('m4444444-4444-4444-4444-444444444444', 'Korean Matte Wrapping Paper', 'sheets', 35, 10, 15.00),
  ('m5555555-5555-5555-5555-555555555555', 'Epoxy Resin Clear (A+B)', 'mL', 1400, 500, 0.45),
  ('m6666666-6666-6666-6666-666666666666', 'Hot Glue Sticks (11mm)', 'sticks', 12, 20, 6.00)
ON CONFLICT DO NOTHING;

-- 5. STORAGE BUCKETS (Optional, auto-created)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('product-photos', 'product-photos', true),
  ('inspiration-photos', 'inspiration-photos', true),
  ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view product photos bucket" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
CREATE POLICY "Public can upload inspiration photos bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspiration-photos');

-- 6. FEEDBACKS & REVIEWS

-- General Store Feedbacks & Suggestions (From Floating Speed Dial)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  topic TEXT NOT NULL DEFAULT 'General Feedback',
  message TEXT NOT NULL,
  customer_name TEXT,
  customer_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Reviews & Star Ratings (From Product Details Page)
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

-- Enable RLS & Policies
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Anyone can submit product review" ON public.product_reviews FOR INSERT WITH CHECK (true);

