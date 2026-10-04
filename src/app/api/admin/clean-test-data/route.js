import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client unavailable' }, { status: 500 });
    }

    // Delete in reverse dependency order
    await supabase.from('order_item_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('delivery_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({
      success: true,
      message: 'Successfully cleared all test orders while keeping products and materials intact.',
    });
  } catch (err) {
    console.error('Clean test data error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
