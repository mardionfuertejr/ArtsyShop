'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { generateOrderReference } from '@/lib/engine/reference';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { addMockOrder } from '@/lib/mockData';

const DELIVERY_FEE = 50; // default, will come from settings later

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, removeItem } = useCart();
  const [selectedIds, setSelectedIds] = useState(null);
  const [orderType, setOrderType] = useState('delivery');
  const [formData, setFormData] = useState({ name: '', phone: '', facebookName: '', notes: '', preferredDate: '' });
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ pickup_address: '', pickup_notes: '', delivery_fee: DELIVERY_FEE });
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Load selected items passed from cart
  useEffect(() => {
    try {
      const stored = localStorage.getItem('likha_checkout_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedIds(parsed);
        }
      }
    } catch {}
  }, []);

  // Filter items to checkout
  const checkoutCart = selectedIds && selectedIds.length > 0
    ? cart.filter((item) => selectedIds.includes(item.cartItemId))
    : cart;

  const subtotal = checkoutCart.reduce((sum, c) => {
    return sum + (parseFloat(c.unitPrice) || 0) * (c.quantity || 1);
  }, 0);

  // Load business settings & saved customer info
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('likha_guest_info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        setFormData(prev => ({
          ...prev,
          name: parsed.name || '',
          phone: parsed.phone || '',
          facebookName: parsed.facebookName || '',
        }));
      }
    } catch {}

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data?.settings) {
          setSettings({
            pickup_address: data.settings.studioAddress,
            pickup_notes: data.settings.studioAddress,
            delivery_fee: parseFloat(data.settings.deliveryFee) || DELIVERY_FEE,
            gcash_name: data.settings.gcashName,
            gcash_number: data.settings.gcashNumber,
            studio_name: data.settings.studioName,
          });
          return;
        }
      } catch {}

      try {
        const local = localStorage.getItem('mm_studio_settings');
        if (local) {
          const parsed = JSON.parse(local);
          setSettings({
            pickup_address: parsed.studioAddress,
            pickup_notes: parsed.studioAddress,
            delivery_fee: parseFloat(parsed.deliveryFee) || DELIVERY_FEE,
            gcash_name: parsed.gcashName,
            gcash_number: parsed.gcashNumber,
            studio_name: parsed.studioName,
          });
          return;
        }
      } catch {}

      try {
        const supabase = createClient();
        if (supabase) {
          const { data } = await supabase.from('business_settings').select('*').single();
          if (data) setSettings(data);
        }
      } catch {
        // Fallback default settings
      }
    };
    loadSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem('likha_guest_info', JSON.stringify({
          name: updated.name,
          phone: updated.phone,
          facebookName: updated.facebookName,
        }));
      } catch {}
      return updated;
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (orderType !== 'delivery') return;
    if (typeof window === 'undefined') return;

    // Reset ref to allow re-initialization when switching back to delivery
    let cancelled = false;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled) return;
      if (!mapRef.current) return;

      // If map already exists, just refresh it
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      // Default: Barugo Town Proper (Poblacion), Leyte
      const BARUGO_PROPER_COORDS = [11.3256, 124.7349];
      const map = L.map(mapRef.current, {
        center: BARUGO_PROPER_COORDS,
        zoom: 17,
        zoomControl: true,
        attributionControl: false,
      });

      // Crystal-clear high-res Google Maps Satellite + Streets Hybrid
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        maxNativeZoom: 20,
        subdomains: ['0', '1', '2', '3'],
      }).addTo(map);

      // Custom marker icon with white border & shadow for clear visibility on satellite terrain
      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: '<div style="color: #EA580C; font-size: 2.2rem; transform: translateY(-70%); filter: drop-shadow(0 3px 6px rgba(0,0,0,0.75)); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-location-dot" style="-webkit-text-stroke: 1.5px #FFFFFF;"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      // Helper: handle marker dragend reverse geocode
      const onMarkerDrag = (e) => {
        const pos = e.target.getLatLng();
        setDeliveryLocation({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      };

      // Auto-place initial pin at Barugo Proper
      const defaultMarker = L.marker(BARUGO_PROPER_COORDS, { icon, draggable: true }).addTo(map);
      markerRef.current = defaultMarker;
      setDeliveryLocation({ lat: BARUGO_PROPER_COORDS[0], lng: BARUGO_PROPER_COORDS[1] });
      if (!deliveryAddress) {
        setDeliveryAddress('Poblacion, Barugo, Leyte');
      }

      defaultMarker.on('dragend', onMarkerDrag);

      mapInstanceRef.current = map;

      // Store L and icon on the map ref for reuse in click/location handlers
      map._leafletLib = L;
      map._pinIcon = icon;
      map._onMarkerDrag = onMarkerDrag;

      // Ensure proper size calculation — multiple attempts for CSS transition delays
      const refreshSize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      setTimeout(refreshSize, 150);
      setTimeout(refreshSize, 400);
      setTimeout(refreshSize, 800);

      // Click anywhere to place / move pin
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        placePinAt(lat, lng);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType]);

  const [locating, setLocating] = useState(false);
  const [locateStatus, setLocateStatus] = useState('');

  // Reverse geocode helper
  const reverseGeocode = (lat, lng) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(d => {
        if (d.display_name) {
          setDeliveryAddress(d.display_name.split(',').slice(0, 3).join(',').trim());
        }
      })
      .catch(() => {});
  };

  const placePinAt = (lat, lng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const L = map._leafletLib;
    const icon = map._pinIcon;
    const onMarkerDrag = map._onMarkerDrag;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (L && icon) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      if (onMarkerDrag) {
        markerRef.current.on('dragend', onMarkerDrag);
      }
    }
    setDeliveryLocation({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateStatus('Pin on map');
      setError('Hindi supported ang automatic GPS sa browser na ito. Pindutin o i-drag lang ang pin sa mapa.');
      setTimeout(() => setLocateStatus(''), 4000);
      return;
    }

    setLocating(true);
    setLocateStatus('Locating...');
    setError('');

    let hasApplied = false;

    const applyLocation = (lat, lng, isFinal = true) => {
      hasApplied = true;
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([lat, lng], 17, { animate: true });
        // Refresh map size after panning
        setTimeout(() => map.invalidateSize(), 200);
      }
      placePinAt(lat, lng);
      if (isFinal) {
        setLocating(false);
        setLocateStatus('Location found! ✓');
        setTimeout(() => setLocateStatus(''), 2500);
      }
    };

    // Step 1: Instant Low-Accuracy / WiFi / Cell / Cached GPS (<1s response on mobile phones)
    navigator.geolocation.getCurrentPosition(
      (fastPos) => {
        applyLocation(fastPos.coords.latitude, fastPos.coords.longitude, false);

        // Step 2: Background High Accuracy GPS refinement (if outdoors / satellite available)
        navigator.geolocation.getCurrentPosition(
          (precisePos) => {
            applyLocation(precisePos.coords.latitude, precisePos.coords.longitude, true);
          },
          () => {
            // Already applied fast position successfully
            setLocating(false);
            setLocateStatus('Location found! ✓');
            setTimeout(() => setLocateStatus(''), 2500);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocating(false);
          setLocateStatus('Permission blocked');
          setError('Naka-block ang Location sa browser. Pindutin lang ang mapa o i-drag ang pin patungo sa iyong bahay.');
          setTimeout(() => setLocateStatus(''), 4000);
          return;
        }

        // Step 3: Generous fallback if first instant attempt missed
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            applyLocation(fallbackPos.coords.latitude, fallbackPos.coords.longitude, true);
          },
          () => {
            setLocating(false);
            setLocateStatus('Pin on map');
            setError('Hindi ma-detect ang GPS. Paki-tap o i-drag ang pin sa satellite map papunta sa iyong address.');
            setTimeout(() => setLocateStatus(''), 4000);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checkoutCart.length === 0) return;
    if (orderType === 'delivery' && !deliveryLocation) {
      setError('Please pin your delivery location on the map.');
      return;
    }
    setSubmitting(true);
    setError('');

    const deliveryFee = orderType === 'delivery' ? (settings.delivery_fee || DELIVERY_FEE) : 0;
    const totalAmount = subtotal + deliveryFee;
    let referenceCode = '';

    try {
      referenceCode = await generateOrderReference();
    } catch {
      referenceCode = `M&M-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Build combined notes with FB profile
    const customerNotes = formData.facebookName
      ? `[FB Profile: ${formData.facebookName}] ${formData.notes || ''}`.trim()
      : (formData.notes || '');

    // Format all items with their options and pricing
    const formattedOrderItems = checkoutCart.map((item, idx) => {
      const itemUnitPrice = parseFloat(item.unitPrice) || 0;
      const itemLinePrice = itemUnitPrice * (item.quantity || 1);
      return {
        id: `item-${idx}-${Date.now()}`,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: itemUnitPrice,
        total_price: itemLinePrice,
        order_item_options: (item.options || []).map((o) => ({
          option_name: o.optionName,
          option_value: o.optionValue,
          additional_cost: o.additionalCost || 0,
        })),
      };
    });

    // Save into local mock order layer so all items are instantly viewable on confirmation & track
    addMockOrder({
      reference_code: referenceCode,
      customer_name: formData.name,
      customer_phone: formData.phone,
      order_type: orderType,
      status: 'pending',
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      notes: customerNotes,
      preferred_date: formData.preferredDate || null,
      order_items: formattedOrderItems,
      delivery_location: deliveryLocation ? {
        latitude: deliveryLocation.lat,
        longitude: deliveryLocation.lng,
        address: deliveryAddress,
        landmark_notes: customerNotes,
      } : null,
    });

    // Store in localStorage
    try {
      const orderPayload = {
        referenceCode,
        customerName: formData.name,
        customerPhone: formData.phone,
        facebookName: formData.facebookName,
        orderType,
        subtotal,
        deliveryFee,
        totalAmount,
        notes: customerNotes,
        preferredDate: formData.preferredDate,
        items: checkoutCart,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`likha_last_order_${referenceCode}`, JSON.stringify(orderPayload));

      const existingOrders = JSON.parse(localStorage.getItem('likha_my_orders') || '[]');
      const updatedOrders = [
        {
          referenceCode,
          customerName: formData.name,
          orderType,
          totalAmount,
          itemsSummary: checkoutCart.map(i => `${i.productName} ×${i.quantity}`).join(', '),
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        },
        ...existingOrders.filter(o => o.referenceCode !== referenceCode),
      ];
      localStorage.setItem('likha_my_orders', JSON.stringify(updatedOrders.slice(0, 15)));

      // Save full admin-compatible order object for admin panel
      const fullAdminOrder = {
        id: `ord-${Date.now()}`,
        reference_code: referenceCode,
        customer_name: formData.name,
        customer_phone: formData.phone,
        facebook_name: formData.facebookName || '',
        order_type: orderType,
        status: 'confirmed',
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        total_cost: checkoutCart.reduce((s, i) => s + (((parseFloat(i.unitPrice) || 0) * 0.4) * (i.quantity || 1)), 0),
        preferred_date: formData.preferredDate || null,
        notes: customerNotes || '',
        created_at: new Date().toISOString(),
        order_items: formattedOrderItems.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          unit_cost: item.unit_price * 0.4,
          total_cost: item.total_price * 0.4,
          options: (checkoutCart[idx]?.options || []).map(opt => ({
            option_name: opt.optionName,
            option_value: opt.optionValue,
            additional_cost: opt.additionalCost || 0,
          })),
        })),
        delivery_location: deliveryLocation ? {
          latitude: deliveryLocation.lat,
          longitude: deliveryLocation.lng,
          address: deliveryAddress,
          landmark_notes: customerNotes,
        } : null,
      };

      const existingAdminOrders = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const updatedAdminOrders = [
        fullAdminOrder,
        ...existingAdminOrders.filter(o => o.reference_code !== referenceCode),
      ];
      localStorage.setItem('likha_admin_orders', JSON.stringify(updatedAdminOrders));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('likha_order_placed', { detail: fullAdminOrder }));
      }
    } catch {}

    // Insert into Supabase if connected
    try {
      const supabase = createClient();
      if (supabase) {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            reference_code: referenceCode,
            customer_name: formData.name,
            customer_phone: formData.phone,
            order_type: orderType,
            status: 'pending',
            subtotal,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            notes: customerNotes,
            preferred_date: formData.preferredDate || null,
          })
          .select()
          .single();

        if (!orderErr && order) {
          const dbOrderItems = formattedOrderItems.map((item) => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            unit_cost: 0,
            total_cost: 0,
          }));

          const { data: insertedItems } = await supabase
            .from('order_items')
            .insert(dbOrderItems)
            .select();

          if (insertedItems) {
            const allOptions = [];
            checkoutCart.forEach((cartItem, idx) => {
              if (cartItem.options?.length && insertedItems[idx]) {
                cartItem.options.forEach((opt) => {
                  allOptions.push({
                    order_item_id: insertedItems[idx].id,
                    option_name: opt.optionName,
                    option_value: opt.optionValue,
                    additional_cost: opt.additionalCost || 0,
                  });
                });
              }
            });

            if (allOptions.length > 0) {
              await supabase.from('order_item_options').insert(allOptions);
            }
          }

          if (orderType === 'delivery' && deliveryLocation) {
            await supabase.from('delivery_locations').insert({
              order_id: order.id,
              latitude: deliveryLocation.lat,
              longitude: deliveryLocation.lng,
              address: deliveryAddress,
              landmark_notes: customerNotes,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Database insert note:', err);
    }

    // Remove only checked out items from cart
    checkoutCart.forEach((item) => removeItem(item.cartItemId));
    try {
      localStorage.removeItem('likha_checkout_items');
    } catch {}

    router.push(`/confirmation/${referenceCode}`);
  };

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/cart" className="top-bar-action" aria-label="Back to cart">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, margin: 0 }}>Checkout</span>
        <div style={{ width: 40 }} />
      </header>

      <main className="page-content page-enter">
        <form onSubmit={handleSubmit} style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* Customer Details */}
          <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
            <h2 className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
              Customer Details
            </h2>
            <div className="input-group">
              <label className="input-label" htmlFor="name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="Halimbawa: Maria Clara Santos"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Fulfillment Method */}
          <div className="section">
            <h2 className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
              Fulfillment Method
            </h2>
            <div className="fulfillment-toggle" role="radiogroup" aria-label="Order type">
              <button
                type="button"
                className={`fulfillment-option${orderType === 'delivery' ? ' selected' : ''}`}
                onClick={() => setOrderType('delivery')}
                role="radio"
                aria-checked={orderType === 'delivery'}
                id="fulfillment-delivery"
              >
                <span className="fulfillment-option-icon">
                  <i className="fa-solid fa-truck"></i>
                </span>
                <span className="fulfillment-option-label">Delivery</span>
              </button>
              <button
                type="button"
                className={`fulfillment-option${orderType === 'pickup' ? ' selected' : ''}`}
                onClick={() => setOrderType('pickup')}
                role="radio"
                aria-checked={orderType === 'pickup'}
                id="fulfillment-pickup"
              >
                <span className="fulfillment-option-icon">
                  <i className="fa-solid fa-store"></i>
                </span>
                <span className="fulfillment-option-label">Pickup</span>
              </button>
            </div>

            {/* Delivery Details */}
            {orderType === 'delivery' && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <label className="input-label" style={{ margin: 0 }}>
                    Pin Location <span className="required">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="btn btn-ghost btn-sm"
                    id="use-location-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--color-primary)',
                      fontSize: '12px',
                      padding: '2px 8px',
                    }}
                  >
                    <i className={locating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'}></i>
                    <span>{locating ? 'Locating...' : locateStatus || 'Use My Location'}</span>
                  </button>
                </div>

                <div
                  ref={mapRef}
                  className="map-container"
                  style={{
                    height: '220px',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    border: '1.5px solid var(--color-border)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    marginBottom: 'var(--space-3)',
                    zIndex: 1,
                  }}
                />

                <div className="input-group">
                  <label className="input-label" htmlFor="landmark">
                    Complete Address / Landmark <span className="required">*</span>
                  </label>
                  <input
                    id="landmark"
                    className="input"
                    type="text"
                    placeholder="House/Unit No., Street, Barangay, or nearby Landmark"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required={orderType === 'delivery'}
                  />
                </div>
              </div>
            )}

            {/* Pickup Details */}
            {orderType === 'pickup' && (
              <div style={{
                background: 'var(--color-surface-warm)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4)',
                marginTop: 'var(--space-3)',
                border: '1px solid var(--color-border-light)',
              }}>
                <p style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-store" style={{ color: 'var(--color-primary)' }}></i>
                  <span>Store Pickup Location</span>
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
                  {settings.pickup_address || 'M&M Artsy Studio, Busay, Barugo, Leyte (Exact pickup schedule will be sent on Messenger)'}
                </p>
                {settings.pickup_notes && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', margin: 0 }}>
                    {settings.pickup_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Optional Notes */}
          <div className="section">
            <div className="input-group">
              <label className="input-label" htmlFor="notes">
                Special Instructions (optional)
              </label>
              <textarea
                id="notes"
                className="input"
                placeholder="e.g. Please leave with guard, call when nearby, or preferred pickup time..."
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Order Summary */}
          <div className="section">
            <div className="order-summary">
              <h2 className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
                Order Summary
              </h2>
              <div className="order-summary-row">
                <span>Products ({checkoutCart.length} {checkoutCart.length === 1 ? 'item' : 'items'})</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="order-summary-row">
                <span>Fulfillment ({orderType === 'delivery' ? 'Delivery' : 'Pickup'})</span>
                <span>{orderType === 'delivery' ? formatCurrency(settings.delivery_fee || DELIVERY_FEE) : 'Free'}</span>
              </div>
              <div className="order-summary-row total">
                <span>Total Amount</span>
                <span className="amount">
                  {formatCurrency(subtotal + (orderType === 'delivery' ? (settings.delivery_fee || DELIVERY_FEE) : 0))}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              margin: '0 var(--space-4) var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <div style={{ padding: '0 var(--space-4) var(--space-20)' }}>
            <button
              type="submit"
              className="btn btn-primary btn-full ripple"
              disabled={submitting || checkoutCart.length === 0}
              id="submit-order-btn"
              style={{
                height: '46px',
                fontSize: '15px',
                fontWeight: 'var(--weight-bold)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <i className={submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'}></i>
              <span>{submitting ? 'Submitting Order...' : 'Submit Order Request'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

