'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/formatDate';
import AdminNotepad from '@/components/admin/AdminNotepad';
import DashboardFinancialWidget from '@/components/admin/DashboardFinancialWidget';

export default function AdminDashboardClient({ initialOrders = [], initialMaterials = [] }) {
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

    // Listen for storage events across tabs
    const handleStorage = (e) => {
      if (e.key === 'likha_admin_orders') {
        syncDashboardData();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncDashboardData]);

  // Calculations
  const activeOrders = orders.filter((o) =>
    ['pending', 'for_confirmation', 'confirmed', 'preparing', 'ready'].includes(o.status)
  );

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const collectedRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
  const pendingRevenue = activeOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
  const calculatedSales = collectedRevenue + pendingRevenue;
  const calculatedExpenses = orders.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0);

  const lowStockMaterials = (materials || []).filter(
    (m) => parseFloat(m.current_stock) <= parseFloat(m.minimum_stock)
  );

  const getStatusBadge = (st) => {
    const config = {
      pending: { label: 'CONFIRMED', bg: '#E0E7FF', color: '#3730A3' },
      for_confirmation: { label: 'CONFIRMED', bg: '#E0E7FF', color: '#3730A3' },
      confirmed: { label: 'CONFIRMED', bg: '#E0E7FF', color: '#3730A3' },
      preparing: { label: 'CRAFTING', bg: '#FCE7F3', color: '#9D174D' },
      ready: { label: 'READY', bg: '#DCFCE7', color: '#166534' },
      completed: { label: 'COMPLETED', bg: '#D1FAE5', color: '#065F46' },
      cancelled: { label: 'CANCELLED', bg: '#FEE2E2', color: '#991B1B' },
    };
    const c = config[st] || { label: st ? st.toUpperCase() : 'UNKNOWN', bg: '#F3F4F6', color: '#374151' };
    return (
      <span
        style={{
          background: c.bg,
          color: c.color,
          fontSize: '11px',
          fontWeight: '800',
          letterSpacing: '0.04em',
          padding: '0 8px',
          height: '24px',
          borderRadius: '9999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '96px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}
      >
        {c.label}
      </span>
    );
  };

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
      <DashboardFinancialWidget
        initialSales={calculatedSales || 0}
        initialExpenses={calculatedExpenses || 0}
      />

      {/* Active Orders Queue */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
              <span>Active Orders Queue</span>
            </h2>
            <span
              style={{
                background: 'rgba(180, 83, 9, 0.1)',
                color: 'var(--color-primary, #b45309)',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {activeOrders.length} active
            </span>
          </div>

          <Link href="/admin/orders" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
            View Full Orders Page →
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '72px 20px',
              minHeight: '220px',
              background: 'var(--color-surface-warm, #FAF6F0)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              <i className="fa-solid fa-check"></i>
            </div>
            <p style={{ fontWeight: '800', fontSize: '15px', color: 'var(--color-text, #0f172a)', margin: 0 }}>
              All caught up! 🎉
            </p>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              No active orders in the queue right now.
            </p>
          </div>
        ) : (
          <div className="data-table-wrapper" style={{ margin: 0, overflowX: 'auto', border: 'none', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '24%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Order & Needed Date</th>
                  <th style={{ width: '26%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Customer</th>
                  <th style={{ width: '28%', padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Items</th>
                  <th style={{ width: '12%', padding: '12px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
                  <th style={{ width: '10%', padding: '12px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((ord) => (
                  <tr key={ord.id || ord.reference_code} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <Link href={`/admin/orders/${ord.id || ord.reference_code}`} style={{ display: 'block', fontWeight: '800', fontSize: '13px', color: '#0f172a', textDecoration: 'none' }}>
                        {ord.reference_code}
                      </Link>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        {ord.preferred_date ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#475569' }}>
                            <i className="fa-regular fa-calendar" style={{ fontSize: '9.5px', color: '#64748b' }}></i>
                            <span>Needed: {formatDate(ord.preferred_date)}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No date set</span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <p style={{ fontWeight: '700', color: '#0f172a', margin: '0 0 2px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {ord.customer_name}
                      </p>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className={ord.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-store'} style={{ fontSize: '9.5px', color: '#64748b' }}></i>
                        <span>{ord.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {ord.order_items && ord.order_items.length > 0 ? (
                          ord.order_items.map((it, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                              }}
                            >
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  fontWeight: '700',
                                  fontSize: '10.5px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  lineHeight: 1.2,
                                  flexShrink: 0,
                                }}
                              >
                                {it.quantity}×
                              </span>
                              <span
                                style={{
                                  color: '#1e293b',
                                  fontWeight: '500',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={it.product_name}
                              >
                                {it.product_name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Custom crafts</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>
                      {getStatusBadge(ord.status)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>
                      <Link
                        href={`/admin/orders/${ord.id || ord.reference_code}`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 12px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#f1f5f9',
                          color: '#334155',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>View</span>
                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px', opacity: 0.7 }}></i>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
