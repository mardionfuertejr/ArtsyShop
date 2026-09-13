'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MOCK_ORDERS, MOCK_PRODUCTS } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDateShort } from '@/lib/utils/formatDate';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminReportsClient({ initialOrders = [], initialProducts = [] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);
  const [isLoading, setIsLoading] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [periodPreset, setPeriodPreset] = useState('this_month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let combinedOrders = [...(initialOrders.length > 0 ? initialOrders : MOCK_ORDERS)];
      let combinedProducts = [...(initialProducts.length > 0 ? initialProducts : MOCK_PRODUCTS)];

      try {
        const localOrders = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        if (Array.isArray(localOrders) && localOrders.length > 0) {
          const localRefs = new Set(localOrders.map(o => o.reference_code || o.id));
          combinedOrders = [...localOrders, ...combinedOrders.filter(o => !localRefs.has(o.reference_code || o.id))];
        }

        const localProds = JSON.parse(localStorage.getItem('likha_products') || '[]');
        if (Array.isArray(localProds) && localProds.length > 0) {
          const prodIds = new Set(localProds.map(p => p.id));
          combinedProducts = [...localProds, ...combinedProducts.filter(p => !prodIds.has(p.id))];
        }
      } catch {}

      try {
        const supabase = createClient();
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
                total_cost
              )
            `).eq('status', 'completed').order('created_at', { ascending: false }),
            supabase.from('products').select('*, category:categories(name, slug)'),
          ]);

          if (dbOrders && dbOrders.length > 0) {
            const dbRefs = new Set(dbOrders.map(o => o.reference_code || o.id));
            combinedOrders = [...dbOrders, ...combinedOrders.filter(o => !dbRefs.has(o.reference_code || o.id))];
          }
          if (dbProducts && dbProducts.length > 0) {
            combinedProducts = dbProducts;
          }
        }
      } catch {}

      setOrders(combinedOrders);
      setProducts(combinedProducts);
    } catch {}
    setIsLoading(false);
  }, [initialOrders, initialProducts]);

  useEffect(() => {
    loadData();

    let supabase = null;
    let channel = null;
    try {
      supabase = createClient();
      if (supabase) {
        channel = supabase.channel('admin-reports-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            loadData();
          })
          .subscribe();
      }
    } catch {}

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('likha_order_placed', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('likha_order_placed', handleStorage);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    if (preset === 'this_month') {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    } else if (preset === 'last_month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      setSelectedMonth(prevMonth);
      setSelectedYear(prevYear);
    } else if (preset === 'this_year') {
      setSelectedMonth('all');
      setSelectedYear(currentYear);
    } else if (preset === 'all_time') {
      setSelectedMonth('all');
      setSelectedYear('all');
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set([currentYear, currentYear - 1]);
    orders.forEach(o => {
      if (o.created_at) {
        const y = new Date(o.created_at).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, currentYear]);

  // Strictly completed orders
  const completedOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status !== 'completed') return false;

      if (periodPreset === 'all_time' || (selectedMonth === 'all' && selectedYear === 'all')) {
        return true;
      }

      const orderDate = new Date(order.created_at || Date.now());
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();

      if (selectedYear !== 'all' && orderYear !== parseInt(selectedYear)) {
        return false;
      }

      if (selectedMonth !== 'all' && orderMonth !== parseInt(selectedMonth)) {
        return false;
      }

      return true;
    });
  }, [orders, periodPreset, selectedMonth, selectedYear]);

  // Core KPI Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;

    completedOrders.forEach(o => {
      const rev = parseFloat(o.subtotal) || parseFloat(o.total_amount) || 0;
      totalRevenue += rev;

      let ordCost = parseFloat(o.total_cost) || 0;
      if (o.order_items && Array.isArray(o.order_items) && o.order_items.length > 0) {
        let itemsCostSum = 0;
        o.order_items.forEach(it => {
          const qty = it.quantity || 1;
          totalUnitsSold += qty;
          const uCost = parseFloat(it.unit_cost) || (parseFloat(it.unit_price || it.total_price) * 0.38);
          itemsCostSum += (parseFloat(it.total_cost) || (uCost * qty));
        });
        if (ordCost === 0) ordCost = itemsCostSum;
      } else {
        totalUnitsSold += 1;
        if (ordCost === 0) ordCost = rev * 0.38;
      }
      totalCost += ordCost;
    });

    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      orderCount: completedOrders.length,
      totalUnitsSold,
    };
  }, [completedOrders]);

  // Products actually sold in this period (Zero waste)
  const productReportData = useMemo(() => {
    const map = {};

    completedOrders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach(item => {
          const name = item.product_name || 'Handcrafted Item';
          const qty = item.quantity || 1;
          const rev = parseFloat(item.total_price) || ((parseFloat(item.unit_price) || 0) * qty);
          const uCost = parseFloat(item.unit_cost) || ((parseFloat(item.unit_price) || (rev / qty)) * 0.38);
          const cost = parseFloat(item.total_cost) || (uCost * qty);

          if (!map[name]) {
            const matchedProd = products.find(p => p.name.toLowerCase() === name.toLowerCase());
            map[name] = {
              name,
              category: matchedProd?.category?.name || 'Bouquets',
              qtySold: 0,
              totalRevenue: 0,
              totalCost: 0,
            };
          }

          map[name].qtySold += qty;
          map[name].totalRevenue += rev;
          map[name].totalCost += cost;
        });
      }
    });

    const list = Object.values(map).map(p => ({
      ...p,
      profit: p.totalRevenue - p.totalCost,
    }));

    return list.sort((a, b) => b.qtySold - a.qtySold || b.totalRevenue - a.totalRevenue);
  }, [products, completedOrders]);

  const periodLabel = useMemo(() => {
    if (periodPreset === 'all_time' || (selectedMonth === 'all' && selectedYear === 'all')) return 'All Time';
    if (selectedMonth === 'all') return `${selectedYear}`;
    return `${MONTHS[selectedMonth]} ${selectedYear}`;
  }, [periodPreset, selectedMonth, selectedYear]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '800',
            color: 'var(--color-text)',
            margin: 0,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-heading)'
          }}>
            Sales & Reports
          </h1>
          <span style={{
            background: 'var(--color-primary-lighter)',
            color: 'var(--color-primary)',
            fontSize: '11.5px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: '1px solid var(--color-primary-light)',
          }}>
            {periodLabel}
          </span>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="btn btn-secondary btn-sm"
          style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', fontWeight: '700', borderRadius: 'var(--radius-md, 8px)' }}
        >
          <i className={`fa-solid fa-arrows-rotate ${isLoading ? 'fa-spin' : ''}`} style={{ fontSize: '10.5px' }}></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Period Selector Bar ── */}
      <div className="card" style={{
        padding: '10px 14px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg, 12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handlePresetChange('this_month')}
            style={{
              border: periodPreset === 'this_month' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: periodPreset === 'this_month' ? 'var(--color-primary-lighter)' : 'var(--color-surface)',
              color: periodPreset === 'this_month' ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: '700',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            This Month ({MONTHS[currentMonth]})
          </button>

          <button
            onClick={() => handlePresetChange('last_month')}
            style={{
              border: periodPreset === 'last_month' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: periodPreset === 'last_month' ? 'var(--color-primary-lighter)' : 'var(--color-surface)',
              color: periodPreset === 'last_month' ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: '700',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Last Month
          </button>

          <button
            onClick={() => handlePresetChange('this_year')}
            style={{
              border: periodPreset === 'this_year' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: periodPreset === 'this_year' ? 'var(--color-primary-lighter)' : 'var(--color-surface)',
              color: periodPreset === 'this_year' ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: '700',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {currentYear}
          </button>

          <button
            onClick={() => handlePresetChange('all_time')}
            style={{
              border: periodPreset === 'all_time' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: periodPreset === 'all_time' ? 'var(--color-primary-lighter)' : 'var(--color-surface)',
              color: periodPreset === 'all_time' ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: '700',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            All Time
          </button>
        </div>

        {/* Custom Month/Year Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
              setSelectedMonth(val);
              setPeriodPreset('custom');
            }}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '5px 8px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Months</option>
            {FULL_MONTHS.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
              setSelectedYear(val);
              setPeriodPreset('custom');
            }}
            style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '5px 8px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 3 Essential KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {/* Total Revenue */}
        <div className="card" style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          padding: '14px 16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
            Total Revenue
          </span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-success, #15803D)', marginTop: '3px' }}>
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {metrics.orderCount} order(s) • {metrics.totalUnitsSold} item(s)
          </div>
        </div>

        {/* Total Cost */}
        <div className="card" style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          padding: '14px 16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
            Total Cost
          </span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-danger, #B91C1C)', marginTop: '3px' }}>
            {formatCurrency(metrics.totalCost)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Material supplies & packaging
          </div>
        </div>

        {/* Net Profit */}
        <div className="card" style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border)',
          padding: '14px 16px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
            Net Profit
          </span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary)', marginTop: '3px' }}>
            {formatCurrency(metrics.netProfit)}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: '700', marginTop: '2px' }}>
            {metrics.profitMargin}% profit margin
          </div>
        </div>
      </div>

      {/* ── Main Data Card ── */}
      <div className="card" style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        padding: 0,
      }}>
        {/* Clean Theme-consistent Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-border-light)',
          background: 'var(--color-surface-warm, #FAF6F0)',
          padding: '0 12px',
        }}>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'products' ? '800' : '600',
              color: activeTab === 'products' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'products' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <i className="fa-solid fa-gift" style={{ fontSize: '12px' }}></i>
            <span>Top Selling Products</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === 'orders' ? '800' : '600',
              color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === 'orders' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <i className="fa-solid fa-receipt" style={{ fontSize: '12px' }}></i>
            <span>Completed Orders ({completedOrders.length})</span>
          </button>
        </div>

        {/* ── TAB 1: TOP SELLING PRODUCTS ── */}
        {activeTab === 'products' && (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-warm, #FAF6F0)', borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ width: '48px', textAlign: 'center', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Category</th>
                  <th style={{ textAlign: 'center', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Total Sales</th>
                  <th style={{ textAlign: 'right', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {productReportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)' }}>
                      No sales recorded for this period ({periodLabel}).
                    </td>
                  </tr>
                ) : (
                  productReportData.map((prod, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: '700', padding: '11px 16px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ textAlign: 'left', fontWeight: '700', color: 'var(--color-text)', padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{prod.name}</span>
                          {idx === 0 && (
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: '800',
                              background: 'var(--color-primary-lighter)',
                              color: 'var(--color-primary)',
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-sm, 4px)',
                              border: '1px solid var(--color-primary-light)'
                            }}>
                              ★ #1 BESTSELLER
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'left', padding: '11px 16px' }}>
                        <span style={{
                          fontSize: '11.5px',
                          color: 'var(--color-text-secondary)',
                          background: 'var(--color-background)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm, 4px)'
                        }}>
                          {prod.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '800', fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-text)', padding: '11px 16px' }}>
                        {prod.qtySold}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-success, #15803D)', padding: '11px 16px' }}>
                        {formatCurrency(prod.totalRevenue)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)', padding: '11px 16px' }}>
                        {formatCurrency(prod.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: COMPLETED ORDERS LOG ── */}
        {activeTab === 'orders' && (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-warm, #FAF6F0)', borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ width: '48px', textAlign: 'center', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Order No.</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Items</th>
                  <th style={{ textAlign: 'center', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Claim Type</th>
                  <th style={{ textAlign: 'right', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Total Amount</th>
                  <th style={{ textAlign: 'center', padding: '11px 16px', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-muted)' }}>
                      No completed orders in this period ({periodLabel}).
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((ord, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontWeight: '700', padding: '11px 16px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <Link href={`/admin/orders/${ord.id || ord.reference_code}`} style={{ fontWeight: '700', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'monospace' }}>
                          #{ord.reference_code || ord.id}
                        </Link>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '11px 16px' }}>
                        {formatDateShort(ord.created_at)}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--color-text)', padding: '11px 16px' }}>
                        {ord.customer_name}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '11px 16px' }}>
                        {ord.order_items?.map((it, i) => (
                          <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                            • {it.quantity}x {it.product_name}
                          </div>
                        )) || '1 Craft'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '11px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm, 4px)',
                          background: ord.order_type === 'delivery' ? 'var(--color-primary-lighter)' : 'var(--color-success-bg, #F0FDF4)',
                          color: ord.order_type === 'delivery' ? 'var(--color-primary)' : 'var(--color-success, #15803D)'
                        }}>
                          {ord.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-text)', padding: '11px 16px' }}>
                        {formatCurrency(ord.total_amount)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '11px 16px' }}>
                        <Link href={`/admin/orders/${ord.id || ord.reference_code}`} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px', borderRadius: 'var(--radius-sm, 6px)', textDecoration: 'none' }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
