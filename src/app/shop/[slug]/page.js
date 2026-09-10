import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import ProductDetailClient from './ProductDetailClient';
import { getMockProductBySlug } from '@/lib/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getProduct = cache(async (slug) => {
  if (!slug) return null;
  const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();

  try {
    const supabase = await createClient();
    if (supabase) {
      // 1. Try full select
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, is_on_sale, sale_price, sale_tag, is_sold_out, is_ready_made, ready_made_stock, description, pricing_method,
          category:categories(id, name, slug),
          product_photos(id, storage_path, is_cover, display_order),
          product_options(id, option_name, choices, is_required, display_order)
        `)
        .ilike('slug', cleanSlug)
        .eq('is_available', true)
        .maybeSingle();

      if (!error && data) return data;

      // 2. Fallback simpler select if some columns/joins don't exist yet
      const { data: simpleData } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, description, pricing_method, is_available,
          product_photos(id, storage_path, is_cover, display_order),
          product_options(id, option_name, choices, is_required, display_order)
        `)
        .ilike('slug', cleanSlug)
        .maybeSingle();

      if (simpleData) return simpleData;
    }
  } catch (err) {
    // Fallback to mock data
  }
  return getMockProductBySlug(cleanSlug) || getMockProductBySlug(slug);
});

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product Details — M&M Artsy' };
  return {
    title: `${product.name} — M&M Artsy`,
    description: product.description || `Order ${product.name} from M&M Artsy`,
  };
}

export default async function ProductDetailPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const product = await getProduct(slug);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Build sorted photo list with public URLs if product found on server
  let photos = [];
  if (product && Array.isArray(product.product_photos) && product.product_photos.length > 0) {
    photos = [...product.product_photos]
      .sort((a, b) => {
        if (a.is_cover) return -1;
        if (b.is_cover) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      })
      .map((p) => ({
        id: p.id || Math.random().toString(),
        url: p.url || (
          p.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')
            ? `${supabaseUrl}/storage/v1/object/public/product-photos/${p.storage_path}`
            : (p.storage_path || 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80')
        ),
      }));
  }

  // Sort options if available
  const sortedOptions = (product?.product_options || []).sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  return (
    <ProductDetailClient
      product={product ? { ...product, product_options: sortedOptions } : null}
      photos={photos}
      slug={slug}
    />
  );
}
