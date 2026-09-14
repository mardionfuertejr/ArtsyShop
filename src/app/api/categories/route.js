import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMockCategories, saveMockCategory } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, display_order')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, categories: data });
      }
    }
  } catch {}

  const categories = getMockCategories();
  return NextResponse.json({ success: true, categories });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, slug, display_order } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, message: 'Missing name or slug' }, { status: 400 });
    }

    const newCat = {
      id: body.id || `cat-${Date.now()}`,
      name,
      slug,
      display_order: display_order || 99,
    };

    saveMockCategory(newCat);

    try {
      const supabase = await createClient();
      if (supabase) {
        await supabase.from('categories').insert({
          name: newCat.name,
          slug: newCat.slug,
          display_order: newCat.display_order,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, category: newCat });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, slug, display_order } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, message: 'Missing category id or name' }, { status: 400 });
    }

    const updatedSlug = slug || name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();

    const catObj = {
      id,
      name,
      slug: updatedSlug,
      display_order: display_order || 1,
    };

    saveMockCategory(catObj);

    try {
      const supabase = await createClient();
      if (supabase) {
        await supabase
          .from('categories')
          .update({
            name: catObj.name,
            slug: catObj.slug,
            display_order: catObj.display_order,
          })
          .eq('id', id);
      }
    } catch {}

    return NextResponse.json({ success: true, category: catObj });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing category id' }, { status: 400 });
    }

    try {
      const supabase = await createClient();
      if (supabase) {
        // Set category_id to NULL on products referencing this category before delete
        await supabase.from('products').update({ category_id: null }).eq('category_id', id);
        await supabase.from('categories').delete().eq('id', id);
      }
    } catch {}

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

