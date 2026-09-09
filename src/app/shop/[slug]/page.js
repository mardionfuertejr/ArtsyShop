import { notFound } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getMockProductBySlug } from '@/lib/mockData';

const getProduct = cache(async (slug) => {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('products')
        .select(`
          id, name, slug, base_price, is_on_sale, sale_price, sale_tag, is_sold_out, is_ready_made, ready_made_stock, lead_time_days, description, pricing_method,
          category:categories(id, name, slug),
          product_photos(id, storage_path, is_cover, display_order),
          product_options(id, option_name, choices, is_required, display_order)
        `)
        .eq('slug', slug)
        .eq('is_available', true)
        .single();
      if (data) return data;
    }
  } catch (err) {
    // Fallback to mock
  }
  return getMockProductBySlug(slug);
});

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);
  if (!product) return { title: 'Product Not Found — M&M Artsy' };
  return {
    title: `${product.name} — M&M Artsy`,
    description: product.description || `Order ${product.name} from M&M Artsy`,
  };
}

export default async function ProductDetailPage({ params }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.slug);
  if (!product) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Build sorted photo list with public URLs
  const photos = (product.product_photos || [])
    .sort((a, b) => {
      if (a.is_cover) return -1;
      if (b.is_cover) return 1;
      return a.display_order - b.display_order;
    })
    .map((p) => ({
      url: p.url || (
        p.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')
          ? `${supabaseUrl}/storage/v1/object/public/product-photos/${p.storage_path}`
          : 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80'
      ),
      id: p.id,
    }));

  // Sort options
  const sortedOptions = (product.product_options || []).sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <ProductDetailClient
      product={{ ...product, product_options: sortedOptions }}
      photos={photos}
    />
  );
}
