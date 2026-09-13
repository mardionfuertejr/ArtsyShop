import { createClient } from '@/lib/supabase/server';
import { MOCK_ORDERS, MOCK_PRODUCTS } from '@/lib/mockData';
import AdminReportsClient from './AdminReportsClient';

export const metadata = { title: "Sales & Profit Reports | M&M's Artsy Admin" };

export default async function AdminReportsPage() {
  let orders = [];
  let products = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: dbOrders }, { data: dbProducts }] = await Promise.all([
        supabase.from('orders').select(`
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
              option_value
            )
          )
        `).order('created_at', { ascending: false }),
        supabase.from('products').select('*, category:categories(name, slug)'),
      ]);

      if (dbOrders) orders = dbOrders;
      if (dbProducts) products = dbProducts;
    }
  } catch (err) {}

  if (orders.length === 0) {
    orders = MOCK_ORDERS;
  }
  if (products.length === 0) {
    products = MOCK_PRODUCTS;
  }

  return (
    <AdminReportsClient
      initialOrders={orders}
      initialProducts={products}
    />
  );
}
