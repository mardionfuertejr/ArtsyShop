import Link from 'next/link';
import { MOCK_ORDERS, MOCK_PRODUCTS } from '@/lib/mockData';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/formatCurrency';

export const metadata = { title: 'Sales & Profit Reports — M&M Artsy' };

export default async function AdminReportsPage() {
  const completedOrders = MOCK_ORDERS.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalCost = completedOrders.reduce((sum, o) => sum + (o.total_cost || o.total_amount * 0.45), 0);
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
      <div className="data-table-wrapper" style={{ margin: 0 }}>
        <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text)', margin: 0 }}>
            Product Catalog Margin Breakdown
          </h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Based on active BOM recipes
          </span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Craft Creation</th>
              <th className="text-left">Category</th>
              <th className="text-right">Retail Price</th>
              <th className="text-right">Est. Material Cost</th>
              <th className="text-right">Est. Margin</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PRODUCTS.map((prod) => {
              const bomCost = prod.bom?.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0) || (prod.base_price * 0.38);
              const margin = Math.round(((prod.base_price - bomCost) / prod.base_price) * 100);
              return (
                <tr key={prod.id}>
                  <td className="text-left">
                    <p style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text)', margin: 0 }}>
                      {prod.name}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                      /{prod.slug}
                    </p>
                  </td>
                  <td className="text-left">
                    <span className="badge" style={{ background: 'var(--color-surface-warm)', color: 'var(--color-primary)' }}>
                      {prod.category?.name}
                    </span>
                  </td>
                  <td className="text-right" style={{ fontWeight: '700', color: 'var(--color-text)' }}>
                    {formatCurrency(prod.base_price)}
                  </td>
                  <td className="text-right" style={{ color: '#B91C1C', fontWeight: '500' }}>
                    {formatCurrency(bomCost)}
                  </td>
                  <td className="text-right" style={{ color: '#15803D', fontWeight: '700' }}>
                    {margin}%
                  </td>
                  <td className="text-center">
                    <span className="badge badge-confirmed">
                      Healthy Margin
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
