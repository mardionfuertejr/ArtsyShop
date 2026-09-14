import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price,
          unit_cost,
          total_cost,
          order_item_options (
            id,
            option_name,
            option_value,
            additional_cost
          )
        ),
        delivery_locations (
          latitude,
          longitude,
          address,
          landmark_notes
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (dbOrders || []).map((ord) => ({
      id: ord.id,
      reference_code: ord.reference_code,
      customer_name: ord.customer_name,
      customer_phone: ord.customer_phone || '',
      facebook_name: ord.facebook_name || '',
      order_type: ord.order_type,
      status: ord.status,
      subtotal: parseFloat(ord.subtotal) || 0,
      delivery_fee: parseFloat(ord.delivery_fee) || 0,
      rush_fee: parseFloat(ord.rush_fee) || 0,
      is_rush: Boolean(ord.is_rush),
      total_amount: parseFloat(ord.total_amount) || 0,
      total_cost: parseFloat(ord.total_cost) || 0,
      preferred_date: ord.preferred_date || null,
      preferred_time: ord.preferred_time || null,
      notes: ord.notes || '',
      messenger_opened_at: ord.messenger_opened_at || null,
      sent_to_messenger: Boolean(ord.sent_to_messenger),
      created_at: ord.created_at,
      order_items: (ord.order_items || []).map((it) => ({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: parseFloat(it.unit_price) || 0,
        total_price: parseFloat(it.total_price) || 0,
        unit_cost: parseFloat(it.unit_cost) || 0,
        total_cost: parseFloat(it.total_cost) || 0,
        options: (it.order_item_options || []).map((opt) => ({
          option_name: opt.option_name,
          option_value: opt.option_value,
          additional_cost: parseFloat(opt.additional_cost) || 0,
        })),
      })),
      delivery_location: ord.delivery_locations?.[0] || null,
    }));

    return NextResponse.json({ success: true, orders: formatted });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      reference_code,
      customer_name,
      customer_phone,
      facebook_name,
      order_type,
      status = 'confirmed',
      subtotal = 0,
      delivery_fee = 0,
      rush_fee = 0,
      is_rush = false,
      total_amount = 0,
      total_cost = 0,
      preferred_date = null,
      preferred_time = null,
      notes = '',
      order_items = [],
      delivery_location = null,
    } = body;

    if (!reference_code || !customer_name) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase server client not available' }, { status: 500 });
    }

    // Upsert order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .upsert({
        reference_code,
        customer_name,
        customer_phone: customer_phone || '',
        facebook_name: facebook_name || '',
        order_type: order_type || 'pickup',
        status,
        subtotal: parseFloat(subtotal) || 0,
        delivery_fee: parseFloat(delivery_fee) || 0,
        rush_fee: parseFloat(rush_fee) || 0,
        is_rush: Boolean(is_rush),
        total_amount: parseFloat(total_amount) || 0,
        total_cost: parseFloat(total_cost) || 0,
        preferred_date: preferred_date || null,
        preferred_time: preferred_time || null,
        notes: notes || '',
      }, { onConflict: 'reference_code' })
      .select()
      .single();

    if (orderErr) {
      console.error('[API /api/orders] Order insert error:', orderErr);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    // Insert order items
    if (Array.isArray(order_items) && order_items.length > 0 && order) {
      // Clean previous items if upserting
      await supabase.from('order_items').delete().eq('order_id', order.id);

      const itemsToInsert = order_items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        total_price: parseFloat(item.total_price) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
        total_cost: parseFloat(item.total_cost) || 0,
      }));

      const { data: insertedItems, error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select();

      if (!itemsErr && insertedItems) {
        const optionsToInsert = [];
        order_items.forEach((item, idx) => {
          const inserted = insertedItems[idx];
          if (inserted && Array.isArray(item.options) && item.options.length > 0) {
            item.options.forEach((opt) => {
              optionsToInsert.push({
                order_item_id: inserted.id,
                option_name: opt.option_name || opt.optionName || 'Option',
                option_value: opt.option_value || opt.optionValue || '',
                additional_cost: parseFloat(opt.additional_cost || opt.additionalCost) || 0,
              });
            });
          }
        });

        if (optionsToInsert.length > 0) {
          await supabase.from('order_item_options').insert(optionsToInsert);
        }
      }
    }

    // Insert delivery location
    if (order_type === 'delivery' && delivery_location && order) {
      await supabase.from('delivery_locations').delete().eq('order_id', order.id);
      await supabase.from('delivery_locations').insert({
        order_id: order.id,
        latitude: delivery_location.latitude ?? delivery_location.lat ?? 0,
        longitude: delivery_location.longitude ?? delivery_location.lng ?? 0,
        address: delivery_location.address || '',
        landmark_notes: delivery_location.landmark_notes || notes || '',
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error('[API /api/orders] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
