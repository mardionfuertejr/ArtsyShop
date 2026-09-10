import Link from 'next/link';
import { CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import SiteFooter from '@/components/common/SiteFooter';
import HomeShowcaseTabs from '@/components/customer/HomeShowcaseTabs';
import CartIconBtn from '@/components/customer/CartIconBtn';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';
import { getMockProducts, getMockCategories } from '@/lib/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'M&M Artsy — Handmade Bouquets, Crochet & Gifts',
  description: 'Order handcrafted bouquets, crochet, resin and custom gifts from M&M Artsy.',
};

async function getFeaturedProducts() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, is_ready_made, ready_made_stock,
          is_on_sale, sale_price, sale_tag, is_sold_out, is_bestseller,
          product_photos (storage_path, is_cover, display_order)
        `)
        .eq('is_available', true)
        .order('display_order', { ascending: true });
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock data
  }
  return getMockProducts('all').filter((p) => p.is_available !== false);
}

async function getReadyMadeProducts() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, is_ready_made, ready_made_stock,
          is_on_sale, sale_price, sale_tag, is_sold_out, is_bestseller,
          product_photos (storage_path, is_cover, display_order)
        `)
        .eq('is_available', true)
        .eq('is_ready_made', true)
        .order('display_order', { ascending: true })
        .limit(6);
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock data
  }
  return getMockProducts('ready-made').filter((p) => p.is_available !== false);
}

async function getCategories() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(8);
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock categories
  }
  return getMockCategories();
}

import HeaderSearchBar from '@/components/customer/HeaderSearchBar';

export default async function HomePage() {
  const [products, readyMadeProducts] = await Promise.all([
    getFeaturedProducts(),
    getReadyMadeProducts(),
  ]);

  return (
    <div className="customer-shell">
      {/* Top Bar with BrandLogo & Desktop Nav */}
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link active">Home</Link>
          <Link href="/shop" className="top-bar-link">Collection</Link>
          <Link href="/custom-request" className="top-bar-link">Custom Orders</Link>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="page-content">
        {/* ── CURATED SHOWCASE TABS (Bestsellers | On-Hand | Promos) ──────────────── */}
        <HomeShowcaseTabs allProducts={products} />

        {/* Unified Sticky-Bottom Site Footer */}
        <SiteFooter />
      </main>

      <BottomNav />
    </div>
  );
}
