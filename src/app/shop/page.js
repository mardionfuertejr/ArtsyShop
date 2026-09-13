import Link from 'next/link';
import { CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import LazyProductGrid from '@/components/customer/LazyProductGrid';
import CartIconBtn from '@/components/customer/CartIconBtn';
import { createClient } from '@/lib/supabase/server';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';

export const revalidate = 30;

export const metadata = {
  title: 'Collection & Catalog',
  description: 'Browse all handmade bouquets, crochet art, and custom gifts available from M&M\'s Artsy.',
};

import { getMockProducts, getMockCategories } from '@/lib/mockData';

async function getProducts(categorySlug) {
  try {
    const supabase = await createClient();
    if (supabase) {
      let query = supabase
        .from('products')
        .select(`
          id, name, slug, base_price, description, category_id, is_ready_made, ready_made_stock,
          is_on_sale, sale_price, sale_tag, is_sold_out, is_bestseller,
          category:categories(id, name, slug),
          product_photos(storage_path, is_cover, display_order)
        `)
        .eq('is_available', true)
        .order('display_order', { ascending: true });

      if (categorySlug === 'ready-made') {
        query = query.eq('is_ready_made', true);
      } else if (categorySlug && categorySlug !== 'all') {
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();
        if (catData) {
          query = query.eq('category_id', catData.id);
        }
      }

      const { data } = await query;
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock
  }
  return getMockProducts(categorySlug).filter((p) => p.is_available !== false);
}

async function getCategories() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock
  }
  return getMockCategories();
}

import HeaderSearchBar from '@/components/customer/HeaderSearchBar';

export default async function ShopPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const categorySlug = resolvedSearchParams?.category || 'all';
  const searchQuery = (resolvedSearchParams?.q || '').trim().toLowerCase();

  const [rawProducts, categories] = await Promise.all([
    getProducts(categorySlug),
    getCategories(),
  ]);

  // Filter by search query if present
  const products = searchQuery
    ? rawProducts.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(searchQuery);
        const descMatch = p.description?.toLowerCase().includes(searchQuery);
        const numQ = parseFloat(searchQuery.replace(/[^0-9.]/g, ''));
        const priceMatch = !isNaN(numQ) && (
          p.base_price?.toString().includes(Math.round(numQ).toString()) ||
          (p.sale_price && p.sale_price?.toString().includes(Math.round(numQ).toString()))
        );
        return nameMatch || descMatch || priceMatch;
      })
    : rawProducts;

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link active">Collection</Link>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="page-content">
        {/* Category Filter Tabs */}
        <nav aria-label="Filter by category">
          <div className="category-tabs">
            <Link
              href="/shop"
              className={`category-tab${categorySlug === 'all' ? ' active' : ''}`}
            >
              All Pieces
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className={`category-tab${categorySlug === cat.slug ? ' active' : ''}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Product Grid */}
        <section className="section" aria-label="Products">
          <LazyProductGrid products={products} initialCount={10} batchSize={10} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
