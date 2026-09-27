'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AdminNotepad from '@/components/admin/AdminNotepad';
import DashboardFinancialWidget from '@/components/admin/DashboardFinancialWidget';
import DashboardSalesAnalyticsChart from '@/components/admin/DashboardSalesAnalyticsChart';
import { formatDate } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';

import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AdminDashboardClient({ initialOrders = [], initialMaterials = [] }) {
  const router = useRouter();

  const resolveAutoStatus = (orderList) => {
    return (orderList || []).map((ord) => ord);
  };

  const [orders, setOrders] = useState(() => resolveAutoStatus(initialOrders));
  const [materials, setMaterials] = useState(initialMaterials);

  // Sync orders & materials from localStorage and Supabase on mount
  const syncDashboardData = useCallback(async () => {
    try {
      let combined = [...initialOrders];

      // 1. Check localStorage for newly placed local orders
      try {
        const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        if (Array.isArray(localPlaced) && localPlaced.length > 0) {
          const localRefs = new Set(localPlaced.map((o) => o.reference_code));
          combined = [...localPlaced, ...combined.filter((o) => !localRefs.has(o.reference_code))];
        }
      } catch {}

      // 2. Fetch from Supabase client if available
      try {
        const supabase = createClient();
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
                total_cost
              )
            `)
            .order('created_at', { ascending: false });

          if (!error && dbOrders && dbOrders.length > 0) {
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
              payment_method: ord.payment_method,
              payment_proof_url: ord.payment_proof_url,
              gcash_reference_no: ord.gcash_reference_no,
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

            const dbRefs = new Set(formatted.map((o) => o.reference_code));
            combined = [...formatted, ...combined.filter((o) => !dbRefs.has(o.reference_code))];
          }

          // Fetch materials
          const { data: dbMats } = await supabase
            .from('materials')
            .select('id, name, current_stock, minimum_stock, unit');
          if (dbMats && dbMats.length > 0) {
            setMaterials(dbMats);
          }
        }
      } catch {}

      setOrders(resolveAutoStatus(combined));
    } catch {}
  }, [initialOrders]);

  useEffect(() => {
    syncDashboardData();

    let supabase = null;
    let channel = null;
    try {
      supabase = createClient();
      if (supabase) {
        channel = supabase.channel('admin-dashboard-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            syncDashboardData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
            syncDashboardData();
          })
          .subscribe();
      }
    } catch {}

    const handleStorage = () => syncDashboardData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('likha_order_placed', handleStorage);
    window.addEventListener('likha_order_updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('likha_order_placed', handleStorage);
      window.removeEventListener('likha_order_updated', handleStorage);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [syncDashboardData]);

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const collectedRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
  const calculatedSales = collectedRevenue;
  const calculatedExpenses = orders.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0);

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  // Calculate upcoming / rush orders by needed date
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const urgentOrders = activeOrders.filter((o) => {
    if (!o.preferred_date) return false;
    const pDate = String(o.preferred_date).split('T')[0];
    return pDate <= tomorrowStr;
  });

  const unverifiedGcashOrders = activeOrders.filter(
    (o) => (o.payment_method === 'gcash' || o.paymentMethod === 'gcash') && o.status === 'for_verification'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Dashboard Overview
          </h1>
        </div>

        <AdminNotepad />
      </div>

      {/* Urgent Orders & Action Alerts Banner (if any) */}
      {(urgentOrders.length > 0 || unverifiedGcashOrders.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {urgentOrders.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF5F2 0%, #FED7AA 100%)',
                border: '1.5px solid #FDBA74',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--color-primary, #EA580C)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  <i className="fa-solid fa-fire-flame-curved"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#9A3412' }}>
                    {urgentOrders.length} Urgent / Needed Order{urgentOrders.length === 1 ? '' : 's'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#C2410C', fontWeight: '600' }}>
                    Due Today or Tomorrow — prioritize crafting & packaging
                  </p>
                </div>
              </div>

              <Link
                href="/admin/orders"
                style={{
                  background: '#FFFFFF',
                  color: 'var(--color-primary, #EA580C)',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  border: '1px solid #FDBA74',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                View Orders →
              </Link>
            </div>
          )}

          {unverifiedGcashOrders.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #BFDBFE 100%)',
                border: '1.5px solid #93C5FD',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#007DFE',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1E40AF' }}>
                    {unverifiedGcashOrders.length} GCash Payment{unverifiedGcashOrders.length === 1 ? '' : 's'} to Check
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#2563EB', fontWeight: '600' }}>
                    Receipt screenshot or Ref No. submitted
                  </p>
                </div>
              </div>

              <Link
                href="/admin/orders"
                style={{
                  background: '#FFFFFF',
                  color: '#007DFE',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  border: '1px solid #93C5FD',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                Verify Now →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Financial Overview: Kita vs. Gastos with interactive adjustments */}
      <ErrorBoundary>
        <DashboardFinancialWidget
          initialSales={calculatedSales || 0}
          initialExpenses={calculatedExpenses || 0}
        />
      </ErrorBoundary>

      {/* Sales & Product Analytics Line Graph */}
      <ErrorBoundary>
        <DashboardSalesAnalyticsChart orders={orders} />
      </ErrorBoundary>
    </div>
  );
}
