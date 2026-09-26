'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AdminNotepad from '@/components/admin/AdminNotepad';
import DashboardFinancialWidget from '@/components/admin/DashboardFinancialWidget';
import DashboardSalesAnalyticsChart from '@/components/admin/DashboardSalesAnalyticsChart';

import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AdminDashboardClient({ initialOrders = [], initialMaterials = [] }) {
  const router = useRouter();
  // Helper to resolve 1-hour auto transition to Crafting (preparing)
  const resolveAutoStatus = (orderList) => {
    const oneHourMs = 60 * 60 * 1000;
    const now = Date.now();
    return orderList.map((ord) => {
      const orderTime = new Date(ord.created_at || now).getTime();
      if ((ord.status === 'confirmed' || ord.status === 'pending' || ord.status === 'for_confirmation') && (now - orderTime >= oneHourMs)) {
        return { ...ord, status: 'preparing' };
      }
      if (ord.status === 'pending' || ord.status === 'for_confirmation') {
        return { ...ord, status: 'confirmed' };
      }
      return ord;
    });
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
  const calculatedSales = collectedRevenue; // Realized Kita from completed orders
  const calculatedExpenses = orders.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0);

  const lowStockMaterials = (materials || []).filter(
    (m) => parseFloat(m.current_stock) <= parseFloat(m.minimum_stock)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em' }}>
          Dashboard Overview
        </h1>

        <AdminNotepad />
      </div>

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

      {/* Low Stock / Out of Stock Materials Alert */}
      {lowStockMaterials && lowStockMaterials.length > 0 && (
        <div
          className="card"
          style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#92400E', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#D97706', fontSize: '14px' }}></i>
              <span>Low Stock & Out of Stock Materials</span>
            </h2>
            <Link href="/admin/materials" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
              Manage Inventory →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {lowStockMaterials.map((m) => {
              const current = parseFloat(m.current_stock) || 0;
              const threshold = parseFloat(m.minimum_stock) || 0;
              const isCritical = current <= 5;

              return (
                <div
                  key={m.id}
                  style={{
                    background: isCritical ? '#FEF2F2' : '#FFFBEB',
                    border: isCritical ? '1px solid #FECACA' : '1px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
                    <p
                      title={m.name}
                      style={{
                        fontWeight: '700',
                        fontSize: '13px',
                        color: isCritical ? '#991B1B' : '#92400E',
                        margin: 0,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {m.name}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p
                      style={{
                        fontWeight: '800',
                        color: isCritical ? '#DC2626' : '#D97706',
                        fontSize: '15px',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {current}
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: '600',
                          color: isCritical ? '#EF4444' : '#B45309',
                          marginLeft: '2px',
                        }}
                      >
                        /{threshold} {m.unit}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
