import AdminOrdersClient from './AdminOrdersClient';
import { MOCK_ORDERS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: "Orders Management | M&M's Artsy Admin" };

export default async function AdminOrdersPage() {
  let orders = MOCK_ORDERS;

  try {
    const supabase = await createClient();
    if (supabase) {
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

      if (!error && dbOrders && dbOrders.length > 0) {
        // Format db orders to match UI structure
        const formattedDbOrders = dbOrders.map((ord) => ({
          id: ord.id,
          reference_code: ord.reference_code,
          customer_name: ord.customer_name,
          customer_phone: ord.customer_phone || '',
          facebook_name: ord.facebook_name || '',
          order_type: ord.order_type,
          status: ord.status,
          subtotal: parseFloat(ord.subtotal) || 0,
          delivery_fee: parseFloat(ord.delivery_fee) || 0,
          total_amount: parseFloat(ord.total_amount) || 0,
          total_cost: parseFloat(ord.total_cost) || 0,
          preferred_date: ord.preferred_date || null,
          notes: ord.notes || '',
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

        // Merge DB orders with mock orders (DB orders first)
        const dbRefs = new Set(formattedDbOrders.map(o => o.reference_code));
        orders = [...formattedDbOrders, ...MOCK_ORDERS.filter(m => !dbRefs.has(m.reference_code))];
      }
    }
  } catch (err) {
    // Keep fallback
  }

  return <AdminOrdersClient initialOrders={orders} />;
}
