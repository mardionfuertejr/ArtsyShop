import { createClient } from '@/lib/supabase/server';
import { getMockProducts, getMockCategories } from '@/lib/mockData';
import ShopClient from './ShopClient';

export const revalidate = 30;

export const metadata = {
  title: 'Collection & Catalog',
  description: 'Browse all handmade bouquets, crochet art, and custom gifts available from M&M\'s Artsy.',
};

async function getProducts() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, description, category_id, is_ready_made, ready_made_stock,
          is_on_sale, sale_price, sale_tag, is_sold_out, is_bestseller,
          category:categories(id, name, slug),
          product_photos(storage_path, is_cover, display_order)
        `)
        .eq('is_available', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) return data;
    }
  } catch (err) {
    // Fallback to mock
  }
  return getMockProducts('all').filter((p) => p.is_available !== false);
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

export default async function ShopPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const categorySlug = resolvedSearchParams?.category || 'all';
  const searchQuery = (resolvedSearchParams?.q || '').trim().toLowerCase();

  const [rawProducts, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <ShopClient
      initialProducts={rawProducts}
      initialCategories={categories}
      initialCategorySlug={categorySlug}
      searchQuery={searchQuery}
    />
  );
}

