import { createClient } from '@/lib/supabase/client';

/**
 * Generate order reference code: M&M-YYMMDD-XXX
 * Example: M&M-260908-001
 */
export async function generateOrderReference() {
  const supabase = createClient();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const prefix = `M&M-${dateStr}`;

  // Count existing orders today to get sequence number
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  let count = 0;
  try {
    const { count: c } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay);
    count = c || 0;
  } catch {
    count = 0;
  }

  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}

/**
 * Generate custom request reference: M&M-CR-YYMMDD-XXX
 */
export async function generateCustomRequestReference() {
  const supabase = createClient();
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const prefix = `M&M-CR-${dateStr}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  let count = 0;
  try {
    const { count: c } = await supabase
      .from('custom_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay);
    count = c || 0;
  } catch {
    count = 0;
  }

  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}
