import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMockProducts, saveMockProduct, deleteMockProduct } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category') || 'all';

    const supabase = await createClient();
    if (supabase) {
      let query = supabase
        .from('products')
        .select(`
          id, name, slug, base_price, description, category_id, is_ready_made, ready_made_stock,
          is_on_sale, sale_price, sale_tag, is_sold_out, is_bestseller, is_available,
          category:categories(id, name, slug),
          product_photos(id, storage_path, url, is_cover, display_order),
          product_options(id, option_name, choices, is_required, display_order)
        `)
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

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, products: data });
      }
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category') || 'all';
  const products = getMockProducts(categorySlug);
  return NextResponse.json({ success: true, products });
}

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.name || !body.slug) {
      return NextResponse.json({ success: false, message: 'Missing product name or slug' }, { status: 400 });
    }

    // 1. Save in server-side memory
    const saved = saveMockProduct(body);

    // 2. Persist to Supabase if available
    try {
      const supabase = await createClient();
      if (supabase) {
        const prodData = {
          name: saved.name,
          slug: saved.slug,
          category_id: isUUID(saved.category_id) ? saved.category_id : null,
          base_price: parseFloat(saved.base_price) || 0,
          description: saved.description || '',
          is_available: saved.is_available !== false,
        };

        if (isUUID(saved.id)) {
          prodData.id = saved.id;
        }

        const { data: upsertedProd } = await supabase
          .from('products')
          .upsert(prodData, { onConflict: 'slug' })
          .select('id')
          .single();

        const actualProdId = upsertedProd?.id || (isUUID(saved.id) ? saved.id : null);

        if (actualProdId && Array.isArray(saved.product_photos)) {
          try {
            await supabase.from('product_photos').delete().eq('product_id', actualProdId);
          } catch {}
          for (const photo of saved.product_photos) {
            await supabase.from('product_photos').insert({
              product_id: actualProdId,
              storage_path: photo.storage_path || '',
              url: photo.url || '',
              is_cover: Boolean(photo.is_cover),
              display_order: photo.display_order || 0,
            });
          }
        }

        if (actualProdId && Array.isArray(saved.product_options)) {
          for (const opt of saved.product_options) {
            await supabase.from('product_options').upsert({
              id: isUUID(opt.id) ? opt.id : undefined,
              product_id: actualProdId,
              option_name: opt.option_name,
              choices: opt.choices,
              is_required: Boolean(opt.is_required),
              display_order: opt.display_order || 0,
            });
          }
        }
      }
    } catch {}

    return NextResponse.json({ success: true, product: saved });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing product ID' }, { status: 400 });
    }

    deleteMockProduct(id);

    try {
      const supabase = await createClient();
      if (supabase) {
        await supabase.from('products').delete().eq('id', id);
      }
    } catch {}

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
