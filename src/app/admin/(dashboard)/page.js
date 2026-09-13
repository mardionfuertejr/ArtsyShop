import { createClient } from '@/lib/supabase/server';
import { getAllMockOrders, MOCK_MATERIALS } from '@/lib/mockData';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata = { title: "Dashboard | M&M's Artsy Admin" };

export default async function AdminDashboardPage() {
  let initialOrders = getAllMockOrders();
  let initialMaterials = MOCK_MATERIALS;

  try {
    const supabase = await createClient();
    if (supabase) {
      const [
        { data: dbOrders, error: ordersErr },
        { data: dbMaterials, error: matsErr },
      ] = await Promise.all([
        supabase
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
              total_cost
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('materials')
          .select('id, name, current_stock, minimum_stock, unit'),
      ]);

      if (!ordersErr && dbOrders && dbOrders.length > 0) {
        const formatted = dbOrders.map((ord) => ({
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
          })),
        }));

        const dbRefs = new Set(formatted.map(o => o.reference_code));
        initialOrders = [...formatted, ...getAllMockOrders().filter(m => !dbRefs.has(m.reference_code))];
      }

      if (!matsErr && dbMaterials && dbMaterials.length > 0) {
        initialMaterials = dbMaterials;
      }
    }
  } catch (err) {
    // Keep fallback
  }

  return (
    <AdminDashboardClient
      initialOrders={initialOrders}
      initialMaterials={initialMaterials}
    />
  );
}

