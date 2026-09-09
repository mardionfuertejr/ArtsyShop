import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMockCategories } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

let serverCustomCategories = [];

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

  const baseCategories = getMockCategories();
  const merged = [...baseCategories, ...serverCustomCategories];
  return NextResponse.json({ success: true, categories: merged });
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

    serverCustomCategories.push(newCat);

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
