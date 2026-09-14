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
  const [showResetModal, setShowResetModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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
    const years = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2]);
    orders.forEach(o => {
      if (o.created_at) {
        const y = new Date(o.created_at).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders, currentYear]);

  const handleResetSalesData = (scope = 'all') => {
    try {
      if (scope === 'all') {
        localStorage.removeItem('likha_admin_orders');
        localStorage.removeItem('likha_mock_orders');
        setOrders(prev => prev.filter(o => o.status !== 'completed'));
      } else if (scope === 'year') {
        const targetYr = selectedYear === 'all' ? currentYear : parseInt(selectedYear);
        const local = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        const filtered = local.filter(o => {
          if (o.status !== 'completed') return true;
          const y = new Date(o.created_at || Date.now()).getFullYear();
          return y !== targetYr;
        });
        localStorage.setItem('likha_admin_orders', JSON.stringify(filtered));
        setOrders(prev => prev.filter(o => {
          if (o.status !== 'completed') return true;
          const y = new Date(o.created_at || Date.now()).getFullYear();
          return y !== targetYr;
        }));
      }
      setShowResetModal(false);
      setToastMsg('Sales data has been successfully reset! 📊');
      setTimeout(() => setToastMsg(''), 3000);
    } catch {
      setShowResetModal(false);
    }
  };

  // Strictly completed orders for the selected period
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

  // Products sold in this period (Computed from order_items)
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
            const matchedProd = products.find(p => p.name?.toLowerCase() === name.toLowerCase());
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

  // Aggregated Totals (Exact and 100% synchronized across cards and tables)
  const totalUnitsSold = useMemo(() => {
    return productReportData.reduce((acc, p) => acc + p.qtySold, 0);
  }, [productReportData]);

  const totalRevenue = useMemo(() => {
    return productReportData.reduce((acc, p) => acc + p.totalRevenue, 0);
  }, [productReportData]);

  const totalNetProfit = useMemo(() => {
    return productReportData.reduce((acc, p) => acc + p.profit, 0);
  }, [productReportData]);

  const totalOrdersAmount = useMemo(() => {
    return completedOrders.reduce((acc, o) => acc + (parseFloat(o.total_amount) || parseFloat(o.subtotal) || 0), 0);
  }, [completedOrders]);

  const periodLabel = useMemo(() => {
    if (periodPreset === 'all_time' || (selectedMonth === 'all' && selectedYear === 'all')) return 'All Time';
    if (selectedMonth === 'all') return `${selectedYear}`;
    return `${MONTHS[selectedMonth]} ${selectedYear}`;
  }, [periodPreset, selectedMonth, selectedYear]);

  return (
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Sales & Reports
          </h1>
          <span
            style={{
              background: 'rgba(234, 88, 12, 0.1)',
              color: 'var(--color-primary, #EA580C)',
              fontSize: '12px',
              fontWeight: '800',
              padding: '2.5px 9px',
              borderRadius: '9999px',
            }}
          >
            {periodLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '9px',
              border: '1px solid #FECACA',
              background: '#FFF5F5',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-rotate-left" style={{ fontSize: '11px' }}></i>
            <span>Reset Sales Data</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '9px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <i className={`fa-solid fa-arrows-rotate ${isLoading ? 'fa-spin' : ''}`} style={{ fontSize: '11px', color: 'var(--color-primary, #EA580C)' }}></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'adminModalScaleIn 0.2s ease',
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ color: '#10B981' }}></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Clean KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total Revenue */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Total Revenue
            </p>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#166534', lineHeight: 1 }}>
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#DCFCE7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            <i className="fa-solid fa-peso-sign"></i>
          </div>
        </div>

        {/* Net Profit */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Net Profit
            </p>
            <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--color-primary, #EA580C)', lineHeight: 1 }}>
              {formatCurrency(totalNetProfit)}
            </span>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#FFF5F2',
              color: 'var(--color-primary, #EA580C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            <i className="fa-solid fa-chart-line"></i>
          </div>
        </div>

        {/* Units Sold */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Units Sold
            </p>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#0EA5E9', lineHeight: 1 }}>
              {totalUnitsSold}
            </span>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#EFF6FF',
              color: '#0EA5E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            <i className="fa-solid fa-box-open"></i>
          </div>
        </div>

        {/* Completed Orders */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Completed Orders
            </p>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#8B5CF6', lineHeight: 1 }}>
              {completedOrders.length}
            </span>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#F5F3FF',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
        </div>
      </div>

      {/* ── Unified Period Selector Controls ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Preset Pills */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: '3.5px',
            borderRadius: '11px',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => handlePresetChange('this_month')}
            style={{
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: periodPreset === 'this_month' ? '800' : '600',
              background: periodPreset === 'this_month' ? '#FFFFFF' : 'transparent',
              color: periodPreset === 'this_month' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: periodPreset === 'this_month' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            This Month
          </button>

          <button
            type="button"
            onClick={() => handlePresetChange('last_month')}
            style={{
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: periodPreset === 'last_month' ? '800' : '600',
              background: periodPreset === 'last_month' ? '#FFFFFF' : 'transparent',
              color: periodPreset === 'last_month' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: periodPreset === 'last_month' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Last Month
          </button>

          <button
            type="button"
            onClick={() => handlePresetChange('this_year')}
            style={{
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: periodPreset === 'this_year' ? '800' : '600',
              background: periodPreset === 'this_year' ? '#FFFFFF' : 'transparent',
              color: periodPreset === 'this_year' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: periodPreset === 'this_year' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            This Year ({currentYear})
          </button>

          <button
            type="button"
            onClick={() => handlePresetChange('all_time')}
            style={{
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: periodPreset === 'all_time' ? '800' : '600',
              background: periodPreset === 'all_time' ? '#FFFFFF' : 'transparent',
              color: periodPreset === 'all_time' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: periodPreset === 'all_time' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Time
          </button>
        </div>

        {/* Custom Month/Year Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
              setSelectedMonth(val);
              setPeriodPreset('custom');
            }}
            style={{
              fontSize: '12px',
              fontWeight: '700',
              padding: '7px 10px',
              borderRadius: '9px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
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
              fontWeight: '700',
              padding: '7px 10px',
              borderRadius: '9px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
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

      {/* ── Main Data Card ── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Table Selection Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1.5px solid #E2E8F0',
            background: '#F8FAFC',
            padding: '0 16px',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'products' ? '800' : '600',
              color: activeTab === 'products' ? 'var(--color-primary, #EA580C)' : '#64748B',
              borderBottom: activeTab === 'products' ? '2.5px solid var(--color-primary, #EA580C)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-gift" style={{ fontSize: '12px' }}></i>
            <span>Top Selling Products ({productReportData.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: '12.5px',
              fontWeight: activeTab === 'orders' ? '800' : '600',
              color: activeTab === 'orders' ? 'var(--color-primary, #EA580C)' : '#64748B',
              borderBottom: activeTab === 'orders' ? '2.5px solid var(--color-primary, #EA580C)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-receipt" style={{ fontSize: '12px' }}></i>
            <span>Completed Orders ({completedOrders.length})</span>
          </button>
        </div>

        {/* ── TAB 1: TOP SELLING PRODUCTS ── */}
        {activeTab === 'products' && (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '6%', textAlign: 'center', padding: '12px 14px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    #
                  </th>
                  <th style={{ width: '42%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Product
                  </th>
                  <th style={{ width: '16%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Category
                  </th>
                  <th style={{ width: '12%', textAlign: 'center', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Qty Sold
                  </th>
                  <th style={{ width: '12%', textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Total Sales
                  </th>
                  <th style={{ width: '12%', textAlign: 'right', padding: '12px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Net Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {productReportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B', verticalAlign: 'middle', height: '240px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FFF5F2', color: 'var(--color-primary, #EA580C)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '8px' }}>
                        <i className="fa-solid fa-gift"></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>No sales recorded</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                        No product sales recorded for {periodLabel}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  productReportData.map((prod, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFD')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: '700', fontSize: '12.5px', padding: '13px 14px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px' }}>{prod.name}</span>
                          {idx === 0 && (
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '800',
                                background: 'rgba(234, 88, 12, 0.1)',
                                color: 'var(--color-primary, #EA580C)',
                                padding: '1.5px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(234, 88, 12, 0.2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ★ #1 BESTSELLER
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '12.5px', color: '#475569', fontWeight: '500' }}>
                        {prod.category}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '13px', color: '#0F172A', padding: '13px 16px' }}>
                        {prod.qtySold}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#166534', fontSize: '13px', padding: '13px 16px' }}>
                        {formatCurrency(prod.totalRevenue)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-primary, #EA580C)', fontSize: '13px', padding: '13px 18px' }}>
                        {formatCurrency(prod.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* ── TOTAL ROW AT BOTTOM ── */}
              {productReportData.length > 0 && (
                <tfoot>
                  <tr
                    style={{
                      background: '#F8FAFC',
                      borderTop: '2px solid #CBD5E1',
                    }}
                  >
                    <td
                      colSpan={3}
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontWeight: '900',
                        color: '#0F172A',
                        fontSize: '13px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      TOTAL ({productReportData.length} {productReportData.length === 1 ? 'Product' : 'Products'})
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '900', color: '#0F172A', fontSize: '13.5px', padding: '14px 16px' }}>
                      {totalUnitsSold}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: '#166534', fontSize: '13.5px', padding: '14px 16px' }}>
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--color-primary, #EA580C)', fontSize: '13.5px', padding: '14px 18px' }}>
                      {formatCurrency(totalNetProfit)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ── TAB 2: COMPLETED ORDERS LOG ── */}
        {activeTab === 'orders' && (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '6%', textAlign: 'center', padding: '12px 14px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    #
                  </th>
                  <th style={{ width: '16%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Order No.
                  </th>
                  <th style={{ width: '14%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Date
                  </th>
                  <th style={{ width: '18%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Customer
                  </th>
                  <th style={{ width: '26%', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Items
                  </th>
                  <th style={{ width: '10%', textAlign: 'center', padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Claim Type
                  </th>
                  <th style={{ width: '10%', textAlign: 'right', padding: '12px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B', verticalAlign: 'middle', height: '240px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#EFF6FF', color: '#0EA5E9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '8px' }}>
                        <i className="fa-solid fa-receipt"></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>No completed orders</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                        No completed orders in this period ({periodLabel}).
                      </p>
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((ord, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFD')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ textAlign: 'center', color: '#64748B', fontWeight: '700', fontSize: '12.5px', padding: '13px 14px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <Link
                          href={`/admin/orders/${ord.id || ord.reference_code}`}
                          style={{
                            fontWeight: '800',
                            color: 'var(--color-primary, #EA580C)',
                            textDecoration: 'none',
                            fontFamily: 'monospace',
                            fontSize: '12.5px',
                          }}
                        >
                          #{ord.reference_code || ord.id}
                        </Link>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', padding: '13px 16px' }}>
                        {formatDateShort(ord.created_at)}
                      </td>
                      <td style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px', padding: '13px 16px' }}>
                        {ord.customer_name}
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569', padding: '13px 16px' }}>
                        {ord.order_items?.map((it, i) => (
                          <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px' }}>
                            • {it.quantity}x {it.product_name}
                          </div>
                        )) || '1 Craft'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '13px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: ord.order_type === 'delivery' ? '#FFF5F2' : '#DCFCE7',
                            color: ord.order_type === 'delivery' ? 'var(--color-primary, #EA580C)' : '#166534',
                            border: ord.order_type === 'delivery' ? '1px solid rgba(234, 88, 12, 0.2)' : '1px solid rgba(22, 101, 52, 0.2)',
                            display: 'inline-block',
                          }}
                        >
                          {ord.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#0F172A', fontSize: '13px', padding: '13px 18px' }}>
                        {formatCurrency(ord.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* ── TOTAL ROW AT BOTTOM ── */}
              {completedOrders.length > 0 && (
                <tfoot>
                  <tr
                    style={{
                      background: '#F8FAFC',
                      borderTop: '2px solid #CBD5E1',
                    }}
                  >
                    <td
                      colSpan={6}
                      style={{
                        padding: '14px 16px',
                        textAlign: 'left',
                        fontWeight: '900',
                        color: '#0F172A',
                        fontSize: '13px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      TOTAL ({completedOrders.length} {completedOrders.length === 1 ? 'Order' : 'Orders'})
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '900', color: '#166534', fontSize: '13.5px', padding: '14px 18px' }}>
                      {formatCurrency(totalOrdersAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── RESET SALES CONFIRMATION MODAL ── */}
      {showResetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'adminModalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                  Reset Sales & Reports Data
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Piliin kung paano ire-reset ang mga record ng benta.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '0 0 20px' }}>
              Gusto mo bang i-clear ang mga naunang test orders o simulan ang bagong taon para mag-reset sa <strong>₱0.00</strong> ang revenue at units sold?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleResetSalesData('all')}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <i className="fa-solid fa-trash-can"></i>
                <span>Reset All Sales Data (Fresh Clean Slate)</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetSalesData('year')}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <i className="fa-solid fa-calendar-xmark"></i>
                <span>Reset Current Period Only ({periodLabel})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: '#64748B',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
