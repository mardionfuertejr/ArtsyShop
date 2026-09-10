import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatRelative, formatDate, formatDateShort } from '@/lib/utils/formatDate';
import { getMockDashboardData, getAllMockOrders } from '@/lib/mockData';
import AdminNotepad from '@/components/admin/AdminNotepad';

export const metadata = { title: 'Dashboard — M&M Artsy Admin' };

async function getDashboardData() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [
        { data: allMonthOrders },
        { data: lowStockMaterials },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, reference_code, customer_name, status, total_amount, total_cost, created_at, order_items, order_type')
          .gte('created_at', monthStart)
          .order('created_at', { ascending: false }),
        supabase
          .from('materials')
          .select('id, name, current_stock, minimum_stock, unit'),
      ]);

      if (allMonthOrders && allMonthOrders.length > 0) {
        const completedOrders = allMonthOrders.filter(o => o.status === 'completed');
        const activeOrders = allMonthOrders.filter(o => ['pending', 'for_confirmation', 'confirmed', 'preparing', 'ready'].includes(o.status));

        const collectedRevenue = completedOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
        const pendingRevenue = activeOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
        const totalSales = collectedRevenue + pendingRevenue;

        const totalExpenses = allMonthOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);

        const lowStock = (lowStockMaterials || []).filter(
          m => parseFloat(m.current_stock) <= parseFloat(m.minimum_stock)
        );

        return {
          totalSales,
          totalExpenses,
          activeOrders,
          lowStockMaterials: lowStock,
        };
      }
    }
  } catch (err) {
    // Fallback
  }

  const allOrders = getAllMockOrders();
  const activeOrders = allOrders.filter(o => ['pending', 'for_confirmation', 'confirmed', 'preparing', 'ready'].includes(o.status));
  const completedOrders = allOrders.filter(o => o.status === 'completed');

  const collectedRevenue = completedOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const pendingRevenue = activeOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const totalSales = collectedRevenue + pendingRevenue;
  const totalExpenses = allOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);

  const mock = getMockDashboardData();

  return {
    totalSales,
    totalExpenses,
    activeOrders,
    lowStockMaterials: mock.lowStockMaterials || [],
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

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
      <span style={{
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
      }}>
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

      {/* Financial Overview: Kita vs. Gastos with VS Comparison Bar */}
      {(() => {
        const total = (data.totalSales || 0) + (data.totalExpenses || 0);
        const salesPct = total > 0 ? Math.round((data.totalSales / total) * 100) : 50;
        const expensesPct = 100 - salesPct;

        return (
          <div className="card" style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* 2 Metric Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}>
              {/* Total Revenue / Sales */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <i className="fa-solid fa-coins"></i>
                    <span>Total Revenue (Sales)</span>
                  </span>
                  <p style={{ fontSize: '26px', fontWeight: '800', color: '#047857', margin: 0 }}>
                    {formatCurrency(data.totalSales)}
                  </p>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: '18px' }}>
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
              </div>

              {/* Material Expenses */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <i className="fa-solid fa-receipt"></i>
                    <span>Material Expenses (Cost)</span>
                  </span>
                  <p style={{ fontSize: '26px', fontWeight: '800', color: '#DC2626', margin: 0 }}>
                    {formatCurrency(data.totalExpenses)}
                  </p>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontSize: '18px' }}>
                  <i className="fa-solid fa-boxes-packing"></i>
                </div>
              </div>
            </div>

            {/* Horizontal Split Progress Bar */}
            <div style={{ borderTop: 'none', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px', fontWeight: '700' }}>
                <span style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: '7px' }}></i>
                  <span>Revenue: {salesPct}%</span>
                </span>
                <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>Expenses: {expensesPct}%</span>
                  <i className="fa-solid fa-circle" style={{ fontSize: '7px' }}></i>
                </span>
              </div>

              {/* Split Bar */}
              <div style={{
                width: '100%',
                height: '10px',
                borderRadius: '9999px',
                background: '#f1f5f9',
                display: 'flex',
                overflow: 'hidden',
                gap: '2px',
              }}>
                <div
                  style={{
                    width: `${salesPct}%`,
                    background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                    borderRadius: '9999px 0 0 9999px',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Revenue: ${formatCurrency(data.totalSales)} (${salesPct}%)`}
                />
                <div
                  style={{
                    width: `${expensesPct}%`,
                    background: 'linear-gradient(90deg, #F87171 0%, #DC2626 100%)',
                    borderRadius: '0 9999px 9999px 0',
                    transition: 'width 0.4s ease',
                  }}
                  title={`Expenses: ${formatCurrency(data.totalExpenses)} (${expensesPct}%)`}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Active Orders Queue */}
      <div className="card" style={{
        padding: '20px',
        background: 'var(--color-surface, #ffffff)',
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
              <span>Active Orders Queue</span>
            </h2>
            <span style={{
              background: 'rgba(180, 83, 9, 0.1)',
              color: 'var(--color-primary, #b45309)',
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}>
              {data.activeOrders.length} active
            </span>
          </div>

          <Link href="/admin/orders" style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none' }}>
            View Full Orders Page →
          </Link>
        </div>

        {data.activeOrders.length === 0 ? (
          <div style={{
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
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
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
                {data.activeOrders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0' }}>
                      <Link href={`/admin/orders/${ord.id}`} style={{ display: 'block', fontWeight: '800', fontSize: '13px', color: '#0f172a', textDecoration: 'none' }}>
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
                      <Link href={`/admin/orders/${ord.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 12px', fontSize: '11.5px', fontWeight: '700', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#334155', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
      {data.lowStockMaterials && data.lowStockMaterials.length > 0 && (
        <div className="card" style={{
          padding: '20px',
          background: 'var(--color-surface, #ffffff)',
          borderRadius: '16px',
          border: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
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
            {data.lowStockMaterials.map((m) => {
              const current = parseFloat(m.current_stock) || 0;
              const threshold = parseFloat(m.minimum_stock) || 0;
              const isCritical = current <= 5; // Red text & card when 5 or below

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
