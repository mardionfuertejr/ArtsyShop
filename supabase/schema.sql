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

-- Catalog, Products & Materials full management policies
CREATE POLICY "Full access categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Full access products" ON public.products FOR ALL USING (true);
CREATE POLICY "Full access photos" ON public.product_photos FOR ALL USING (true);
CREATE POLICY "Full access options" ON public.product_options FOR ALL USING (true);
CREATE POLICY "Full access orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Full access order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Full access order_options" ON public.order_item_options FOR ALL USING (true);
CREATE POLICY "Full access delivery" ON public.delivery_locations FOR ALL USING (true);
CREATE POLICY "Full access requests" ON public.custom_requests FOR ALL USING (true);
CREATE POLICY "Full access request_images" ON public.custom_request_images FOR ALL USING (true);
CREATE POLICY "Full access materials" ON public.materials FOR ALL USING (true);
CREATE POLICY "Full access BOM" ON public.product_materials FOR ALL USING (true);
CREATE POLICY "Full access purchases" ON public.purchases FOR ALL USING (true);
CREATE POLICY "Full access movements" ON public.stock_movements FOR ALL USING (true);
CREATE POLICY "Full access expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Full access settings" ON public.business_settings FOR ALL USING (true);

-- 4. SEED DATA

-- Insert default settings
INSERT INTO public.business_settings (business_name, tagline, pickup_address, default_delivery_fee)
VALUES ('LIKHA — Handmade & Creative Studio', 'Create something made just for you.', 'Brackett St, Poblacion, Carigara, Leyte', 50.00)
ON CONFLICT DO NOTHING;

-- Insert 10 Raw Materials
INSERT INTO public.materials (id, name, unit, current_stock, minimum_stock, current_unit_cost) VALUES
  ('m1000001-0000-0000-0000-000000000001', 'Chenille Fuzzy Wire Stems (Pastel Pink & Peach)', 'pcs', 150.00, 30.00, 2.50),
  ('m1000002-0000-0000-0000-000000000002', 'Chenille Fuzzy Wire Stems (Botanical Olive & Sage)', 'pcs', 120.00, 30.00, 2.50),
  ('m1000003-0000-0000-0000-000000000003', '5-Ply Milk Cotton Yarn (Soft Sunflower Yellow - 50g)', 'skeins', 18.00, 5.00, 65.00),
  ('m1000004-0000-0000-0000-000000000004', '5-Ply Milk Cotton Yarn (Pure Cream White - 50g)', 'skeins', 22.00, 5.00, 65.00),
  ('m1000005-0000-0000-0000-000000000005', 'Epoxy Resin Crystal Clear A+B Kit (Low Viscosity)', 'mL', 1400.00, 300.00, 0.45),
  ('m1000006-0000-0000-0000-000000000006', 'Korean Waterproof Matte Wrapping Paper (Blush & Neutral)', 'sheets', 45.00, 10.00, 15.00),
  ('m1000007-0000-0000-0000-000000000007', 'Double-Faced Silky Satin Ribbon (2.5cm Champagne)', 'meters', 60.00, 15.00, 5.00),
  ('m1000008-0000-0000-0000-000000000008', '18-Gauge Floral Stem Wire (30cm Stiff Green)', 'pcs', 200.00, 40.00, 3.00),
  ('m1000009-0000-0000-0000-000000000009', 'High-Temp Hot Melt Glue Sticks (11mm Clear)', 'sticks', 35.00, 15.00, 6.00),
  ('m1000010-0000-0000-0000-000000000010', 'Glass Bell Dome with Solid Wood Base & Warm LED', 'sets', 12.00, 4.00, 180.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  current_stock = EXCLUDED.current_stock,
  minimum_stock = EXCLUDED.minimum_stock,
  current_unit_cost = EXCLUDED.current_unit_cost;

-- Insert 30 Products (category_id is NULL, categories will be added & assigned by user)
INSERT INTO public.products (id, category_id, name, slug, description, base_price, pricing_method, is_available, display_order) VALUES
  ('p1000001-0000-0000-0000-000000000001', NULL, 'Fuzzy Wire Rose Bouquet', 'fuzzy-wire-rose-bouquet', 'Handcrafted velvety fuzzy-wire roses wrapped in waterproof Korean matte kraft paper and tied with a silky satin ribbon. Everlasting flower art that never wilts.', 250.00, 'markup', true, 1),
  ('p1000002-0000-0000-0000-000000000002', NULL, 'Potted Handcrafted Crochet Sunflower', 'potted-crochet-sunflower', 'Delicately hand-knitted vibrant sunflower in a miniature terracotta-style knit pot. Perfect cheerful desk companion that brings sunshine every day.', 380.00, 'manual', true, 2),
  ('p1000003-0000-0000-0000-000000000003', NULL, 'Crystal Floral Resin Bookmark', 'crystal-floral-resin-bookmark', 'Crystal-clear artisan resin bookmark embedded with real pressed baby’s breath, dried lavender petals, gleaming gold foil accents, and a handmade silky tassel.', 160.00, 'markup', true, 3),
  ('p1000004-0000-0000-0000-000000000004', NULL, 'Lavender & Daisy Bloom Box', 'lavender-daisy-bloom-box', 'A luxurious round cylinder hatbox filled with meticulously shaped fuzzy-wire French lavender and cheery white daisies. Includes fairy lights and a ribbon bow.', 680.00, 'markup', true, 4),
  ('p1000005-0000-0000-0000-000000000005', NULL, 'Eternal Glass Tulip Nightlight', 'eternal-glass-tulip-nightlight', 'Enchanting glass bell dome with glowing handmade crystal tulip petals and soft LED fairy lights nestled on a solid natural wood base.', 520.00, 'markup', true, 5),
  ('p1000006-0000-0000-0000-000000000006', NULL, 'Crochet Amigurumi Couple Keychain', 'crochet-amigurumi-couple-keychain', 'Set of two adorable pocket-sized crochet mascots hand-stitched with soft milk cotton yarn. Features a durable gold-toned swivel clasp.', 240.00, 'manual', true, 6),
  ('p1000007-0000-0000-0000-000000000007', NULL, 'Chenille Fuzzy Wire Sunflower Bouquet', 'fuzzy-wire-sunflower-bouquet', 'Sunny handcrafted fuzzy-wire sunflowers paired with delicate greenery and premium frosted Korean wrapping paper.', 320.00, 'markup', true, 7),
  ('p1000008-0000-0000-0000-000000000008', NULL, 'Artisan Botanical Resin Coaster Set', 'artisan-botanical-resin-coasters', 'Set of 4 heat-resistant resin drink coasters with encapsulated dried wild blossoms, shimmer mica powder, and hand-painted metallic gold rims.', 450.00, 'manual', true, 8),
  ('p1000009-0000-0000-0000-000000000009', NULL, 'Hand-Crocheted Daisy Flower Pot', 'crochet-daisy-flower-pot', 'Cute tabletop potted daisy hand-knitted from soft cotton yarn with flexible bendable stems.', 350.00, 'manual', true, 9),
  ('p1000010-0000-0000-0000-000000000010', NULL, 'Pastel Chenille Tulip Garden in Ceramic Mug', 'pastel-chenille-tulip-mug', 'Trio of pastel pink, peach, and cream fuzzy-wire tulips artfully arranged in a reusable ceramic keepsake mug.', 390.00, 'markup', true, 10),
  ('p1000011-0000-0000-0000-000000000011', NULL, 'Personalized Initial Floral Resin Keychain', 'personalized-initial-resin-keychain', 'Alphabet letter keychain hand-poured with real pressed botanicals, fine foil flakes, and a sturdy alloy key ring.', 140.00, 'manual', true, 11),
  ('p1000012-0000-0000-0000-000000000012', NULL, 'Crochet Lily of the Valley Glowing Lamp', 'crochet-lily-of-the-valley-lamp', 'Delicate bell-shaped crocheted blossoms embedded with gentle warm micro-LED bulbs for a dreamy bedside glow.', 590.00, 'manual', true, 12),
  ('p1000013-0000-0000-0000-000000000013', NULL, 'Fuzzy Wire Blue Hydrangea Bloom Arrangement', 'fuzzy-wire-blue-hydrangea', 'Dense cluster of soft sky-blue and lavender fuzzy-wire hydrangea florets in premium textured gift wrapping.', 480.00, 'markup', true, 13),
  ('p1000014-0000-0000-0000-000000000014', NULL, 'Custom Spotify Code Floral Resin Plaque', 'custom-spotify-floral-resin-plaque', 'Clear acrylic resin desk plaque showcasing your favorite song title, scannable Spotify sound code, and dried flowers on a beech wood stand.', 650.00, 'manual', true, 14),
  ('p1000015-0000-0000-0000-000000000015', NULL, 'Handcrafted Crochet Strawberry Vine Hanging', 'crochet-strawberry-vine-hanging', 'Playful hand-stitched red strawberries and blossom flowers on a hanging vine designed for car mirrors or study nooks.', 280.00, 'manual', true, 15),
  ('p1000016-0000-0000-0000-000000000016', NULL, 'Velvet Chenille Lavender Stems Bundle', 'velvet-chenille-lavender-bundle', 'Bundle of 10 long-stem fuzzy-wire lavender sprigs tied with rustic jute twine and purple organza ribbon.', 340.00, 'markup', true, 16),
  ('p1000017-0000-0000-0000-000000000017', NULL, 'Pressed Floral Resin Hair Claw Clip', 'pressed-floral-resin-hair-claw', 'Elegant French-style hair claw clip with crystal clear resin overlay, genuine dried hydrangeas, and gold shimmer.', 180.00, 'manual', true, 17),
  ('p1000018-0000-0000-0000-000000000018', NULL, 'Hand-Knitted Crochet Rose Bud in Gift Tube', 'crochet-single-rose-gift-tube', 'Single artisan-knitted red rose in a clear acrylic display cylinder with custom message ribbon.', 220.00, 'manual', true, 18),
  ('p1000019-0000-0000-0000-000000000019', NULL, 'Mini Preserved Gypsophila & Fuzzy Daisy Gift Box', 'gypsophila-fuzzy-daisy-gift-box', 'Compact square gift box adorned with fluffy fuzzy-wire daisies surrounded by airy dried baby’s breath.', 420.00, 'markup', true, 19),
  ('p1000020-0000-0000-0000-000000000020', NULL, 'Crochet Succulent & Cactus Trio Terrarium', 'crochet-succulent-cactus-trio', 'Trio of hand-knit miniature desert succulents and flowering cacti in a stylish ceramic bowl.', 560.00, 'manual', true, 20),
  ('p1000021-0000-0000-0000-000000000021', NULL, 'Fuzzy Wire Cherry Blossom Branch', 'fuzzy-wire-cherry-blossom-branch', 'Graceful Japanese sakura branch crafted with soft pink chenille stems and flexible bendable twigs.', 390.00, 'markup', true, 21),
  ('p1000022-0000-0000-0000-000000000022', NULL, 'Artisan Resin Trinket Tray with Gold Leaf', 'resin-trinket-tray-gold-leaf', 'Oval resin catchall tray for rings, jewelry, and perfume bottles featuring real dried rose petals.', 320.00, 'manual', true, 22),
  ('p1000023-0000-0000-0000-000000000023', NULL, 'Handmade Crochet Cute Bunny Charm Keychain', 'crochet-bunny-charm-keychain', 'Fluffy amigurumi bunny charm wearing a miniature pastel sweater, complete with tiny bell and bead accents.', 190.00, 'manual', true, 23),
  ('p1000024-0000-0000-0000-000000000024', NULL, 'Enchanted Forest Resin Floral Pendant Necklace', 'resin-floral-pendant-necklace', 'Teardrop resin cabochon with preserved moss and forget-me-not blossoms on an 18K gold-plated stainless chain.', 290.00, 'manual', true, 24),
  ('p1000025-0000-0000-0000-000000000025', NULL, 'Fuzzy Wire Carnation Tribute Bouquet', 'fuzzy-wire-carnation-tribute-bouquet', 'Layered fluffy pink and coral carnations symbolizing gratitude and love, wrapped with a satin bow.', 460.00, 'markup', true, 25),
  ('p1000026-0000-0000-0000-000000000026', NULL, 'Crochet Hanging Car Mirror Floral Charm', 'crochet-car-mirror-floral-charm', 'Charming double-blossom dangling floral accessory for car rearview mirrors with adjustable cord.', 210.00, 'manual', true, 26),
  ('p1000027-0000-0000-0000-000000000027', NULL, 'Resin Embedded Floral Compact Pocket Mirror', 'resin-floral-compact-pocket-mirror', 'Dual-magnification foldable metal compact mirror with a bespoke botanical resin top shell.', 310.00, 'manual', true, 27),
  ('p1000028-0000-0000-0000-000000000028', NULL, 'Fuzzy Wire Red Poppy & Eucalyptus Hand Spray', 'fuzzy-wire-red-poppy-spray', 'Bold scarlet fuzzy poppies arranged with sage green chenille eucalyptus foliage.', 380.00, 'markup', true, 28),
  ('p1000029-0000-0000-0000-000000000029', NULL, 'Crochet Heart Daisy Keychain Pair', 'crochet-heart-daisy-keychain-pair', 'Matching pair of knit puffy heart and sunshine daisy keychains with secure lobster clasps.', 230.00, 'manual', true, 29),
  ('p1000030-0000-0000-0000-000000000030', NULL, 'Galaxy Glitter Floral Resin Ballpoint Pen', 'galaxy-glitter-floral-resin-pen', 'Smooth refillable ballpoint pen with handcrafted floral crystal barrel and rose gold accents.', 150.00, 'manual', true, 30)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  pricing_method = EXCLUDED.pricing_method,
  is_available = EXCLUDED.is_available,
  display_order = EXCLUDED.display_order;

-- Insert Product Options
INSERT INTO public.product_options (product_id, option_name, is_required, display_order, choices) VALUES
  ('p1000001-0000-0000-0000-000000000001', 'Rose Color', true, 1, '[{"label":"Pastel Blush Pink","extra_cost":0},{"label":"Crimson Velvet Red","extra_cost":0},{"label":"Lilac Lavender","extra_cost":0},{"label":"Sunflower Warm Yellow","extra_cost":0}]'),
  ('p1000001-0000-0000-0000-000000000001', 'Arrangement Size', true, 2, '[{"label":"Single Rose Stem","extra_cost":0},{"label":"3-Rose Trio (+₱200)","extra_cost":200},{"label":"6-Rose Deluxe Bloom (+₱450)","extra_cost":450}]'),
  ('p1000002-0000-0000-0000-000000000002', 'Pot Color', true, 1, '[{"label":"Terracotta Clay","extra_cost":0},{"label":"Oatmeal Beige","extra_cost":0},{"label":"Forest Moss Green","extra_cost":0}]'),
  ('p1000003-0000-0000-0000-000000000003', 'Metallic Accent', true, 1, '[{"label":"24K Gold Flakes","extra_cost":0},{"label":"Rose Gold Shimmer","extra_cost":0},{"label":"Silver Leaf","extra_cost":0}]'),
  ('p1000004-0000-0000-0000-000000000004', 'Hatbox Color', true, 1, '[{"label":"Pearl White","extra_cost":0},{"label":"Blush Pink","extra_cost":0},{"label":"Midnight Black","extra_cost":0}]'),
  ('p1000005-0000-0000-0000-000000000005', 'Tulip Color', true, 1, '[{"label":"Blush Pink","extra_cost":0},{"label":"Lavender Purple","extra_cost":0},{"label":"Sunshine Yellow","extra_cost":0}]')
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

