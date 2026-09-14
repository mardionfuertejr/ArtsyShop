'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAllMockOrders } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelative, formatTime12Hour } from '@/lib/utils/formatDate';

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
          : 'M&M Artsy Crafts Store (Pickup)';
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
                  rush_fee: parseFloat(dbOrder.rush_fee) || 0,
                  is_rush: Boolean(dbOrder.is_rush),
                  total_amount: parseFloat(dbOrder.total_amount) || 0,
                  total_cost: parseFloat(dbOrder.total_cost) || 0,
                  preferred_date: dbOrder.preferred_date || null,
                  preferred_time: dbOrder.preferred_time || null,
                  notes: dbOrder.notes || '',
                  messenger_opened_at: dbOrder.messenger_opened_at || dbOrder.messengerOpenedAt || null,
                  sent_to_messenger: Boolean(dbOrder.sent_to_messenger || dbOrder.sentToMessenger || dbOrder.messenger_opened_at),
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
        .order-detail-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .order-detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: stretch;
        }
        @media (min-width: 900px) {
          .order-detail-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 20px;
            align-items: stretch;
          }
        }
        @media (max-width: 540px) {
          .order-detail-grid {
            gap: 14px;
          }
          .pills-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="order-detail-container">
        {/* Header Section */}
        <div style={{ marginBottom: '18px' }}>
          {/* Navigation Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
              #{order.reference_code}
            </span>
          </div>

          {/* Title Bar & Status Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border-light)',
            marginBottom: '18px',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '21px', fontWeight: '800', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
                  Order #{order.reference_code}
                </h1>
                {getStatusBadge(status)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <i className="fa-regular fa-clock" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}></i>
                <span>Placed {formatRelative(order.created_at)} ({formatDate(order.created_at)})</span>
              </p>
            </div>

            {/* Action Trigger Buttons + Three Dots Menu */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Primary Action Progression Button */}
              {status === 'confirmed' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus('preparing')}
                  disabled={updating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '11px' }}></i>
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
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className="fa-solid fa-box" style={{ fontSize: '11px' }}></i>
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
                    gap: '6px',
                    height: '34px',
                    padding: '0 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                >
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '11px' }}></i>
                  <span>Complete Order</span>
                </button>
              )}
              {status === 'completed' && (
                <span style={{
                  background: '#DCFCE7',
                  color: '#166534',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #BBF7D0',
                }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '11px' }}></i>
                  <span>Order Completed</span>
                </span>
              )}
              {status === 'cancelled' && (
                <span style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #FECACA',
                }}>
                  <i className="fa-solid fa-circle-xmark" style={{ fontSize: '11px' }}></i>
                  <span>Order Cancelled</span>
                </span>
              )}

              {/* Three Dots Menu Container */}
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  title="More Options"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: isMenuOpen ? '#f1f5f9' : '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="fa-solid fa-ellipsis" style={{ fontSize: '13px' }}></i>
                </button>

                {/* Status Action Menu Popover */}
                {isMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
                    minWidth: '175px',
                    padding: '6px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    <div style={{ padding: '4px 8px 2px', fontSize: '9.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Set Status
                    </div>

                    <button
                      onClick={() => handleUpdateStatus('confirmed')}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 9px',
                        borderRadius: '7px',
                        border: 'none',
                        background: status === 'confirmed' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        color: status === 'confirmed' ? '#4338CA' : 'var(--color-text)',
                        fontSize: '12px',
                        fontWeight: status === 'confirmed' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-clipboard-check" style={{ color: '#4F46E5', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
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
                        padding: '7px 9px',
                        borderRadius: '7px',
                        border: 'none',
                        background: status === 'preparing' ? 'rgba(219, 39, 119, 0.08)' : 'transparent',
                        color: status === 'preparing' ? '#BE185D' : 'var(--color-text)',
                        fontSize: '12px',
                        fontWeight: status === 'preparing' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#DB2777', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
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
                        padding: '7px 9px',
                        borderRadius: '7px',
                        border: 'none',
                        background: status === 'ready' ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                        color: status === 'ready' ? '#15803D' : 'var(--color-text)',
                        fontSize: '12px',
                        fontWeight: status === 'ready' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-box" style={{ color: '#16A34A', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
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
                        padding: '7px 9px',
                        borderRadius: '7px',
                        border: 'none',
                        background: status === 'completed' ? 'rgba(5, 150, 105, 0.08)' : 'transparent',
                        color: status === 'completed' ? '#047857' : 'var(--color-text)',
                        fontSize: '12px',
                        fontWeight: status === 'completed' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#059669', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
                        <span>Completed</span>
                      </span>
                      {status === 'completed' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#059669' }}></i>}
                    </button>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'var(--color-border-light)', margin: '4px 6px' }} />

                    {status === 'cancelled' ? (
                      <button
                        onClick={() => handleUpdateStatus('confirmed')}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: 'none',
                          background: 'transparent',
                          color: '#4F46E5',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-rotate-left" style={{ fontSize: '11px', width: '14px', textAlign: 'center' }}></i>
                          <span>Restore Order</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus('cancelled')}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          border: 'none',
                          background: 'transparent',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-ban" style={{ fontSize: '11px', width: '14px', textAlign: 'center' }}></i>
                          <span>Cancel Order</span>
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Dashboard Grid (Auto-adjusting & Fully Responsive) */}
        <div className="order-detail-grid">
          
          {/* Left Column: Ordered Items, Customer Note & Financial Breakdown */}
          <div className="card" style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-bag-shopping" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
                <span>Ordered Items</span>
              </h2>
              <span style={{
                background: 'rgba(180, 83, 9, 0.08)',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}>
                {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Clean Items List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: idx < order.order_items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className="fa-solid fa-gift" style={{ color: 'var(--color-primary, #b45309)', fontSize: '14px' }}></i>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                            {item.product_name}
                          </span>
                          <span style={{
                            fontWeight: '700',
                            fontSize: '11px',
                            background: 'rgba(0, 0, 0, 0.06)',
                            color: '#334155',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}>
                            × {item.quantity}
                          </span>
                        </div>

                        {item.options?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                            {item.options.map((opt, oIdx) => (
                              <span key={oIdx} style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                background: 'rgba(234, 88, 12, 0.08)',
                                color: 'var(--color-primary-dark, #9a3412)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid rgba(234, 88, 12, 0.14)',
                              }}>
                                {opt.option_name}: {opt.option_value}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {formatCurrency(item.unit_price)} each
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: '800', fontSize: '13.5px', color: 'var(--color-text)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0', margin: 0 }}>
                  No items in this order.
                </p>
              )}
            </div>

            {/* Integrated Customer Note */}
            {order.notes && (
              <div style={{
                background: 'rgba(180, 83, 9, 0.04)',
                border: '1px solid rgba(180, 83, 9, 0.14)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                marginTop: '12px',
              }}>
                <i className="fa-regular fa-comment-dots" style={{ color: 'var(--color-primary)', fontSize: '13px', marginTop: '2px', flexShrink: 0 }}></i>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                    Customer Note
                  </span>
                  <p style={{ margin: 0, fontSize: '12px', color: '#78350F', fontStyle: 'italic', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    &ldquo;{order.notes}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Integrated Financial Summary - Anchored at bottom for auto-adjusted layout */}
            <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(order.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                <span>Delivery Fee</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(order.delivery_fee)}</span>
              </div>
              {(parseFloat(order.rush_fee) > 0 || order.is_rush) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#EA580C', fontWeight: '600' }}>
                  <span>Rush Fee</span>
                  <span>+{formatCurrency(order.rush_fee || 50)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '800',
                fontSize: '14.5px',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '8px',
                marginTop: '4px',
              }}>
                <span style={{ color: 'var(--color-text)' }}>Total Amount</span>
                <span style={{ color: 'var(--color-primary)', fontSize: '17px' }}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Customer & Delivery Details */}
          <div className="card" style={{
            padding: '20px',
            background: 'var(--color-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            gap: '12px',
            height: '100%',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-check" style={{ color: 'var(--color-primary)', fontSize: '14px' }}></i>
                <span>Customer & Delivery</span>
              </h2>
              <span style={{
                background: order.order_type === 'delivery' ? 'rgba(234, 88, 12, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                color: order.order_type === 'delivery' ? '#C2410C' : '#166534',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}>
                <i className={order.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-store'} style={{ fontSize: '10px' }}></i>
                <span>{order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
              </span>
            </div>

            {/* Customer & Date Needed Info Pills - Responsive auto-adjust */}
            <div className="pills-grid" style={{ display: 'grid', gridTemplateColumns: order.preferred_date ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {/* Customer Name & Phone */}
              <div style={{
                background: '#F8FAFC',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '60px',
              }}>
                <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  <i className="fa-solid fa-user" style={{ fontSize: '9.5px', color: 'var(--color-primary)' }}></i>
                  <span>Customer</span>
                </span>
                <p style={{ fontWeight: '800', fontSize: '13px', color: '#0F172A', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                  {order.customer_name}
                </p>
                {order.customer_phone && (
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                    {order.customer_phone}
                  </span>
                )}
                {order.status === 'pending' && (
                  <div style={{
                    marginTop: '5px',
                    paddingTop: '5px',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: (order.messenger_opened_at || order.sent_to_messenger) ? '#16A34A' : '#64748B',
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: (order.messenger_opened_at || order.sent_to_messenger) ? '#16A34A' : '#CBD5E1',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}></span>
                    <span>
                      {(order.messenger_opened_at || order.sent_to_messenger) ? 'Chat Opened' : 'Awaiting Chat'}
                    </span>
                  </div>
                )}
              </div>

              {/* Date Needed */}
              {order.preferred_date && (
                <div style={{
                  background: '#F8FAFC',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '60px',
                }}>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginBottom: '3px',
                  }}>
                    <i className="fa-regular fa-calendar-check" style={{ fontSize: '10px', color: 'var(--color-primary)' }}></i>
                    <span>Date Needed</span>
                  </span>
                  <p style={{
                    fontWeight: '800',
                    fontSize: '12.5px',
                    color: '#0F172A',
                    margin: 0,
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                  }}>
                    {formatDate(order.preferred_date)}{order.preferred_time ? ` · ${formatTime12Hour(order.preferred_time)}` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Satellite Map & Navigation Container (Flex-growing & Auto-adjusting) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              background: '#FAF8F5',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              marginTop: 'auto',
              flex: 1,
              minHeight: '200px',
            }}>
              {/* Satellite Map */}
              <div
                ref={mapRef}
                style={{
                  minHeight: '140px',
                  flex: 1,
                  width: '100%',
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              />

              {/* Address & Directions Bar */}
              <div style={{
                padding: '10px 12px',
                background: '#ffffff',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <i className={order.order_type === 'delivery' ? 'fa-solid fa-location-dot' : 'fa-solid fa-store'} style={{ color: 'var(--color-primary)', fontSize: '10.5px' }}></i>
                    <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                      {order.order_type === 'delivery' ? 'Delivery Address' : 'Store Pickup Station'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {order.order_type === 'delivery'
                      ? (order.delivery_location?.address || 'Poblacion, Barugo, Leyte')
                      : 'M&M Artsy Crafts Shop • Barugo, Leyte'}
                  </p>
                  {order.order_type === 'delivery' && order.delivery_location?.landmark_notes && order.delivery_location.landmark_notes.trim() !== (order.delivery_location.address || '').trim() && (
                    <p style={{ fontSize: '10.5px', color: '#64748B', margin: '2px 0 0', wordBreak: 'break-word' }}>
                      <span style={{ fontWeight: '600' }}>Landmark: </span>{order.delivery_location.landmark_notes}
                    </p>
                  )}
                </div>

                {(order.delivery_location?.latitude || order.delivery_location?.address || order.order_type === 'pickup') && (
                  <a
                    href={(() => {
                      const isDelivery = order.order_type === 'delivery';
                      const rawLat = parseFloat(order.delivery_location?.latitude);
                      const rawLng = parseFloat(order.delivery_location?.longitude);
                      const hasValidCoords = !isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0;

                      const destination = isDelivery && hasValidCoords
                        ? `${rawLat},${rawLng}`
                        : isDelivery && order.delivery_location?.address
                          ? encodeURIComponent(`${order.delivery_location.address}, Barugo, Leyte, Philippines`)
                          : '11.3256,124.7349';

                      return `https://www.google.com/maps/dir//${destination}/data=!3m1!1e3!4m2!4m1!3e0?api=1&travelmode=driving&dir_action=navigate&basemap=satellite&t=k`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Start GPS Navigation"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      borderRadius: '7px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      textDecoration: 'none',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      color: '#1E293B',
                    }}
                  >
                    <i className="fa-solid fa-location-arrow" style={{ color: 'var(--color-primary)', fontSize: '10px' }}></i>
                    <span>Directions</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
