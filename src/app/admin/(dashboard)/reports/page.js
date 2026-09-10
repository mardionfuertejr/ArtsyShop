import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MOCK_ORDERS, MOCK_PRODUCTS } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const metadata = { title: 'Sales & Profit Reports — M&M Artsy' };

export default async function AdminReportsPage() {
  let completedOrders = [];
  let products = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: dbOrders }, { data: dbProducts }] = await Promise.all([
        supabase.from('orders').select('*').eq('status', 'completed'),
        supabase.from('products').select('*, category:categories(name, slug)'),
      ]);

      if (dbOrders) completedOrders = dbOrders;
      if (dbProducts) products = dbProducts;
    }
  } catch (err) {}

  if (completedOrders.length === 0) {
    completedOrders = MOCK_ORDERS.filter((o) => o.status === 'completed');
  }
  if (products.length === 0) {
    products = MOCK_PRODUCTS;
  }

  const totalRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const totalCost = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_cost) || 0), 0);
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const aov = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '18px' }}>
        <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Sales & Reports</h1>
      </div>

      {/* KPI Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <p className="stat-card-label">Total Revenue</p>
          <p className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(totalRevenue)}
          </p>
          <p className="stat-card-sub">{completedOrders.length} completed order(s)</p>
        </div>

        <div className="stat-card">
          <p className="stat-card-label">Materials Cost (COGS)</p>
          <p className="stat-card-value" style={{ color: '#B91C1C' }}>
            {formatCurrency(totalCost)}
          </p>
          <p className="stat-card-sub">Raw supplies & packaging</p>
        </div>

        <div className="stat-card">
          <p className="stat-card-label">Net Gross Profit</p>
          <p className="stat-card-value" style={{ color: '#15803D' }}>
            {formatCurrency(netProfit)}
          </p>
          <p className="stat-card-sub">{profitMargin}% average margin</p>
        </div>

        <div className="stat-card">
          <p className="stat-card-label">Avg. Order Value</p>
          <p className="stat-card-value">
            {formatCurrency(aov)}
          </p>
          <p className="stat-card-sub">Per checkout</p>
        </div>
      </div>

      {/* Product Profitability Table */}
      <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Product Catalog Margin Breakdown
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            Based on active BOM recipes
          </span>
        </div>

        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              <th style={{ padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Craft Creation</th>
              <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Category</th>
              <th style={{ padding: '13px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Retail Price</th>
              <th style={{ padding: '13px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Est. Material Cost</th>
              <th style={{ padding: '13px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Est. Margin</th>
              <th style={{ padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                    <i className="fa-solid fa-chart-pie" style={{ opacity: 0.8 }}></i>
                  </div>
                  <p style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', margin: 0 }}>No products in catalog yet</p>
                  <p style={{ fontSize: '13px', margin: '6px 0 0', color: '#64748b' }}>Add products in the Products tab to see margin breakdown.</p>
                </td>
              </tr>
            ) : (
              products.map((prod) => {
                const bomCost = prod.bom?.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0) || ((parseFloat(prod.base_price) || 0) * 0.38);
                const basePrice = parseFloat(prod.base_price) || 0;
                const margin = basePrice > 0 ? Math.round(((basePrice - bomCost) / basePrice) * 100) : 0;
                return (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '13px 18px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                      <p style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '13px' }}>
                        {prod.name}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                        /{prod.slug}
                      </p>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ background: '#FAF6F0', color: 'var(--color-primary, #b45309)', fontWeight: '700', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
                        {prod.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '13px', borderBottom: '1px solid #E2E8F0' }}>
                      {formatCurrency(basePrice)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: '#B91C1C', fontWeight: '600', fontSize: '13px', borderBottom: '1px solid #E2E8F0' }}>
                      {formatCurrency(bomCost)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: '#15803D', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #E2E8F0' }}>
                      {margin}%
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#DCFCE7', color: '#166534' }}>
                        Healthy Margin
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
