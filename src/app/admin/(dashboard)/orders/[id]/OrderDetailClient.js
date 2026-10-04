'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getAllMockOrders } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatDateShort, formatRelative, formatTime12Hour, isRushDate } from '@/lib/utils/formatDate';
import { formatOrderSummary } from '@/lib/utils/formatOrderSummary';
import { deductStockForOrder } from '@/lib/engine/inventory';

function isValidProofImage(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'placeholder' ||
    trimmed === 'none' ||
    trimmed.length < 5
  ) {
    return false;
  }
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    (trimmed.startsWith('/') && !trimmed.startsWith('/api/'))
  );
}

export default function OrderDetailClient({ order: initialOrder = {} }) {
  const safeInitialOrder = initialOrder || {};
  const [order, setOrder] = useState(safeInitialOrder);

  // Normalize status if it was legacy pending/for_confirmation
  const initialStatus = (safeInitialOrder.status === 'pending' || safeInitialOrder.status === 'for_confirmation') 
    ? 'confirmed' 
    : (safeInitialOrder.status || 'confirmed');

  const [status, setStatus] = useState(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const menuRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const handleLocateDistance = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocError('GPS not supported');
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });

        const rawLat = parseFloat(order.delivery_location?.latitude);
        const rawLng = parseFloat(order.delivery_location?.longitude);
        const destLat = (!isNaN(rawLat) && rawLat !== 0) ? rawLat : 11.3256;
        const destLng = (!isNaN(rawLng) && rawLng !== 0) ? rawLng : 124.7349;

        // Haversine calculation with local road winding factor (1.25x)
        const R = 6371;
        const dLat = (destLat - uLat) * Math.PI / 180;
        const dLon = (destLng - uLng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(uLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const straightKm = R * c;
        const roadKm = Math.max(0.1, straightKm * 1.25);
        const mins = Math.max(1, Math.round((roadKm / 28) * 60)); // ~28 km/h local driving speed

        setDistanceInfo({
          km: roadKm < 1 ? `${Math.round(roadKm * 1000)}m` : `${roadKm.toFixed(1)}km`,
          minutes: mins,
          meters: Math.round(roadKm * 1000),
        });
        setLocating(false);

        // Update Leaflet map with pulsing live location marker & dashed route line
        try {
          if (mapInstanceRef.current) {
            const L = (await import('leaflet')).default;
            const map = mapInstanceRef.current;

            if (userMarkerRef.current) {
              userMarkerRef.current.remove();
            }
            if (routeLineRef.current) {
              routeLineRef.current.remove();
            }

            const userIcon = L.divIcon({
              className: 'admin-live-user-pin',
              html: `<div style="
                width: 16px;
                height: 16px;
                background: #0284C7;
                border: 2.5px solid #FFFFFF;
                border-radius: 50%;
                box-shadow: 0 0 0 7px rgba(2, 132, 199, 0.35), 0 3px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="width: 4px; height: 4px; background: #FFFFFF; border-radius: 50%;"></div>
              </div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });

            userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
            userMarkerRef.current.bindPopup('<div style="font-size: 11.5px; font-weight: 700; color: #0284C7; padding: 2px;">📍 Your Current Location</div>');

            routeLineRef.current = L.polyline([[uLat, uLng], [destLat, destLng]], {
              color: '#0284C7',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.85,
            }).addTo(map);

            map.fitBounds([[uLat, uLng], [destLat, destLng]], {
              padding: [35, 35],
              maxZoom: 17,
            });
          }
        } catch (e) {
          console.error('Error updating live map markers:', e);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocError('Location permission denied');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleCopyOrderReceipt = () => {
    if (!order) return;
    const text = formatOrderSummary(order);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    } catch {}
  };

  const handleCopyRef = (text) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  // Initialize Leaflet Map preview for order location
  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapRef.current) return;
      try {
        const L = (await import('leaflet')).default;
        try {
          await import('leaflet/dist/leaflet.css');
        } catch {}

        if (cancelled || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const isDelivery = order?.order_type === 'delivery';
        const rawLat = parseFloat(order?.delivery_location?.latitude);
        const rawLng = parseFloat(order?.delivery_location?.longitude);
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
          ? (order?.delivery_location?.address || `${order?.customer_name || 'Customer'}'s Delivery Location`)
          : 'M&M Artsy (Pickup Location)';
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
        console.warn('Error initializing order map:', err);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.order_type, order?.delivery_location, order?.customer_name]);

  // Sync with localStorage & Supabase on mount
  useEffect(() => {
    const loadRealOrder = async () => {
      try {
        let found = null;

        const targetId = initialOrder?.id || '';
        const targetRef = initialOrder?.reference_code || '';

        // 1. Check likha_admin_orders in localStorage
        try {
          const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
          found = localPlaced.find(
            (o) => (targetId && (o.id === targetId || o.reference_code === targetId)) ||
                   (targetRef && (o.reference_code === targetRef || o.id === targetRef))
          );
        } catch {}

        // 2. Check getAllMockOrders
        if (!found || !found.order_items || found.order_items.length === 0) {
          const mockAll = getAllMockOrders() || [];
          const mockFound = mockAll.find(
            (o) => (targetId && (o.id === targetId || o.reference_code === targetId)) ||
                   (targetRef && (o.reference_code === targetRef || o.id === targetRef))
          );
          if (mockFound && mockFound.order_items && mockFound.order_items.length > 0) {
            found = mockFound;
          }
        }

        // 3. Check client-side Supabase if still empty
        if (!found || !found.order_items || found.order_items.length === 0) {
          try {
            const supabase = createClient();
            if (supabase && targetId) {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
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
                ? await query.eq('id', targetId).maybeSingle()
                : await query.or(`id.eq.${targetId},reference_code.eq.${targetId}${targetRef ? `,reference_code.eq.${targetRef}` : ''}`).maybeSingle();

              if (dbOrder) {
                let payment_method = dbOrder.payment_method || dbOrder.paymentMethod || 'pickup';
                let payment_proof_url = dbOrder.payment_proof_url || dbOrder.paymentProofUrl || null;
                let gcash_reference_no = dbOrder.gcash_reference_no || dbOrder.gcashRefNo || null;
                let cleanNotes = dbOrder.notes || '';

                if (cleanNotes.includes('[PAYMENT_META:')) {
                  try {
                    const match = cleanNotes.match(/\[PAYMENT_META:(.*?)\]/);
                    if (match) {
                      const parsed = JSON.parse(match[1]);
                      if (parsed.payment_method) payment_method = parsed.payment_method;
                      if (parsed.payment_proof_url) payment_proof_url = parsed.payment_proof_url;
                      if (parsed.gcash_reference_no) gcash_reference_no = parsed.gcash_reference_no;
                      cleanNotes = cleanNotes.replace(/\[PAYMENT_META:.*?\]\s*/, '');
                    }
                  } catch {}
                }

                found = {
                  id: dbOrder.id,
                  reference_code: dbOrder.reference_code,
                  customer_name: dbOrder.customer_name,
                  customer_phone: dbOrder.customer_phone || '',
                  facebook_name: dbOrder.facebook_name || '',
                  order_type: dbOrder.order_type,
                  status: dbOrder.status,
                  payment_method,
                  payment_proof_url,
                  gcash_reference_no,
                  subtotal: parseFloat(dbOrder.subtotal) || 0,
                  delivery_fee: parseFloat(dbOrder.delivery_fee) || 0,
                  rush_fee: parseFloat(dbOrder.rush_fee) || 0,
                  is_rush: Boolean(dbOrder.is_rush),
                  total_amount: parseFloat(dbOrder.total_amount) || 0,
                  total_cost: parseFloat(dbOrder.total_cost) || 0,
                  preferred_date: dbOrder.preferred_date || null,
                  preferred_time: dbOrder.preferred_time || null,
                  notes: cleanNotes,
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

    // 1. Update in localStorage across all stores
    try {
      const refCode = order.reference_code;
      const orderId = order.id;

      // likha_admin_orders
      const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updated = localPlaced.map((o) =>
        (o.id === orderId || o.reference_code === refCode)
          ? { ...o, status: newStatus }
          : o
      );
      localStorage.setItem('likha_admin_orders', JSON.stringify(updated));

      // likha_my_orders (Customer Tracking History)
      const myOrdersRaw = localStorage.getItem('likha_my_orders');
      if (myOrdersRaw) {
        const myOrders = JSON.parse(myOrdersRaw);
        const myIdx = myOrders.findIndex(o => (o.referenceCode || o.reference_code) === refCode);
        if (myIdx !== -1) {
          myOrders[myIdx].status = newStatus;
          localStorage.setItem('likha_my_orders', JSON.stringify(myOrders));
        }
      }

      // likha_last_order_${refCode}
      if (refCode) {
        const lastOrderRaw = localStorage.getItem(`likha_last_order_${refCode}`);
        if (lastOrderRaw) {
          const lastOrder = JSON.parse(lastOrderRaw);
          lastOrder.status = newStatus;
          localStorage.setItem(`likha_last_order_${refCode}`, JSON.stringify(lastOrder));
        }
      }

      // likha_mock_orders
      const mockRaw = localStorage.getItem('likha_mock_orders');
      if (mockRaw) {
        const mockList = JSON.parse(mockRaw);
        const mIdx = mockList.findIndex(o => o.reference_code === refCode || o.id === orderId);
        if (mIdx !== -1) {
          mockList[mIdx].status = newStatus;
          localStorage.setItem('likha_mock_orders', JSON.stringify(mockList));
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('likha_order_updated', { detail: { ...order, status: newStatus } }));
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: { ...order, status: newStatus } }));
      }
    } catch {}

    // 2. Update in Supabase
    try {
      const supabase = createClient();
      if (supabase) {
        if (order.id && !String(order.id).startsWith('ord-')) {
          await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
        } else if (order.reference_code) {
          await supabase.from('orders').update({ status: newStatus }).eq('reference_code', order.reference_code);
        }
      }
    } catch {}

    // 3. Dispatch Web Push & Customer Realtime Notification
    try {
      fetch('/api/push/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_code: refCode,
          status: newStatus,
          customer_name: order.customer_name,
          order_type: order.order_type,
        }),
      }).catch(() => {});
    } catch {}

    // 4. Auto-deduct material inventory on confirmation / crafting / completion
    if (newStatus === 'confirmed' || newStatus === 'preparing' || newStatus === 'crafting' || newStatus === 'completed') {
      try {
        await deductStockForOrder({ ...order, status: newStatus });
      } catch (deductErr) {
        console.warn('Material auto-deduction note:', deductErr);
      }
    }

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
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

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
                  type="button"
                  onClick={() => handleUpdateStatus('preparing')}
                  disabled={updating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 13px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(234, 88, 12, 0.25)',
                    whiteSpace: 'nowrap',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '11.5px' }}></i>
                  <span>Start Handcrafting</span>
                </button>
              )}
              {status === 'preparing' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('ready')}
                  disabled={updating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 13px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#D97706',
                    color: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)',
                    whiteSpace: 'nowrap',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="fa-solid fa-box" style={{ fontSize: '11.5px' }}></i>
                  <span>Mark as Ready</span>
                </button>
              )}
              {status === 'ready' && (
                <button
                  type="button"
                  style={{
                    background: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 13px',
                    fontSize: '12px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
                    whiteSpace: 'nowrap',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={updating}
                >
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '11.5px' }}></i>
                  <span>Complete Order</span>
                </button>
              )}
              {status === 'completed' && (
                <span style={{
                  background: '#DCFCE7',
                  color: '#166534',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #BBF7D0',
                  boxSizing: 'border-box',
                }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '11.5px' }}></i>
                  <span>Order Completed</span>
                </span>
              )}
              {status === 'cancelled' && (
                <span style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #FECACA',
                  boxSizing: 'border-box',
                }}>
                  <i className="fa-solid fa-circle-xmark" style={{ fontSize: '11.5px' }}></i>
                  <span>Order Cancelled</span>
                </span>
              )}

              {/* 1-Tap Copy Order Receipt */}
              <button
                type="button"
                onClick={handleCopyOrderReceipt}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 13px',
                  borderRadius: '8px',
                  border: copiedReceipt ? '1px solid #10B981' : '1px solid #CBD5E1',
                  background: copiedReceipt ? '#ECFDF5' : '#ffffff',
                  color: copiedReceipt ? '#059669' : '#334155',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                }}
                title="Copy formatted order receipt to clipboard"
              >
                <i className={copiedReceipt ? 'fa-solid fa-check' : 'fa-regular fa-copy'} style={{ fontSize: '12px' }}></i>
                <span>{copiedReceipt ? 'Receipt Copied!' : 'Copy Receipt'}</span>
              </button>

              {/* Three Dots Menu Container */}
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  title="More Options"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: isMenuOpen ? '#f1f5f9' : '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 28px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
                    minWidth: '175px',
                    padding: '5px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    boxSizing: 'border-box',
                  }}>
                    <div style={{ padding: '5px 8px 3px', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Set Status
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('confirmed')}
                      style={{
                        width: '100%',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: status === 'confirmed' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        color: status === 'confirmed' ? '#4338CA' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: status === 'confirmed' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-clipboard-check" style={{ color: '#4F46E5', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
                        <span>Confirmed</span>
                      </span>
                      {status === 'confirmed' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#4F46E5' }}></i>}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('preparing')}
                      style={{
                        width: '100%',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: status === 'preparing' ? 'rgba(219, 39, 119, 0.08)' : 'transparent',
                        color: status === 'preparing' ? '#BE185D' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: status === 'preparing' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#DB2777', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
                        <span>Crafting</span>
                      </span>
                      {status === 'preparing' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#DB2777' }}></i>}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('ready')}
                      style={{
                        width: '100%',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: status === 'ready' ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                        color: status === 'ready' ? '#15803D' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: status === 'ready' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-box" style={{ color: '#16A34A', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
                        <span>Ready</span>
                      </span>
                      {status === 'ready' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#16A34A' }}></i>}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('completed')}
                      style={{
                        width: '100%',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: status === 'completed' ? 'rgba(5, 150, 105, 0.08)' : 'transparent',
                        color: status === 'completed' ? '#047857' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: status === 'completed' ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#059669', fontSize: '12px', width: '14px', textAlign: 'center' }}></i>
                        <span>Completed</span>
                      </span>
                      {status === 'completed' && <i className="fa-solid fa-check" style={{ fontSize: '11px', color: '#059669' }}></i>}
                    </button>

                    {/* Divider */}
                    <div style={{ height: '1px', background: '#f1f5f9', margin: '3px 4px' }} />

                    {status === 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('confirmed')}
                        style={{
                          width: '100%',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: '#4F46E5',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-rotate-left" style={{ fontSize: '11px', width: '14px', textAlign: 'center' }}></i>
                          <span>Restore Order</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('cancelled')}
                        style={{
                          width: '100%',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          transition: 'background 0.12s ease',
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
                                {opt.option_name ? `${opt.option_name}: ${opt.option_value}` : opt.option_value}
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
                background: order?.order_type === 'delivery' ? 'rgba(234, 88, 12, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                color: order?.order_type === 'delivery' ? '#C2410C' : '#166534',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}>
                <i className={order?.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-store'} style={{ fontSize: '10px' }}></i>
                <span>{order?.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
              </span>
            </div>
            {/* Customer & Date Needed Info Pills - Equal Height & Balanced */}
            <div className="pills-grid" style={{
              display: 'grid',
              gridTemplateColumns: order?.preferred_date ? '1fr 1fr' : '1fr',
              gap: '10px',
              alignItems: 'stretch',
            }}>
              {/* Customer Box */}
              <div style={{
                background: '#F8FAFC',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
                minHeight: '75px',
              }}>
                <div>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                    <i className="fa-solid fa-user" style={{ fontSize: '9.5px', color: 'var(--color-primary)' }}></i>
                    <span>Customer</span>
                  </span>
                  <p style={{ fontWeight: '800', fontSize: '13px', color: '#0F172A', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                    {order?.customer_name || 'Customer'}
                  </p>
                  {order?.customer_phone && (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                      {order.customer_phone}
                    </span>
                  )}
                </div>

                {/* Messenger Chat Status Badge */}
                <div style={{
                  paddingTop: '6px',
                  borderTop: '1px solid #E2E8F0',
                  marginTop: 'auto',
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    fontWeight: '700',
                    background: (order?.messenger_opened_at || order?.sent_to_messenger) ? '#ECFDF5' : '#FFFBEB',
                    color: (order?.messenger_opened_at || order?.sent_to_messenger) ? '#065F46' : '#92400E',
                    border: (order?.messenger_opened_at || order?.sent_to_messenger) ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                  }}>
                    <i
                      className={(order?.messenger_opened_at || order?.sent_to_messenger) ? 'fa-brands fa-facebook-messenger' : 'fa-regular fa-clock'}
                      style={{
                        color: (order?.messenger_opened_at || order?.sent_to_messenger) ? '#0084FF' : '#D97706',
                        fontSize: '10px',
                      }}
                    />
                    <span>
                      {(order?.messenger_opened_at || order?.sent_to_messenger) ? 'Chat Opened' : 'Awaiting Chat'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Needed Box */}
              {order?.preferred_date && (
                <div style={{
                  background: '#F8FAFC',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  minHeight: '75px',
                }}>
                  <div>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginBottom: '2px',
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
                      {formatDate(order.preferred_date)}{order?.preferred_time ? ` · ${formatTime12Hour(order.preferred_time)}` : ''}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '6px',
                    borderTop: '1px solid #E2E8F0',
                    marginTop: 'auto',
                    fontSize: '10px',
                    color: '#64748B',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <i className={order?.delivery_locations ? "fa-solid fa-truck-fast" : "fa-solid fa-store"} style={{ fontSize: '10px', color: 'var(--color-primary)' }}></i>
                    <span>{order?.delivery_locations ? "Delivery Schedule" : "Pickup Schedule"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method & Proof of Payment Card */}
            {(() => {
              const isGcash = order?.payment_method === 'gcash' || order?.paymentMethod === 'gcash';
              const rawProofUrl = order?.payment_proof_url || order?.paymentProofUrl;
              const hasPhoto = isValidProofImage(rawProofUrl);
              const refNo = (order?.gcash_reference_no || order?.gcashRefNo || '').trim();
              const hasRef = Boolean(refNo);

              return (
                <div style={{
                  background: isGcash ? '#EFF6FF' : '#F0FDF4',
                  border: `1px solid ${isGcash ? '#BFDBFE' : '#BBF7D0'}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {/* Top Row: Method, Status Badge & Action Button (Aligned & Balanced) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: isGcash ? '#007DFE' : '#16A34A',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12.5px',
                        flexShrink: 0,
                      }}>
                        <i className={isGcash ? 'fa-solid fa-wallet' : 'fa-solid fa-money-bill-wave'}></i>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: isGcash ? '#1E40AF' : '#166534', whiteSpace: 'nowrap' }}>
                          {isGcash ? 'GCash' : (order.order_type === 'delivery' ? 'Cash on Delivery (COD)' : 'Cash (Pickup)')}
                        </span>
                        {isGcash && (
                          hasPhoto && hasRef ? (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1.5px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-check-double"></i> Pic & Ref
                            </span>
                          ) : hasPhoto ? (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1.5px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-image"></i> Pic Attached
                            </span>
                          ) : hasRef ? (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#1D4ED8', background: '#DBEAFE', border: '1px solid #93C5FD', padding: '1.5px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-receipt"></i> Ref Only
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1.5px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-clock"></i> Unverified
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* View Receipt Photo Button (Aligned on Right) */}
                    {isGcash && hasPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageError(false);
                          setShowReceiptModal(true);
                        }}
                        style={{
                          background: '#007DFE',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '5px 10px',
                          borderRadius: '7px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 1px 3px rgba(0, 125, 254, 0.25)',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <i className="fa-solid fa-image"></i>
                        <span>Receipt</span>
                      </button>
                    )}
                  </div>

                  {/* Compact Reference No. Row */}
                  {isGcash && hasRef && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FFFFFF',
                      border: '1px solid #DBEAFE',
                      borderRadius: '7px',
                      padding: '5px 8px',
                      gap: '6px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: '600' }}>Ref:</span>
                        <strong style={{ fontSize: '12px', color: '#0F172A', fontFamily: 'monospace', letterSpacing: '0.5px', wordBreak: 'break-all' }}>{refNo}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyRef(refNo)}
                        style={{
                          background: copiedRef ? '#10B981' : '#F1F5F9',
                          color: copiedRef ? '#FFFFFF' : '#1E293B',
                          border: '1px solid #CBD5E1',
                          borderRadius: '5px',
                          padding: '2px 7px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className={copiedRef ? 'fa-solid fa-check' : 'fa-regular fa-copy'} style={{ fontSize: '10px' }}></i>
                        <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

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
              position: 'relative',
            }}>
              {/* Floating Live Distance & ETA Pill (Auto-calculated from Current Location) */}
              {distanceInfo && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 1000,
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(6px)',
                  color: '#FFFFFF',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  pointerEvents: 'none',
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
                  <span>{distanceInfo.km} away</span>
                  <span style={{ color: '#94A3B8' }}>•</span>
                  <span style={{ color: '#38BDF8' }}>~{distanceInfo.minutes} min drive</span>
                </div>
              )}

              {locError && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 1000,
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#FFFFFF',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}>
                  {locError}
                </div>
              )}

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

              {/* Address & Action Buttons Bar */}
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
                      {order.order_type === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {order.order_type === 'delivery'
                      ? (order.delivery_location?.address || (typeof order.delivery_location === 'string' ? order.delivery_location : null) || order.delivery_address || order.address || 'Poblacion, Barugo, Leyte')
                      : 'M&M Artsy • Barugo, Leyte'}
                  </p>
                  {order.order_type === 'delivery' && order.delivery_location?.landmark_notes && order.delivery_location.landmark_notes.trim() !== (order.delivery_location.address || '').trim() && (
                    <p style={{ fontSize: '10.5px', color: '#64748B', margin: '2px 0 0', wordBreak: 'break-word' }}>
                      <span style={{ fontWeight: '600' }}>Landmark: </span>{order.delivery_location.landmark_notes}
                    </p>
                  )}
                </div>

                {/* 1-Word Action Buttons: Locate & Directions (Uniform 32px Height, Non-redundant) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* 1-Word GPS Distance Calculator Button (Only relevant for Delivery orders) */}
                  {order.order_type === 'delivery' && (
                    <button
                      type="button"
                      onClick={handleLocateDistance}
                      disabled={locating}
                      title="Calculate distance & ETA from your current GPS location"
                      style={{
                        height: '32px',
                        padding: '0 11px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        flexShrink: 0,
                        cursor: locating ? 'wait' : 'pointer',
                        background: distanceInfo ? '#EFF6FF' : '#F8FAFC',
                        border: distanceInfo ? '1px solid #BFDBFE' : '1px solid #CBD5E1',
                        color: distanceInfo ? '#1D4ED8' : '#334155',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        lineHeight: 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i
                        className={locating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'}
                        style={{ color: distanceInfo ? '#2563EB' : '#0284C7', fontSize: '11.5px' }}
                      ></i>
                      <span>{locating ? 'Locating...' : (distanceInfo ? distanceInfo.km : 'Locate')}</span>
                    </button>
                  )}

                  {/* Google Maps Live Turn-by-Turn GPS Directions Button */}
                  <a
                    href={(() => {
                      const isDelivery = order.order_type === 'delivery';
                      const rawLat = parseFloat(order.delivery_location?.latitude);
                      const rawLng = parseFloat(order.delivery_location?.longitude);
                      const hasValidCoords = !isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0;

                      const addrStr = typeof order.delivery_location === 'string'
                        ? order.delivery_location
                        : (order.delivery_location?.address || order.delivery_address || order.address || 'Poblacion, Barugo, Leyte');

                      const destination = isDelivery
                        ? (hasValidCoords ? `${rawLat},${rawLng}` : encodeURIComponent(`${addrStr}, Barugo, Leyte, Philippines`))
                        : encodeURIComponent('M&M Artsy, Barugo, Leyte, Philippines');

                      const originParam = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';

                      return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving&dir_action=navigate`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Open Google Maps for turn-by-turn driving directions"
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      textDecoration: 'none',
                      background: '#0F172A',
                      border: '1px solid #0F172A',
                      color: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                      lineHeight: 1,
                    }}
                  >
                    <i className="fa-solid fa-diamond-turn-right" style={{ color: '#38BDF8', fontSize: '11.5px' }}></i>
                    <span>Directions</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Proof / Reference Verification Modal */}
        {showReceiptModal && (() => {
          const rawProofUrl = order.payment_proof_url || order.paymentProofUrl;
          const hasPhoto = isValidProofImage(rawProofUrl);
          const showPhoto = hasPhoto && !imageError;
          const refNo = (order.gcash_reference_no || order.gcashRefNo || '').trim();
          const hasRef = Boolean(refNo);

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(5px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
              onClick={() => setShowReceiptModal(false)}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px',
                  maxWidth: '480px',
                  width: '100%',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9px',
                      background: '#EFF6FF',
                      color: '#007DFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}>
                      <i className={showPhoto ? "fa-solid fa-wallet" : "fa-solid fa-receipt"}></i>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                          GCash Payment Receipt
                        </h3>
                        <span style={{
                          background: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '1.5px 7px',
                          borderRadius: '6px',
                        }}>
                          ₱{parseFloat(order.total_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                        Order #{order.reference_code} · {order.customer_name}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748B',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Modal Body */}
                {showPhoto ? (
                  /* Photo Mode (Screenshot uploaded) */
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: '#0F172A',
                    borderRadius: '12px',
                    border: '1px solid #1E293B',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '260px',
                    position: 'relative',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rawProofUrl}
                      alt="Customer Payment Receipt"
                      onError={() => setImageError(true)}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '60vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        cursor: 'zoom-in',
                      }}
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.open(rawProofUrl, '_blank');
                        }
                      }}
                      title="Click to view full image in new tab"
                    />
                  </div>
                ) : (
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '24px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: '#EFF6FF',
                      color: '#007DFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      border: '1px solid #BFDBFE',
                    }}>
                      <i className="fa-solid fa-receipt"></i>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        GCash Reference Number
                      </span>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#007DFE',
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                        marginTop: '4px',
                        background: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1.5px solid #BFDBFE',
                        userSelect: 'all',
                      }}>
                        {refNo || 'No Reference Provided'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#047857', fontWeight: '700', marginTop: '8px' }}>
                        Expected Amount: ₱{parseFloat(order.total_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Footer: Clean, Minimalist & Action-Oriented */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Left: Interactive Reference No. Pill with Instant Copy */}
                  <div>
                    {hasRef ? (
                      <button
                        type="button"
                        onClick={() => handleCopyRef(refNo)}
                        style={{
                          background: copiedRef ? '#ECFDF5' : '#F1F5F9',
                          border: `1px solid ${copiedRef ? '#A7F3D0' : '#CBD5E1'}`,
                          color: copiedRef ? '#047857' : '#334155',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        title="Click to copy Reference No."
                      >
                        <i className={copiedRef ? "fa-solid fa-check" : "fa-regular fa-copy"} style={{ fontSize: '11px', color: copiedRef ? '#059669' : '#64748B' }}></i>
                        <span>Ref: <strong style={{ fontFamily: 'monospace' }}>{refNo}</strong></span>
                        {copiedRef && <span style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>Copied!</span>}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No typed Ref No. · Check receipt photo
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {status !== 'confirmed' && status !== 'preparing' && status !== 'ready' && status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateStatus('confirmed');
                          setShowReceiptModal(false);
                        }}
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          background: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 5px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className="fa-solid fa-circle-check" style={{ fontSize: '13px' }}></i>
                        <span>Verify & Confirm</span>
                      </button>
                    ) : (
                      <span style={{
                        height: '36px',
                        padding: '0 12px',
                        background: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        borderRadius: '9px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#10B981' }}></i>
                        <span>Payment Verified</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(false)}
                      style={{
                        height: '36px',
                        padding: '0 14px',
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        borderRadius: '9px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
