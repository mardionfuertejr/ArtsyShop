import { createClient } from '@/lib/supabase/server';
import { getMockProducts, getMockCategories } from '@/lib/mockData';
import AdminProductsClient from './AdminProductsClient';

export const metadata = { title: "Products Management | M&M's Artsy Admin" };

export default async function AdminProductsPage() {
  let products = [];
  let categories = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name, slug, base_price, description, pricing_method, is_available, display_order, category_id,
            category:categories(id, name, slug),
            product_photos(id, url, storage_path, is_cover, display_order),
            product_options(id, option_name, choices, is_required, display_order)
          `)
          .order('display_order', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true }),
      ]);

      if (prodRes.data && prodRes.data.length > 0) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        products = prodRes.data.map((p) => ({
          ...p,
          product_photos: (p.product_photos || []).map((ph) => ({
            ...ph,
            url: ph.url || (
              ph.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')
                ? `${supabaseUrl}/storage/v1/object/public/product-photos/${ph.storage_path}`
                : 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80'
            ),
          })),
        }));
      }

      if (catRes.data && catRes.data.length > 0) {
        categories = catRes.data;
      }
    }
  } catch (err) {
    // Fallback to mock data
  }

  if (products.length === 0) {
    products = getMockProducts();
  }
  if (categories.length === 0) {
    categories = getMockCategories();
  }

  return <AdminProductsClient initialProducts={products} categories={categories} />;
}
