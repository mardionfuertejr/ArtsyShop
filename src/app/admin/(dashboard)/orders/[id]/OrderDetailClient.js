'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAllMockOrders } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelative } from '@/lib/utils/formatDate';

export default function OrderDetailClient({ order: initialOrder }) {
  const [order, setOrder] = useState(initialOrder);

  // Normalize status if it was legacy pending/for_confirmation
  const initialStatus = (initialOrder.status === 'pending' || initialOrder.status === 'for_confirmation') 
    ? 'confirmed' 
    : initialOrder.status;

  const [status, setStatus] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Initialize Leaflet Map preview for order location
  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (cancelled || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const isDelivery = order.order_type === 'delivery';
        const rawLat = parseFloat(order.delivery_location?.latitude);
        const rawLng = parseFloat(order.delivery_location?.longitude);
        const hasValidCoords = !isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0;

        const coords = isDelivery && hasValidCoords
          ? [rawLat, rawLng]
          : [11.3256, 124.7349]; // Barugo Town Proper default

        const map = L.map(mapRef.current, {
          center: coords,
          zoom: hasValidCoords ? 17 : 16,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false,
        });

        // Crystal-clear high-res Google Maps Satellite + Streets Hybrid
        L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          maxNativeZoom: 20,
          subdomains: ['0', '1', '2', '3'],
        }).addTo(map);

        const iconHtml = isDelivery
          ? '<div style="color: #EA580C; font-size: 2rem; transform: translateY(-70%); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7)); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-location-dot" style="-webkit-text-stroke: 1.5px #FFFFFF;"></i></div>'
          : '<div style="color: #16A34A; font-size: 1.9rem; transform: translateY(-70%); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7)); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-store" style="-webkit-text-stroke: 1.5px #FFFFFF;"></i></div>';

        const customIcon = L.divIcon({
          className: 'admin-order-map-pin',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);
        const popupText = isDelivery
          ? (order.delivery_location?.address || `${order.customer_name}'s Delivery Location`)
          : 'M&M Artsy Crafts Studio (Pickup)';
        marker.bindPopup(`<div style="font-size: 12px; font-weight: 700; color: #0f172a; padding: 2px;">${popupText}</div>`);

        mapInstanceRef.current = map;

        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
          const resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          });
          resizeObserver.observe(mapRef.current);
          return () => {
            cancelled = true;
            resizeObserver.disconnect();
            if (mapInstanceRef.current) {
              mapInstanceRef.current.remove();
              mapInstanceRef.current = null;
            }
          };
        }
      } catch (err) {
        console.error('Error initializing order map:', err);
      }
    };

    const cleanupPromise = initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order.order_type, order.delivery_location, order.customer_name]);

  // Sync with localStorage & Supabase on mount
  useEffect(() => {
    const loadRealOrder = async () => {
      try {
        let found = null;

        // 1. Check likha_admin_orders in localStorage
        try {
          const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
          found = localPlaced.find(
            (o) => o.id === initialOrder.id || o.reference_code === initialOrder.id || o.reference_code === initialOrder.reference_code || o.id === initialOrder.reference_code
          );
        } catch {}

        // 2. Check getAllMockOrders
        if (!found || !found.order_items || found.order_items.length === 0) {
          const mockAll = getAllMockOrders();
          const mockFound = mockAll.find(
            (o) => o.id === initialOrder.id || o.reference_code === initialOrder.id || o.reference_code === initialOrder.reference_code || o.id === initialOrder.reference_code
          );
          if (mockFound && mockFound.order_items && mockFound.order_items.length > 0) {
            found = mockFound;
          }
        }

        // 3. Check client-side Supabase if still empty
        if (!found || !found.order_items || found.order_items.length === 0) {
          try {
            const supabase = createClient();
            if (supabase) {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialOrder.id);
              const query = supabase
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
                `);

              const { data: dbOrder } = isUUID
                ? await query.eq('id', initialOrder.id).maybeSingle()
                : await query.or(`id.eq.${initialOrder.id},reference_code.eq.${initialOrder.id},reference_code.eq.${initialOrder.reference_code}`).maybeSingle();

              if (dbOrder) {
                found = {
                  id: dbOrder.id,
                  reference_code: dbOrder.reference_code,
                  customer_name: dbOrder.customer_name,
                  customer_phone: dbOrder.customer_phone || '',
                  facebook_name: dbOrder.facebook_name || '',
                  order_type: dbOrder.order_type,
                  status: dbOrder.status,
                  subtotal: parseFloat(dbOrder.subtotal) || 0,
                  delivery_fee: parseFloat(dbOrder.delivery_fee) || 0,
                  total_amount: parseFloat(dbOrder.total_amount) || 0,
                  total_cost: parseFloat(dbOrder.total_cost) || 0,
                  preferred_date: dbOrder.preferred_date || null,
                  notes: dbOrder.notes || '',
                  created_at: dbOrder.created_at,
                  order_items: (dbOrder.order_items || []).map((it) => ({
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
                  delivery_location: dbOrder.delivery_locations?.[0] || null,
                };
              }
            }
          } catch {}
        }

        if (found) {
          setOrder(found);
          setStatus((found.status === 'pending' || found.status === 'for_confirmation') ? 'confirmed' : found.status);
        }
      } catch {}
    };

    loadRealOrder();
  }, [initialOrder]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    setIsMenuOpen(false);
    setStatus(newStatus);
    setOrder((prev) => ({ ...prev, status: newStatus }));

    // 1. Update in localStorage
    try {
      const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updated = localPlaced.map((o) =>
        (o.id === order.id || o.reference_code === order.reference_code)
          ? { ...o, status: newStatus }
          : o
      );
      localStorage.setItem('likha_admin_orders', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: { ...order, status: newStatus } }));
      }
    } catch {}

    // 2. Update in Supabase
    try {
      const supabase = createClient();
      if (supabase) {
        if (order.id && !order.id.startsWith('ord-')) {
          await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
        } else if (order.reference_code) {
          await supabase.from('orders').update({ status: newStatus }).eq('reference_code', order.reference_code);
        }
      }
    } catch {}

    setUpdating(false);
  };

  const getStatusBadge = (st) => {
    const config = {
      confirmed: { label: 'CONFIRMED', bg: '#E0E7FF', color: '#3730A3', icon: 'fa-solid fa-clipboard-check' },
      preparing: { label: 'CRAFTING', bg: '#FCE7F3', color: '#9D174D', icon: 'fa-solid fa-wand-magic-sparkles' },
      ready: { label: 'READY', bg: '#DCFCE7', color: '#166534', icon: 'fa-solid fa-box-check' },
      completed: { label: 'COMPLETED', bg: '#D1FAE5', color: '#065F46', icon: 'fa-solid fa-circle-check' },
      cancelled: { label: 'CANCELLED', bg: '#FEE2E2', color: '#991B1B', icon: 'fa-solid fa-circle-xmark' },
    };
    const c = config[st] || config.confirmed;
    return (
      <span style={{
        background: c.bg,
        color: c.color,
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        padding: '3px 9px',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        <i className={c.icon} style={{ fontSize: '10px' }}></i>
        <span>{c.label}</span>
      </span>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <style jsx>{`
        .order-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: stretch;
        }
        @media (min-width: 900px) {
          .order-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: stretch;
          }
        }
      `}</style>

      {/* Header Section */}
      <div style={{ marginBottom: '18px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link
            href="/admin/orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: '600',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }}></i>
            <span>Back to Orders</span>
          </Link>
          <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>/</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--color-primary)' }}>
            {order.reference_code}
          </span>
        </div>

        {/* Title Bar & Status Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--color-border-light)',
          marginBottom: '18px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Order #{order.reference_code}
              </h1>
              {getStatusBadge(status)}
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-regular fa-clock" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}></i>
              <span>Placed {formatRelative(order.created_at)} ({formatDate(order.created_at)})</span>
            </p>
          </div>

          {/* Action Trigger Buttons + Three Dots Menu */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Primary Action Button */}
            {status === 'confirmed' && (
              <button
                className="btn btn-primary"
                onClick={() => handleUpdateStatus('preparing')}
                disabled={updating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '10.5px' }}></i>
                <span>Start Handcrafting</span>
              </button>
            )}
            {status === 'preparing' && (
              <button
                className="btn btn-primary"
                onClick={() => handleUpdateStatus('ready')}
                disabled={updating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <i className="fa-solid fa-box" style={{ fontSize: '10.5px' }}></i>
                <span>Mark as Ready</span>
              </button>
            )}
            {status === 'ready' && (
              <button
                className="btn btn-primary"
                style={{
                  background: '#16A34A',
                  borderColor: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
                onClick={() => handleUpdateStatus('completed')}
                disabled={updating}
              >
                <i className="fa-solid fa-circle-check" style={{ fontSize: '10.5px' }}></i>
                <span>Complete Order</span>
              </button>
            )}

            {/* Three Dots Menu Container */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Change Order Status"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  background: isMenuOpen ? 'var(--color-surface-warm, #FAF6F0)' : 'var(--color-surface, #ffffff)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontSize: '14px',
                }}
              >
                <i className="fa-solid fa-ellipsis"></i>
              </button>

              {/* Dropdown Options */}
              {isMenuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  background: 'var(--color-surface, #ffffff)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  minWidth: '210px',
                  zIndex: 50,
                  padding: '6px',
                  animation: 'fadeIn 0.15s ease',
                }}>
                  <div style={{ padding: '6px 10px 4px', fontSize: '10.5px', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Set Order Status
                  </div>

                  <button
                    onClick={() => handleUpdateStatus('confirmed')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: status === 'confirmed' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                      color: status === 'confirmed' ? '#3730A3' : 'var(--color-text)',
                      fontSize: '12.5px',
                      fontWeight: status === 'confirmed' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-clipboard-check" style={{ color: '#4F46E5', fontSize: '12px' }}></i>
                      <span>Confirmed</span>
                    </span>
                    {status === 'confirmed' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#4F46E5' }}></i>}
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('preparing')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: status === 'preparing' ? 'rgba(219, 39, 119, 0.08)' : 'transparent',
                      color: status === 'preparing' ? '#9D174D' : 'var(--color-text)',
                      fontSize: '12.5px',
                      fontWeight: status === 'preparing' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#DB2777', fontSize: '12px' }}></i>
                      <span>Crafting</span>
                    </span>
                    {status === 'preparing' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#DB2777' }}></i>}
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('ready')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: status === 'ready' ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                      color: status === 'ready' ? '#166534' : 'var(--color-text)',
                      fontSize: '12.5px',
                      fontWeight: status === 'ready' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-box" style={{ color: '#16A34A', fontSize: '12px' }}></i>
                      <span>Ready</span>
                    </span>
                    {status === 'ready' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#16A34A' }}></i>}
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: status === 'completed' ? 'rgba(5, 150, 105, 0.08)' : 'transparent',
                      color: status === 'completed' ? '#065F46' : 'var(--color-text)',
                      fontSize: '12.5px',
                      fontWeight: status === 'completed' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-circle-check" style={{ color: '#059669', fontSize: '12px' }}></i>
                      <span>Completed</span>
                    </span>
                    {status === 'completed' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#059669' }}></i>}
                  </button>

                  <div style={{ height: '1px', background: 'var(--color-border-light)', margin: '4px 6px' }} />

                  <button
                    onClick={() => handleUpdateStatus('cancelled')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: status === 'cancelled' ? 'rgba(220, 38, 38, 0.08)' : 'transparent',
                      color: '#DC2626',
                      fontSize: '12.5px',
                      fontWeight: status === 'cancelled' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-ban" style={{ fontSize: '12px' }}></i>
                      <span>Cancel Order</span>
                    </span>
                    {status === 'cancelled' && <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Dashboard Grid with Equal Height Balance */}
      <div className="order-detail-grid">
        
        {/* Left Column: Ordered Items & Integrated Financial Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card" style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-bag-shopping" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
                  <span>Ordered Items</span>
                </h2>
                <span style={{
                  background: 'rgba(180, 83, 9, 0.08)',
                  color: 'var(--color-primary)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}>
                  {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Clean Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {order.order_items && order.order_items.length > 0 ? (
                  order.order_items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: idx < order.order_items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-text)' }}>
                            {item.product_name}
                          </span>
                          <span style={{
                            fontWeight: '700',
                            fontSize: '11.5px',
                            background: 'rgba(0, 0, 0, 0.05)',
                            color: 'var(--color-text)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}>
                            × {item.quantity}
                          </span>
                        </div>

                        {item.options?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {item.options.map((opt, oIdx) => (
                              <span key={oIdx} style={{
                                fontSize: '10.5px',
                                fontWeight: '600',
                                background: 'rgba(234, 88, 12, 0.08)',
                                color: 'var(--color-primary-dark, #9a3412)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(234, 88, 12, 0.14)',
                              }}>
                                {opt.option_name}: {opt.option_value}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {formatCurrency(item.unit_price)} each
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', fontWeight: '800', fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '16px 0' }}>
                    No items in this order.
                  </p>
                )}
              </div>
            </div>

            {/* Integrated Financial Summary */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(order.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Delivery Fee</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '800',
                fontSize: '15px',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '10px',
                marginTop: '4px',
              }}>
                <span style={{ color: 'var(--color-text)' }}>Total Amount</span>
                <span style={{ color: 'var(--color-primary)', fontSize: '18px' }}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Details */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card" style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            gap: '14px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-check" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
                <span>Customer & Delivery</span>
              </h2>
              <span style={{
                background: order.order_type === 'delivery' ? 'rgba(234, 88, 12, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                color: order.order_type === 'delivery' ? '#C2410C' : '#166534',
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <i className={order.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-store'} style={{ fontSize: '10px' }}></i>
                <span>{order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
              </span>
            </div>

            {/* Customer & Date Needed Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: order.preferred_date ? '1.1fr 1fr' : '1fr', gap: '8px' }}>
              {/* Customer Name */}
              <div style={{ background: '#F8FAFC', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <i className="fa-solid fa-user" style={{ fontSize: '9px', color: 'var(--color-primary)' }}></i>
                  <span>Customer</span>
                </span>
                <p style={{ fontWeight: '800', fontSize: '13.5px', color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {order.customer_name}
                </p>
              </div>

              {/* Date Needed */}
              {order.preferred_date && (
                <div style={{
                  background: '#FEF3C7',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #FDE68A',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '2px',
                  }}>
                    <i className="fa-regular fa-calendar-check" style={{ fontSize: '9.5px', color: '#B45309' }}></i>
                    <span>Date Needed</span>
                  </span>
                  <p style={{
                    fontWeight: '800',
                    fontSize: '12.5px',
                    color: '#B45309',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {formatDate(order.preferred_date)}
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic Full-Height Interactive Satellite Map & Navigation Container */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '220px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              background: '#FAF8F5',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}>
              {/* High-Res Satellite Pin Map (Fills entire available vertical space) */}
              <div
                ref={mapRef}
                style={{
                  flex: 1,
                  minHeight: '160px',
                  width: '100%',
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              />

              {/* Integrated Address & Turn-by-Turn Directions Bar */}
              <div style={{
                padding: '12px 14px',
                background: '#ffffff',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <i className={order.order_type === 'delivery' ? 'fa-solid fa-location-dot' : 'fa-solid fa-store'} style={{ color: 'var(--color-primary)', fontSize: '11px' }}></i>
                    <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                      {order.order_type === 'delivery' ? 'Delivery Address' : 'Studio Pickup Station'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A', margin: 0, lineHeight: 1.4 }}>
                    {order.order_type === 'delivery'
                      ? (order.delivery_location?.address || 'Poblacion, Barugo, Leyte')
                      : 'M&M Artsy Crafts Studio • Barugo, Leyte'}
                  </p>
                  {order.delivery_location?.landmark_notes && order.delivery_location.landmark_notes.trim() !== (order.delivery_location.address || '').trim() && (
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0' }}>
                      <span style={{ fontWeight: '600' }}>Landmark: </span>{order.delivery_location.landmark_notes}
                    </p>
                  )}
                </div>

                {(order.delivery_location?.latitude || order.delivery_location?.address) && (
                  <a
                    href={
                      order.delivery_location?.latitude
                        ? `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${order.delivery_location.latitude},${order.delivery_location.longitude}&travelmode=driving&dir_action=navigate`
                        : `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${encodeURIComponent((order.delivery_location?.address || 'Barugo, Leyte') + ', Philippines')}&travelmode=driving&dir_action=navigate`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Start GPS Navigation from your location to customer"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                      textDecoration: 'none',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      color: '#1E293B',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <i className="fa-solid fa-location-arrow" style={{ color: 'var(--color-primary)', fontSize: '11px' }}></i>
                    <span>Directions</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Customer Note Card (Uniform & Balanced Across the Whole Container) */}
      {order.notes && (
        <div style={{
          marginTop: '18px',
          padding: '16px 20px',
          background: 'rgba(180, 83, 9, 0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(180, 83, 9, 0.15)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <i className="fa-regular fa-comment-dots" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13px' }}></i>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary, #b45309)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer Note & Special Instructions
            </span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text)', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
            &ldquo;{order.notes}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
