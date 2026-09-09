import { MOCK_ORDERS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/server';
import OrderDetailClient from './OrderDetailClient';

export const metadata = { title: 'Order Details — M&M Artsy Admin' };

export default async function AdminOrderDetailPage({ params }) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  let order = null;

  try {
    const supabase = await createClient();
    if (supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      const query = supabase
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
        `);

      const { data: dbOrder } = isUUID
        ? await query.eq('id', orderId).single()
        : await query.eq('reference_code', orderId).single();

      if (dbOrder) {
        order = {
          id: dbOrder.id,
          reference_code: dbOrder.reference_code,
          customer_name: dbOrder.customer_name,
          customer_phone: dbOrder.customer_phone || '',
          facebook_name: dbOrder.facebook_name || '',
          order_type: dbOrder.order_type,
          status: dbOrder.status,
          subtotal: parseFloat(dbOrder.subtotal) || 0,
          delivery_fee: parseFloat(dbOrder.delivery_fee) || 0,
          total_amount: parseFloat(dbOrder.total_amount) || 0,
          total_cost: parseFloat(dbOrder.total_cost) || 0,
          preferred_date: dbOrder.preferred_date || null,
          notes: dbOrder.notes || '',
          created_at: dbOrder.created_at,
          order_items: (dbOrder.order_items || []).map((it) => ({
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
          delivery_location: dbOrder.delivery_locations?.[0] || null,
        };
      }
    }
  } catch {}

  if (!order) {
    order = MOCK_ORDERS.find(o => o.id === orderId || o.reference_code === orderId) || {
      id: orderId,
      reference_code: orderId,
      customer_name: 'Customer Order',
      customer_phone: '',
      order_type: 'pickup',
      status: 'confirmed',
      subtotal: 0,
      delivery_fee: 0,
      total_amount: 0,
      total_cost: 0,
      created_at: new Date().toISOString(),
      order_items: [],
    };
  }

  return <OrderDetailClient order={order} />;
}
