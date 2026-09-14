'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MOCK_ORDERS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatDateShort, formatRelative, formatTime12Hour, isRushDate } from '@/lib/utils/formatDate';

export default function AdminOrdersClient({ initialOrders }) {
  // Helper to preserve order status
  const resolveAutoStatus = (orderList) => {
    return (orderList || []).map((ord) => ord);
  };

  const [orders, setOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('likha_admin_orders');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return resolveAutoStatus(parsed);
          }
        }
      } catch {}
    }
    if (Array.isArray(initialOrders) && initialOrders.length > 0) {
      return resolveAutoStatus(initialOrders);
    }
    return resolveAutoStatus(MOCK_ORDERS);
  });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuOrderId, setActiveMenuOrderId] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const filterRef = useRef(null);
  const actionMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Lock body scroll and listen for ESC key when modal is open
  useEffect(() => {
    if (orderToDelete || orderToCancel) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setOrderToDelete(null);
          setOrderToCancel(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [orderToDelete, orderToCancel]);

  // Reset to first page on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // Sync function: combines Supabase orders, /api/orders API, localStorage orders, and initialOrders
  const syncOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let combined = [...(initialOrders || MOCK_ORDERS)];

      // 1. Check localStorage for newly placed local orders
      try {
        const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        if (Array.isArray(localPlaced) && localPlaced.length > 0) {
          const validPlaced = localPlaced.filter(o => o && o.reference_code && !o.reference_code.startsWith('MOCK-') && !o.id?.startsWith('ord-mock'));
          if (validPlaced.length !== localPlaced.length) {
            localStorage.setItem('likha_admin_orders', JSON.stringify(validPlaced));
          }
          if (validPlaced.length > 0) {
            const localRefs = new Set(validPlaced.map(o => o.reference_code));
            combined = [...validPlaced, ...combined.filter(o => !localRefs.has(o.reference_code))];
          }
        }
      } catch { }

      // 2. Fetch from /api/orders backend route (guaranteed server-side access across devices/LAN)
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
            const apiRefs = new Set(json.orders.map(o => o.reference_code));
            combined = [...json.orders, ...combined.filter(o => !apiRefs.has(o.reference_code))];
          }
        }
      } catch (apiErr) {
        // Fallback to Supabase client if /api/orders fails
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
                  total_cost,
                  order_item_options (
                    id,
                    option_name,
                    option_value,
                    additional_cost
                  )
                ),
                delivery_locations (
                  latitude,
                  longitude,
                  address,
                  landmark_notes
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
                rush_fee: parseFloat(ord.rush_fee) || 0,
                is_rush: Boolean(ord.is_rush),
                total_amount: parseFloat(ord.total_amount) || 0,
                total_cost: parseFloat(ord.total_cost) || 0,
                preferred_date: ord.preferred_date || null,
                preferred_time: ord.preferred_time || null,
                notes: ord.notes || '',
                messenger_opened_at: ord.messenger_opened_at || ord.messengerOpenedAt || null,
                sent_to_messenger: Boolean(ord.sent_to_messenger || ord.sentToMessenger || ord.messenger_opened_at),
                created_at: ord.created_at,
                order_items: (ord.order_items || []).map((it) => ({
                  id: it.id,
                  product_name: it.product_name,
                  quantity: it.quantity,
                  unit_price: parseFloat(it.unit_price) || 0,
                  total_price: parseFloat(it.total_price) || 0,
                  unit_cost: parseFloat(it.unit_cost) || 0,
                  total_cost: parseFloat(it.total_cost) || 0,
                  options: (it.order_item_options || []).map((opt) => ({
                    option_name: opt.option_name,
                    option_value: opt.option_value,
                    additional_cost: parseFloat(opt.additional_cost) || 0,
                  })),
                })),
                delivery_location: ord.delivery_locations?.[0] || null,
              }));

              const dbRefs = new Set(formatted.map(o => o.reference_code));
              combined = [...formatted, ...combined.filter(o => !dbRefs.has(o.reference_code))];
            }
          }
        } catch { }
      }

      // Always sort latest order first
      combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      // Keep localStorage in sync so other components have full data
      try {
        localStorage.setItem('likha_admin_orders', JSON.stringify(combined));
      } catch { }

      setOrders(resolveAutoStatus(combined));
      setHasLoadedOnce(true);
    } finally {
      setIsRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [initialOrders]);

  // Initial client sync & listener for real-time order placement
  useEffect(() => {
    syncOrders();

    const handleNewOrder = () => {
      syncOrders();
    };

    window.addEventListener('storage', handleNewOrder);
    window.addEventListener('likha_order_placed', handleNewOrder);

    // Periodic auto-sync every 8 seconds to catch orders placed on other devices / browsers
    const interval = setInterval(() => {
      syncOrders();
    }, 8000);

    // Supabase Realtime subscription
    let channel = null;
    try {
      const supabase = createClient();
      if (supabase) {
        channel = supabase
          .channel('public:orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            syncOrders();
          })
          .subscribe();
      }
    } catch { }

    return () => {
      window.removeEventListener('storage', handleNewOrder);
      window.removeEventListener('likha_order_placed', handleNewOrder);
      clearInterval(interval);
      if (channel) {
        try {
          const supabase = createClient();
          if (supabase) supabase.removeChannel(channel);
        } catch { }
      }
    };
  }, [syncOrders]);

  const statuses = [
    { key: 'all', label: 'All Orders', count: orders.length, color: '#64748b' },
    { key: 'submitted', label: 'Submitted', count: orders.filter(o => o.status === 'submitted' || o.status === 'pending' || o.status === 'for_confirmation').length, color: '#b45309' },
    { key: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length, color: '#4f46e5' },
    { key: 'preparing', label: 'Crafting', count: orders.filter(o => o.status === 'preparing').length, color: '#db2777' },
    { key: 'ready', label: 'Ready', count: orders.filter(o => o.status === 'ready').length, color: '#16a34a' },
    { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length, color: '#059669' },
    { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length, color: '#dc2626' },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
      if (!event.target.closest('.action-menu-dropdown-container')) {
        setActiveMenuOrderId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const ord = orderToCancel;
    setOrderToCancel(null);

    // 1. Update component state
    setOrders((prev) =>
      prev.map((o) => (o.id === ord.id || o.reference_code === ord.reference_code ? { ...o, status: 'cancelled' } : o))
    );

    // 2. Update localStorage
    try {
      const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updated = localPlaced.map((o) =>
        o.id === ord.id || o.reference_code === ord.reference_code ? { ...o, status: 'cancelled' } : o
      );
      localStorage.setItem('likha_admin_orders', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: { ...ord, status: 'cancelled' } }));
      }
    } catch { }

    // 3. Update Supabase
    try {
      const supabase = createClient();
      if (supabase) {
        if (ord.id && !String(ord.id).startsWith('ord-')) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('id', ord.id);
        } else if (ord.reference_code) {
          await supabase.from('orders').update({ status: 'cancelled' }).eq('reference_code', ord.reference_code);
        }
      }
    } catch { }

    setToastMsg(`Order ${ord.reference_code} marked as Cancelled`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const ord = orderToDelete;
    setOrderToDelete(null);

    // 1. Update component state
    setOrders((prev) => prev.filter((o) => o.id !== ord.id && o.reference_code !== ord.reference_code));

    // 2. Update localStorage
    try {
      const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updated = localPlaced.filter((o) => o.id !== ord.id && o.reference_code !== ord.reference_code);
      localStorage.setItem('likha_admin_orders', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: { ...ord, deleted: true } }));
      }
    } catch { }

    // 3. Update Supabase
    try {
      const supabase = createClient();
      if (supabase) {
        if (ord.id && !String(ord.id).startsWith('ord-')) {
          await supabase.from('orders').delete().eq('id', ord.id);
        } else if (ord.reference_code) {
          await supabase.from('orders').delete().eq('reference_code', ord.reference_code);
        }
      }
    } catch { }

    setToastMsg(`Order ${ord.reference_code} permanently deleted`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const activeStatusObj = statuses.find(s => s.key === statusFilter) || statuses[0];

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'submitted' && (o.status === 'submitted' || o.status === 'pending' || o.status === 'for_confirmation')) ||
      o.status === statusFilter;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      (o.reference_code && o.reference_code.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
      (o.facebook_name && o.facebook_name.toLowerCase().includes(q)) ||
      (o.notes && o.notes.toLowerCase().includes(q)) ||
      (o.delivery_location?.address && o.delivery_location.address.toLowerCase().includes(q)) ||
      (o.delivery_location?.landmark_notes && o.delivery_location.landmark_notes.toLowerCase().includes(q)) ||
      o.order_items?.some((it) => it.product_name && it.product_name.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const renderNeededDate = (ord) => {
    if (!ord.preferred_date) {
      return (
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          No date set
        </span>
      );
    }

    const timeLabel = ord.preferred_time ? ` · ${formatTime12Hour(ord.preferred_time)}` : '';

    const isFinished = ord.status === 'completed' || ord.status === 'cancelled';
    if (isFinished) {
      return (
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-regular fa-calendar-check" style={{ fontSize: '9.5px', color: '#94a3b8' }}></i>
          <span>Needed: {formatDateShort(ord.preferred_date)}{timeLabel}</span>
        </span>
      );
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(ord.preferred_date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return (
        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-fire" style={{ fontSize: '9.5px' }}></i>
          <span>Due Today ({formatDateShort(ord.preferred_date)}{timeLabel})</span>
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-clock" style={{ fontSize: '9.5px' }}></i>
          <span>Due Tomorrow ({formatDateShort(ord.preferred_date)}{timeLabel})</span>
        </span>
      );
    }
    if (diffDays < 0) {
      return (
        <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '9.5px' }}></i>
          <span>Past due ({formatDateShort(ord.preferred_date)}{timeLabel})</span>
        </span>
      );
    }

    return (
      <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <i className="fa-regular fa-calendar" style={{ fontSize: '9.5px', color: '#64748b' }}></i>
        <span>Needed: {formatDateShort(ord.preferred_date)}{timeLabel}</span>
      </span>
    );
  };

  const isRushOrder = (ord) => {
    if (ord.status === 'completed' || ord.status === 'cancelled') return false;
    if (ord.is_rush) return true;
    if (ord.preferred_date) {
      return isRushDate(ord.preferred_date);
    }
    return false;
  };

  const sortedFilteredOrders = [...filteredOrders].sort((a, b) => {
    // Priority Tiers:
    // Tier 1: Rush Active Orders (Priority 1)
    // Tier 2: Regular Active Orders - First Come First Served (Priority 2)
    // Tier 3: Completed Orders (Priority 3 - Bottom)
    // Tier 4: Cancelled Orders (Priority 4 - Very Bottom)
    const getTier = (o) => {
      if (o.status === 'cancelled') return 4;
      if (o.status === 'completed') return 3;
      if (isRushOrder(o)) return 1;
      return 2; // Regular active order (FCFS)
    };

    const tierA = getTier(a);
    const tierB = getTier(b);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // Tier 1: Rush Orders (Earliest needed date first)
    if (tierA === 1) {
      const dateA = a.preferred_date ? new Date(a.preferred_date).getTime() : Infinity;
      const dateB = b.preferred_date ? new Date(b.preferred_date).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    }

    // Tier 2: Regular Active Orders — First Come First Served (Earliest placed order first!)
    if (tierA === 2) {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB; // Earliest created_at first (FCFS)
      return (a.reference_code || '').localeCompare(b.reference_code || '');
    }

    // Tier 3 (Completed) & Tier 4 (Cancelled): Latest first
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const totalOrders = sortedFilteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedOrders = sortedFilteredOrders.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast">
          <i className="fa-solid fa-circle-check"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Row: Title on Left, Combined Search/Filter + Sync on Right */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
              Orders Management
            </h1>
            <span style={{
              background: 'rgba(180, 83, 9, 0.1)',
              color: 'var(--color-primary, #b45309)',
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 9px',
              borderRadius: '9999px',
              minWidth: '65px',
              textAlign: 'center',
              display: 'inline-block',
            }}>
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Unified Search Box with embedded Category/Status Filter Button */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#ffffff',
                border: isFocused ? '1.5px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                borderRadius: '10px',
                height: '38px',
                padding: '0 4px 0 12px',
                width: '320px',
                maxWidth: '100%',
                boxSizing: 'border-box',
                boxShadow: isFocused ? '0 0 0 3px rgba(180, 83, 9, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  color: isFocused ? 'var(--color-primary, #b45309)' : '#94a3b8',
                  fontSize: '12px',
                  marginRight: '8px',
                  transition: 'color 0.15s ease',
                  flexShrink: 0,
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0f172a',
                  width: '100%',
                  padding: 0,
                }}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    marginRight: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}
                  title="Clear search"
                >
                  <i className="fa-solid fa-circle-xmark" />
                </button>
              )}

              {/* Dividing separator inside the capsule */}
              <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }} />

              {/* Status Selector dropdown button inside search capsule */}
              <div ref={filterRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '7px',
                    border: 'none',
                    background: statusFilter !== 'all' ? 'rgba(180, 83, 9, 0.12)' : 'transparent',
                    color: statusFilter !== 'all' ? 'var(--color-primary, #b45309)' : '#64748b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {statusFilter !== 'all' && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary, #b45309)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                  <span>{statusFilter === 'all' ? 'Status' : activeStatusObj.label}</span>
                  <i
                    className="fa-solid fa-chevron-down"
                    style={{
                      fontSize: '9.5px',
                      color: statusFilter !== 'all' ? 'var(--color-primary, #b45309)' : '#94a3b8',
                      transition: 'transform 0.2s ease',
                      transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Filter Dropdown */}
                {isFilterOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                      border: 'none',
                      padding: '4px',
                      zIndex: 50,
                      minWidth: '190px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {statuses.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          setStatusFilter(s.key);
                          setIsFilterOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: statusFilter === s.key ? '#FAF6F0' : 'transparent',
                          color: statusFilter === s.key ? 'var(--color-primary, #b45309)' : '#334155',
                          fontSize: '12px',
                          fontWeight: statusFilter === s.key ? '700' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{s.label}</span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>{s.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              <th style={{ width: '22%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Order & Needed Date</th>
              <th style={{ width: '20%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Customer</th>
              <th style={{ width: '24%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Items</th>
              <th style={{ width: '14%', padding: '13px 18px', textAlign: 'right', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Total</th>
              <th style={{ width: '12%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
              <th style={{ width: '8%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
            </tr>
          </thead>
          <tbody key={`${statusFilter}-${searchQuery}-${currentPage}`} className="table-fade-enter">
            {!hasLoadedOnce && orders.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={`skeleton-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '120px', height: '14px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out' }} />
                      <div style={{ width: '80px', height: '10px', borderRadius: '4px', background: '#F8FAFC' }} />
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '100px', height: '14px', borderRadius: '4px', background: '#F1F5F9' }} />
                      <div style={{ width: '60px', height: '10px', borderRadius: '4px', background: '#F8FAFC' }} />
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#F1F5F9' }} />
                      <div style={{ width: '110px', height: '12px', borderRadius: '4px', background: '#F1F5F9' }} />
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9', marginLeft: 'auto' }} />
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '22px', borderRadius: '999px', background: '#F1F5F9', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F1F5F9', margin: '0 auto' }} />
                  </td>
                </tr>
              ))
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell" style={{ textAlign: 'center', padding: '60px 20px 70px', border: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '16px', fontSize: '26px' }}>
                    <i className="fa-solid fa-cart-shopping" style={{ opacity: 0.8 }}></i>
                  </div>
                  <p style={{ margin: 0, fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>No orders found</p>
                  <p style={{ margin: '8px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search query or filter tab.' : 'Customer orders will appear here once placed.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((ord, idx) => {
                const isNearBottom = paginatedOrders.length <= 3 ? idx >= 1 : idx >= paginatedOrders.length - 2;
                const statusBadgeConfig = {
                  submitted: { label: 'SUBMITTED', bg: '#FEF3C7', color: '#92400E' },
                  pending: { label: 'SUBMITTED', bg: '#FEF3C7', color: '#92400E' },
                  for_confirmation: { label: 'SUBMITTED', bg: '#FEF3C7', color: '#92400E' },
                  confirmed: { label: 'CONFIRMED', bg: '#E0E7FF', color: '#3730A3' },
                  preparing: { label: 'CRAFTING', bg: '#FCE7F3', color: '#9D174D' },
                  ready: { label: 'READY', bg: '#DCFCE7', color: '#166534' },
                  completed: { label: 'COMPLETED', bg: '#D1FAE5', color: '#065F46' },
                  cancelled: { label: 'CANCELLED', bg: '#FEE2E2', color: '#991B1B' },
                };
                const badge = statusBadgeConfig[ord.status] || statusBadgeConfig.confirmed;
                const rowKey = `${ord.id || ord.reference_code}-${idx}`;
                const isRush = Boolean(ord.is_rush || (ord.preferred_date && isRushDate(ord.preferred_date)));

                return (
                  <tr
                    key={rowKey}
                    style={{
                      background: isRush ? '#FFF7ED' : 'transparent',
                      borderLeft: isRush ? '4px solid #EA580C' : '4px solid transparent',
                      borderBottom: '1px solid #E2E8F0',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '10px 18px', verticalAlign: 'middle', borderBottom: '1px solid #E2E8F0' }}>
                      <Link href={`/admin/orders/${ord.id}`} style={{ display: 'block', marginBottom: '2px', fontWeight: '800', fontSize: '13px', color: '#0f172a', textDecoration: 'none' }}>
                        {ord.reference_code}
                      </Link>
                      {renderNeededDate(ord)}
                    </td>
                    <td style={{ padding: '10px 18px', verticalAlign: 'middle', borderBottom: '1px solid #E2E8F0', maxWidth: '200px' }}>
                      <p
                        style={{
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 3px',
                          fontSize: '13.5px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={ord.customer_name}
                      >
                        {ord.customer_name}
                      </p>
                      {ord.order_type === 'delivery' && (
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-primary, #b45309)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                        }}>
                          <i className="fa-solid fa-motorcycle" style={{ fontSize: '10px' }}></i>
                          <span>Delivery</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 18px', verticalAlign: 'middle', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        {ord.order_items && ord.order_items.length > 0 ? (
                          ord.order_items.map((it, itemIdx) => (
                            <div
                              key={itemIdx}
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
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No items</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 18px', verticalAlign: 'middle', textAlign: 'right', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a' }}>
                        {formatCurrency(ord.total_amount || 0)}
                      </div>
                      {ord.payment_method === 'gcash' && (
                        <div style={{ fontSize: '10.5px', color: '#0284c7', marginTop: '2px', fontWeight: '700' }}>
                          GCash
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.color,
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
                        {badge.label}
                      </span>
                      {ord.status === 'pending' && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          color: (ord.messenger_opened_at || ord.sent_to_messenger) ? '#16A34A' : '#64748B',
                        }}>
                          <span style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: (ord.messenger_opened_at || ord.sent_to_messenger) ? '#16A34A' : '#CBD5E1',
                            display: 'inline-block',
                          }}></span>
                          <span>
                            {(ord.messenger_opened_at || ord.sent_to_messenger) ? 'Chat Opened' : 'Awaiting Chat'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuOrderId(activeMenuOrderId === rowKey ? null : rowKey);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeMenuOrderId === rowKey ? '#f1f5f9' : 'transparent',
                            color: activeMenuOrderId === rowKey ? '#0f172a' : '#64748b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (activeMenuOrderId !== rowKey) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#0f172a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeMenuOrderId !== rowKey) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                          title="Actions"
                        >
                          <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: '14px' }}></i>
                        </button>

                        {/* Actions Dropdown Menu with Smart Positioning */}
                        {activeMenuOrderId === rowKey && (
                          <div
                            ref={actionMenuRef}
                            style={{
                              position: 'absolute',
                              ...(isNearBottom
                                ? { bottom: 'calc(100% + 4px)', transformOrigin: 'bottom right' }
                                : { top: 'calc(100% + 4px)', transformOrigin: 'top right' }),
                              right: 0,
                              background: '#ffffff',
                              borderRadius: '10px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                              border: '1px solid #f1f5f9',
                              padding: '4px',
                              zIndex: 50,
                              minWidth: '145px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'left',
                            }}
                          >
                            {/* 1. Manage */}
                            <Link
                              href={`/admin/orders/${ord.id}`}
                              onClick={() => setActiveMenuOrderId(null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                color: '#334155',
                                textDecoration: 'none',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-regular fa-folder-open" style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                              <span>Manage</span>
                            </Link>

                            {/* 2. Cancel */}
                            <button
                              type="button"
                              disabled={ord.status === 'cancelled'}
                              onClick={() => {
                                setActiveMenuOrderId(null);
                                setOrderToCancel(ord);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: ord.status === 'cancelled' ? '#cbd5e1' : '#b45309',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: ord.status === 'cancelled' ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (ord.status !== 'cancelled') e.currentTarget.style.background = '#fffbeb';
                              }}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-solid fa-ban" style={{ fontSize: '12px', color: ord.status === 'cancelled' ? '#cbd5e1' : '#b45309', width: '14px' }}></i>
                              <span>{ord.status === 'cancelled' ? 'Cancelled' : 'Cancel'}</span>
                            </button>

                            {/* Divider */}
                            <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }} />

                            {/* 3. Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuOrderId(null);
                                setOrderToDelete(ord);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-regular fa-trash-can" style={{ fontSize: '12px', color: '#dc2626', width: '14px' }}></i>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls (only if more than 10 orders) */}
        {totalOrders > 10 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid #E2E8F0',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {/* Entries Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#0f172a', fontWeight: '700' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalOrders)}</strong> of <strong style={{ color: '#0f172a', fontWeight: '700' }}>{totalOrders}</strong> orders
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#334155',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '9px' }}></i>
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - safeCurrentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} style={{ padding: '0 3px', color: '#94a3b8', fontSize: '11px' }}>…</span>;
                  }
                  return null;
                }

                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '800' : '600',
                      borderRadius: '6px',
                      border: isActive ? '1px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                      background: isActive ? 'var(--color-primary, #b45309)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '9px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setOrderToCancel(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#B45309',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-solid fa-ban"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Cancel Order?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to cancel order <strong style={{ color: '#0f172a' }}>{orderToCancel.reference_code}</strong>?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  background: 'var(--color-primary, #b45309)',
                  border: '1px solid var(--color-primary, #b45309)',
                  borderRadius: '999px',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: '#ffffff',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setOrderToDelete(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-regular fa-trash-can"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Delete Order?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Permanently delete order <strong style={{ color: '#0f172a' }}>{orderToDelete.reference_code}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '999px',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#E2E8F0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#F1F5F9')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  background: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '999px',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: '#ffffff',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
