import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    // 1. Ensure the 3 official categories exist
    const categoryMap = new Map(); // slug -> id
    for (const cat of MOCK_CATEGORIES) {
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .upsert({
          name: cat.name,
          slug: cat.slug,
          display_order: cat.display_order,
          is_active: true,
        }, { onConflict: 'slug' })
        .select('id, slug')
        .single();

      if (catData) {
        categoryMap.set(catData.slug, catData.id);
      }
    }

    // 2. Fetch existing products in Supabase
    const { data: existingProducts } = await supabase.from('products').select('id, slug');
    const masterSlugs = new Set(MOCK_PRODUCTS.map((p) => p.slug));

    // 3. Delete products that are NOT in the 10 master products
    if (existingProducts && existingProducts.length > 0) {
      const prodsToDelete = existingProducts.filter((p) => !masterSlugs.has(p.slug));
      for (const p of prodsToDelete) {
        try {
          await supabase.from('product_options').delete().eq('product_id', p.id);
          await supabase.from('product_photos').delete().eq('product_id', p.id);
          await supabase.from('products').delete().eq('id', p.id);
        } catch (delErr) {
          console.warn(`Failed to delete non-master product ${p.slug}:`, delErr);
        }
      }
    }

    // 4. Upsert each of the 10 master products
    for (let i = 0; i < MOCK_PRODUCTS.length; i++) {
      const prod = MOCK_PRODUCTS[i];
      const categoryId = categoryMap.get(prod.category?.slug || prod.category_id) || null;

      const prodData = {
        name: prod.name,
        slug: prod.slug,
        category_id: categoryId,
        base_price: parseFloat(prod.base_price) || 0,
        description: prod.description || '',
        display_order: i + 1,
        is_available: true,
        is_ready_made: Boolean(prod.is_ready_made),
        ready_made_stock: parseInt(prod.ready_made_stock, 10) || 0,
        is_sold_out: Boolean(prod.is_sold_out),
        is_bestseller: Boolean(prod.is_bestseller),
      };

      const { data: upsertedProd } = await supabase
        .from('products')
        .upsert(prodData, { onConflict: 'slug' })
        .select('id')
        .single();

      if (upsertedProd?.id) {
        // Upsert photos
        if (Array.isArray(prod.product_photos)) {
          await supabase.from('product_photos').delete().eq('product_id', upsertedProd.id);
          for (let pIdx = 0; pIdx < prod.product_photos.length; pIdx++) {
            const photo = prod.product_photos[pIdx];
            await supabase.from('product_photos').insert({
              product_id: upsertedProd.id,
              url: photo.url,
              storage_path: photo.storage_path || '',
              is_cover: Boolean(photo.is_cover),
              display_order: pIdx,
            });
          }
        }

        // Upsert options
        if (Array.isArray(prod.product_options)) {
          await supabase.from('product_options').delete().eq('product_id', upsertedProd.id);
          for (let oIdx = 0; oIdx < prod.product_options.length; oIdx++) {
            const opt = prod.product_options[oIdx];
            await supabase.from('product_options').insert({
              product_id: upsertedProd.id,
              option_name: opt.option_name,
              choices: opt.choices,
              is_required: Boolean(opt.is_required),
              display_order: oIdx,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized catalog to exactly ${MOCK_PRODUCTS.length} products.`,
      productCount: MOCK_PRODUCTS.length,
    });
  } catch (err) {
    console.error('Error syncing 10 products:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
