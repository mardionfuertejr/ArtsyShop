import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMockOrderByReference } from '@/lib/mockData';
import ConfirmationClient from './ConfirmationClient';

export const metadata = {
  title: 'Order Received — M&M Artsy',
};

async function getOrder(referenceCode) {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('orders')
        .select(`
          reference_code, customer_name, order_type, status, notes,
          subtotal, delivery_fee, total_amount, preferred_date, created_at,
          order_items(product_name, quantity, unit_price, total_price,
            order_item_options(option_name, option_value)
          )
        `)
        .eq('reference_code', referenceCode)
        .single();
      if (data) return data;
    }
  } catch (err) {
    // Fallback to mock
  }
  return getMockOrderByReference(referenceCode);
}

export default async function ConfirmationPage({ params }) {
  const resolvedParams = await params;
  const decodedRef = decodeURIComponent(resolvedParams.referenceCode || '');
  const order = await getOrder(decodedRef);

  return <ConfirmationClient order={order} referenceCode={decodedRef} />;
}
