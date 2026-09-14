'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import CartIconBtn from '@/components/customer/CartIconBtn';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import { useCart } from '@/lib/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatDateShort, formatRelative, formatTime12Hour } from '@/lib/utils/formatDate';
import { MESSENGER_URL } from '@/lib/constants/customPrompts';
import { openExternalSafe, openMessengerDirect } from '@/lib/utils/browserNav';

function getProcessSteps(orderType = 'delivery') {
  const isDelivery = orderType === 'delivery';
  return [
    { key: 'pending', label: 'Submitted' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'crafting', label: 'Crafting' },
    { key: 'ready', label: isDelivery ? 'Delivery' : 'Pickup' },
  ];
}

function getStatusIndex(status) {
  switch (status) {
    case 'pending':
    case 'for_confirmation':
      return 0;
    case 'confirmed':
      return 1;
    case 'preparing':
    case 'crafting':
      return 2;
    case 'ready':
      return 3;
    case 'completed':
      return 3;
    default:
      return 0;
  }
}

function getStatusHero(status, isDelivery) {
  switch (status) {
    case 'pending':
    case 'for_confirmation':
      return {
        badge: 'Submitted',
        badgeClass: 'pending',
        title: 'Order Submitted',
        subtitle: 'Your order has been received and is pending confirmation.',
      };
    case 'confirmed':
      return {
        badge: 'Confirmed',
        badgeClass: 'confirmed',
        title: 'Order Confirmed',
        subtitle: 'Order details verified. Ready for crafting queue.',
      };
    case 'preparing':
    case 'crafting':
      return {
        badge: 'Crafting',
        badgeClass: 'preparing',
        title: 'Crafting in Progress',
        subtitle: 'Artisans are currently creating your handcrafted items.',
      };
    case 'ready':
      return {
        badge: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
        badgeClass: 'ready',
        title: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
        subtitle: isDelivery
          ? 'Your order is packed and dispatched for delivery.'
          : 'Your order is ready for pickup at our Barugo store.',
      };
    case 'completed':
      return {
        badge: 'Completed',
        badgeClass: 'completed',
        title: 'Order Completed',
        subtitle: 'Your order has been fulfilled. Thank you for your support!',
      };
    case 'cancelled':
      return {
        badge: 'Cancelled',
        badgeClass: 'danger',
        title: 'Order Cancelled',
        subtitle: 'This order was cancelled. Please message us on Messenger for inquiries.',
      };
    default:
      return {
        badge: 'Submitted',
        badgeClass: 'pending',
        title: 'Order Submitted',
        subtitle: 'Tracking your order progress.',
      };
  }
}

function TrackContent() {
  const router = useRouter();
  const { addItems } = useCart();
  const searchParams = useSearchParams();
  const [refInput, setRefInput] = useState(searchParams?.get('ref') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);
  const [drawerInput, setDrawerInput] = useState('');
  const drawerInputRef = useRef(null);

  const handleToggleSearchDrawer = () => {
    setShowSearchDrawer((prev) => {
      const next = !prev;
      if (next) {
        setDrawerInput('');
        setTimeout(() => {
          drawerInputRef.current?.focus();
        }, 100);
      }
      return next;
    });
  };

  const handleDrawerSearchSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const clean = drawerInput.trim().toUpperCase();
    if (!clean) return;
    setRefInput(clean);
    handleSearch(clean);
    setShowSearchDrawer(false);
  };

  // Per-item review state
  const [itemRatings, setItemRatings] = useState({});
  const [itemComments, setItemComments] = useState({});
  const [itemReviewed, setItemReviewed] = useState({});
  const [itemSubmitting, setItemSubmitting] = useState({});

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = order?.reference_code
        ? `Track Order #${order.reference_code} | M&M's Artsy`
        : "Track Order | M&M's Artsy";
    }
  }, [order?.reference_code]);

  const handleOrderAgain = () => {
    if (!order?.order_items?.length) return;
    setReordering(true);

    try {
      const itemsToAdd = order.order_items.map((item, idx) => {
        const itemUnitPrice = parseFloat(item.unit_price) || (parseFloat(item.total_price) / (item.quantity || 1)) || 250;

        return {
          productId: item.product_id || `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          productSlug: item.product_slug || 'handmade-piece',
          productName: item.product_name || 'Handmade Piece',
          photo: item.photo || item.product_photo || '/images/categories/flower-bouquets.png',
          basePrice: itemUnitPrice,
          unitPrice: itemUnitPrice,
          quantity: item.quantity || 1,
          options: (item.order_item_options || []).map((o) => {
            const parts = (o.option_value || '').split(':');
            return {
              optionName: o.option_name || parts[0]?.trim() || 'Choice',
              optionValue: parts[1]?.trim() || parts[0]?.trim() || o.option_value || '',
              additionalCost: parseFloat(o.additional_cost) || 0,
            };
          }),
        };
      });

      addItems(itemsToAdd);
      router.push('/cart');
    } catch (e) {
      setReordering(false);
      router.push('/shop');
    }
  };

  const handleCopyRef = async (text) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined' && document.body) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        if (textarea.parentNode === document.body) {
          document.body.removeChild(textarea);
        }
      }
      setCopiedRef(true);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('likha_toast', {
              detail: {
                type: 'success',
                title: 'Copied to Clipboard! 📋',
                message: text,
                duration: 2500,
              },
            })
          );
        } catch {}
      }
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {}
  };

  const handleSearch = async (ref) => {
    const lookupRef = (ref || refInput).trim().toUpperCase();
    if (!lookupRef) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setCopiedRef(false);

    let foundOrder = null;

    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error: err } = await supabase
          .from('orders')
          .select(`
            reference_code, customer_name, status, order_type,
            total_amount, subtotal, delivery_fee, preferred_date, created_at,
            delivery_address, landmark,
            order_items(product_name, quantity, total_price,
              order_item_options(option_value)
            )
          `)
          .eq('reference_code', lookupRef)
          .single();

        if (!err && data) {
          foundOrder = data;
        } else {
          // Check custom_requests table
          const { data: crData } = await supabase
            .from('custom_requests')
            .select('*')
            .eq('reference_code', lookupRef)
            .single();

          if (crData) {
            foundOrder = {
              isCustomRequest: true,
              reference_code: crData.reference_code,
              customer_name: crData.customer_name,
              status: crData.status === 'pending' ? 'pending' : crData.status === 'quoted' ? 'confirmed' : crData.status,
              order_type: 'custom_order',
              total_amount: parseFloat(crData.quoted_price || crData.budget || 0),
              preferred_date: crData.preferred_date,
              created_at: crData.created_at,
              order_items: [{
                product_name: `Custom Request: ${crData.description?.slice(0, 50) || 'Custom Piece'}`,
                quantity: crData.quantity || 1,
                total_price: parseFloat(crData.quoted_price || crData.budget || 0),
                order_item_options: crData.preferred_color ? [{ option_value: `Color: ${crData.preferred_color}` }] : [],
              }],
            };
          }
        }
      }
    } catch (e) {
      // Supabase fallback
    }

    if (!foundOrder) {
      try {
        const mockOrders = JSON.parse(localStorage.getItem('likha_mock_orders') || '[]');
        const match = mockOrders.find((o) => {
          const oRef = (o.reference_code || o.referenceCode || '').toUpperCase();
          return (
            oRef === lookupRef ||
            oRef.replace(/^LK-/, 'M&M-') === lookupRef ||
            oRef.replace(/^M&M-/, 'LK-') === lookupRef
          );
        });
        if (match) {
          foundOrder = {
            reference_code: match.reference_code || match.referenceCode,
            customer_name: match.customer_name || match.customerName || 'Customer',
            status: match.status || 'pending',
            order_type: match.order_type || match.orderType || 'delivery',
            total_amount: parseFloat(match.total_amount || match.totalAmount) || 0,
            subtotal: parseFloat(match.subtotal) || 0,
            delivery_fee: parseFloat(match.delivery_fee || match.deliveryFee) || 0,
            preferred_date: match.preferred_date || match.preferredDate || null,
            preferred_time: match.preferred_time || match.preferredTime || null,
            created_at: match.created_at || match.createdAt || new Date().toISOString(),
            delivery_address: match.delivery_address || match.deliveryAddress || null,
            landmark: match.landmark || null,
            order_items: (match.order_items || match.items || []).map((i) => ({
              product_name: i.product_name || i.productName,
              quantity: i.quantity || 1,
              total_price: parseFloat(i.total_price || i.unitPrice || 0) * (i.quantity || 1),
              order_item_options: (i.order_item_options || i.options || []).map((o) => ({
                option_value: o.option_value || (o.optionName ? `${o.optionName}: ${o.optionValue}` : ''),
              })),
            })),
          };
        }
      } catch {}
    }

    if (!foundOrder) {
      try {
        const localAdminOrders = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        const match = localAdminOrders.find((o) => {
          const oRef = o.reference_code?.toUpperCase() || '';
          return (
            oRef === lookupRef ||
            oRef.replace(/^LK-/, 'M&M-') === lookupRef ||
            oRef.replace(/^M&M-/, 'LK-') === lookupRef
          );
        });
        if (match) {
          foundOrder = match;
        }
      } catch {}
    }

    if (!foundOrder) {
      try {
        let localRaw = localStorage.getItem(`likha_last_order_${lookupRef}`);
        if (!localRaw) {
          // Check all last orders in localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('likha_last_order_')) {
              const val = localStorage.getItem(k);
              if (val) {
                const p = JSON.parse(val);
                if ((p.referenceCode || '').toUpperCase() === lookupRef || (p.reference_code || '').toUpperCase() === lookupRef) {
                  localRaw = val;
                  break;
                }
              }
            }
          }
        }
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          foundOrder = {
            reference_code: parsed.referenceCode || parsed.reference_code || lookupRef,
            customer_name: parsed.customerName || parsed.customer_name || 'Customer',
            status: parsed.status || 'pending',
            order_type: parsed.orderType || parsed.order_type || 'delivery',
            total_amount: parsed.totalAmount || parsed.total_amount || 0,
            subtotal: parsed.subtotal || 0,
            delivery_fee: parsed.deliveryFee || parsed.delivery_fee || 0,
            voucher_discount: parsed.voucherDiscount || parsed.voucher_discount || 0,
            applied_voucher_code: parsed.appliedVoucherCode || null,
            preferred_date: parsed.preferredDate || parsed.preferred_date || null,
            preferred_time: parsed.preferredTime || parsed.preferred_time || null,
            created_at: parsed.createdAt || parsed.created_at || new Date().toISOString(),
            delivery_address: parsed.deliveryAddress || parsed.address || null,
            landmark: parsed.landmark || null,
            order_items: (parsed.items || parsed.order_items || []).map((i) => ({
              product_name: i.productName || i.product_name,
              quantity: i.quantity || 1,
              total_price: ((parseFloat(i.unitPrice || i.unit_price) || 0) + ((i.options || i.order_item_options || []).reduce((s, o) => s + (parseFloat(o.additionalCost || o.additional_cost) || 0), 0))) * (i.quantity || 1),
              order_item_options: (i.options || i.order_item_options || []).map((o) => ({
                option_value: o.option_value || (o.optionName ? `${o.optionName}: ${o.optionValue}` : ''),
              })),
            })),
          };
        }
      } catch {}
    }

    if (!foundOrder) {
      try {
        const myOrders = JSON.parse(localStorage.getItem('likha_my_orders') || '[]');
        const match = myOrders.find((o) => (o.referenceCode || o.reference_code)?.toUpperCase() === lookupRef);
        if (match) {
          foundOrder = {
            reference_code: match.referenceCode || match.reference_code,
            customer_name: match.customerName || match.customer_name || 'Customer',
            status: match.status || 'pending',
            order_type: match.orderType || match.order_type || 'delivery',
            total_amount: match.totalAmount || match.total_amount || 0,
            created_at: match.createdAt || match.created_at || new Date().toISOString(),
            order_items: [{
              product_name: match.itemsSummary || 'Handcrafted Item',
              quantity: 1,
              total_price: match.totalAmount || match.total_amount || 0,
            }],
          };
        }
      } catch {}
    }

    if (!foundOrder) {
      setError('Order not found. Check your reference code.');
    } else {
      setOrder(foundOrder);
      // Auto-save to my orders list
      try {
        const existing = JSON.parse(localStorage.getItem('likha_my_orders') || '[]');
        const itemsText = (foundOrder.order_items || []).map(i => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') || 'Handmade Flower Piece';
        const updated = [
          {
            referenceCode: foundOrder.reference_code,
            customerName: foundOrder.customer_name || 'Customer',
            orderType: foundOrder.order_type || 'delivery',
            totalAmount: foundOrder.total_amount || 0,
            itemsSummary: itemsText,
            createdAt: foundOrder.created_at || new Date().toISOString(),
            status: foundOrder.status || 'pending',
          },
          ...existing.filter(o => o.referenceCode !== foundOrder.reference_code)
        ].slice(0, 15);
        localStorage.setItem('likha_my_orders', JSON.stringify(updated));
        setSavedHistory(updated);
      } catch {}
    }
    setLoading(false);
  };

  const [savedHistory, setSavedHistory] = useState([]);
  const [visiblePastCount, setVisiblePastCount] = useState(3);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('likha_my_orders') || '[]');
      if (Array.isArray(stored)) {
        setSavedHistory(stored);
      }
    } catch {}
  }, []);

  // Auto-search if ref is in URL
  useEffect(() => {
    let ref = searchParams?.get('ref');
    if (typeof window !== 'undefined') {
      const fullSearch = window.location.search;
      if (fullSearch) {
        if (fullSearch.includes('ref=M&M-')) {
          const mmMatch = fullSearch.match(/ref=(M&M-[^&#]+)/i);
          if (mmMatch && mmMatch[1]) {
            ref = mmMatch[1];
          }
        } else {
          const match = fullSearch.match(/[?&]ref=([^&#]+)/i);
          if (match && match[1]) {
            try {
              ref = decodeURIComponent(match[1]);
            } catch {
              ref = match[1];
            }
          }
        }
      }
    }
    if (ref) {
      setRefInput(ref);
      handleSearch(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load saved reviews for active order to prevent repeated ratings
  useEffect(() => {
    if (!order?.reference_code || !order?.order_items?.length) return;
    try {
      const savedReviews = JSON.parse(localStorage.getItem('likha_submitted_reviews') || '{}');
      const ratings = {};
      const comments = {};
      const reviewed = {};

      order.order_items.forEach((_, idx) => {
        const key = `${order.reference_code}_${idx}`;
        if (savedReviews[key]) {
          reviewed[idx] = true;
          ratings[idx] = savedReviews[key].rating || 5;
          comments[idx] = savedReviews[key].comment || '';
        }
      });

      setItemReviewed((prev) => ({ ...prev, ...reviewed }));
      setItemRatings((prev) => ({ ...prev, ...ratings }));
      setItemComments((prev) => ({ ...prev, ...comments }));
    } catch {}
  }, [order]);

  const handleReviewSubmit = async (itemIndex, item, commentText = '') => {
    const rating = itemRatings[itemIndex] || 5;
    setItemRatings((prev) => ({ ...prev, [itemIndex]: rating }));
    setItemSubmitting((prev) => ({ ...prev, [itemIndex]: true }));

    const cleanComment = (commentText || '').trim();

    // Permanently save to localStorage so the user can never re-rate or duplicate reviews
    try {
      const savedReviews = JSON.parse(localStorage.getItem('likha_submitted_reviews') || '{}');
      const key = `${order.reference_code}_${itemIndex}`;
      savedReviews[key] = {
        rating,
        comment: cleanComment,
        date: new Date().toISOString(),
      };
      localStorage.setItem('likha_submitted_reviews', JSON.stringify(savedReviews));
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        const productId = item?.product_id;
        if (productId) {
          await supabase.from('product_reviews').insert([
            {
              product_id: productId,
              customer_name: order?.customer_name || 'Verified Customer',
              rating,
              comment: cleanComment || 'Verified buyer review',
              is_verified_buyer: true,
              is_approved: true,
            }
          ]);
        }
      }
    } catch {}

    setItemSubmitting((prev) => ({ ...prev, [itemIndex]: false }));
    setItemReviewed((prev) => ({ ...prev, [itemIndex]: true }));
  };

  const handleManualSearch = (e) => {
    if (e?.preventDefault) e.preventDefault();
    handleSearch();
  };

  const isCancelled = order?.status === 'cancelled';
  const isCompleted = order?.status === 'completed';
  const isDelivery = (order?.order_type || 'delivery') === 'delivery';
  const processSteps = getProcessSteps(order?.order_type || 'delivery');
  const currentStatusIdx = order ? getStatusIndex(order.status) : -1;
  const heroInfo = order ? getStatusHero(order.status, isDelivery) : null;

  return (
    <div className="customer-shell">
      {/* Top Header */}
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link">Collection</Link>
          <Link href="/track" className="top-bar-link active">Track Order</Link>
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="content-area" style={{ maxWidth: '540px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
        {/* Search / Track Input Bar (ONLY when NO order is currently being viewed) */}
        {!order && (
          <div
            style={{
              minHeight: savedHistory.length === 0 ? 'calc(65vh - 70px)' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: savedHistory.length === 0 ? 'center' : 'flex-start',
              paddingTop: savedHistory.length === 0 ? '0' : 'var(--space-3)',
            }}
          >
            <div className="section" style={{ paddingBottom: savedHistory.length > 0 ? 'var(--space-2)' : '0' }}>
              <div className="card" style={{ padding: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. M&M-260909-001"
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: refInput ? 'monospace' : 'inherit',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      textTransform: 'uppercase',
                      height: '42px',
                      minHeight: '42px',
                      letterSpacing: refInput ? '0.04em' : 'normal',
                      padding: '0 14px',
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-press"
                    disabled={loading || !refInput.trim()}
                    style={{
                      padding: '0 18px',
                      height: '42px',
                      minHeight: '42px',
                      fontSize: '13px',
                      fontWeight: '700',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {loading ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <span>Track</span>
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <div style={{ marginTop: '12px', padding: '9px 12px', background: 'var(--color-danger-bg, #FEF2F2)', border: '1px solid var(--color-danger-border, #FCA5A5)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* If no order is currently selected: Show Order History */}
        {!order && (
          <div className="section" style={{ paddingTop: '0' }}>
            {(() => {
              const myOrders = savedHistory || [];
              if (myOrders.length === 0) return null;

              const activeList = myOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
              const pastList = myOrders.filter(o => o.status === 'completed' || o.status === 'cancelled');

              return (
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-primary)', fontSize: '13px' }}></i>
                      <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                        My Order History
                      </h2>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      {myOrders.length} {myOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 1. Active / Ongoing Orders at TOP */}
                    {activeList.map((item, idx) => (
                      <div
                        key={`active-${idx}`}
                        onClick={() => {
                          setRefInput(item.referenceCode);
                          handleSearch(item.referenceCode);
                        }}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1.5px solid var(--color-primary-light, #E2D9D2)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', color: 'var(--color-primary)' }}>
                            {item.referenceCode}
                          </span>
                          <span className={`badge badge-${item.status === 'ready' ? 'ready' : item.status === 'crafting' ? 'preparing' : 'pending'}`} style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'capitalize' }}>
                            {item.status === 'ready' ? (item.orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup') : item.status === 'crafting' ? 'Crafting' : item.status === 'confirmed' ? 'Confirmed' : 'Submitted'}
                          </span>
                        </div>

                        {item.itemsSummary && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                            fontWeight: '500',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {item.itemsSummary}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          <span>{item.orderType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'} · {formatDate(item.createdAt) || 'Recent'}</span>
                          <span style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '12.5px' }}>{formatCurrency(item.totalAmount)}</span>
                        </div>
                      </div>
                    ))}

                    {/* 2. Past / Completed Orders at BOTTOM */}
                    {pastList.length > 0 && (
                      <div style={{ marginTop: activeList.length > 0 ? '8px' : '0' }}>
                        {activeList.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                              Completed Orders
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-border-light)' }}></div>
                          </div>
                        )}

                        {pastList.slice(0, visiblePastCount).map((item, idx) => (
                          <div
                            key={`past-${idx}`}
                            onClick={() => {
                              setRefInput(item.referenceCode);
                              handleSearch(item.referenceCode);
                            }}
                            style={{
                              background: 'var(--color-surface-warm, #FAF8F5)',
                              border: '1px solid var(--color-border-light)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '10px 14px',
                              cursor: 'pointer',
                              opacity: 0.9,
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                              marginBottom: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                {item.referenceCode}
                              </span>
                              <span className="badge badge-completed" style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px' }}>
                                ✓ Completed
                              </span>
                            </div>

                            {item.itemsSummary && (
                              <p style={{
                                fontSize: '11.5px',
                                color: 'var(--color-text-muted)',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {item.itemsSummary}
                              </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              <span>{formatDate(item.createdAt) || 'Past Order'}</span>
                              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>{formatCurrency(item.totalAmount)}</span>
                            </div>
                          </div>
                        ))}

                        {pastList.length > 3 && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setVisiblePastCount(prev => prev >= pastList.length ? 3 : prev + 5)}
                              style={{
                                padding: '6px 16px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                borderRadius: '999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{visiblePastCount >= pastList.length ? 'Show Less' : `Show More Orders (+${pastList.length - visiblePastCount})`}</span>
                              <i className={`fa-solid ${visiblePastCount >= pastList.length ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '10px' }}></i>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Order Details & Stepper (When an order is being viewed) */}
        {order && (
          <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
            {/* Top Navigation Bar: Back Button & Smooth Search Another Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
              <button
                type="button"
                className="btn-press"
                onClick={() => {
                  setOrder(null);
                  setRefInput('');
                  setShowSearchDrawer(false);
                }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.18s ease',
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ color: 'var(--color-primary)', fontSize: '11px' }}></i>
                <span>All Orders</span>
              </button>

              <button
                type="button"
                className="btn-press"
                onClick={handleToggleSearchDrawer}
                style={{
                  background: showSearchDrawer ? 'var(--color-primary)' : 'var(--color-surface)',
                  border: `1.5px solid ${showSearchDrawer ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: showSearchDrawer ? '#ffffff' : 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: showSearchDrawer ? '0 3px 10px rgba(160, 82, 45, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: showSearchDrawer ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <i
                  className={`fa-solid ${showSearchDrawer ? 'fa-xmark' : 'fa-magnifying-glass'}`}
                  style={{
                    fontSize: '11px',
                    transition: 'transform 0.22s ease',
                    transform: showSearchDrawer ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                ></i>
                <span>{showSearchDrawer ? 'Close Search' : 'Search Another'}</span>
              </button>
            </div>

            {/* Smooth Expanding Inline Search Drawer */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: showSearchDrawer ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, margin-bottom 0.3s ease',
                opacity: showSearchDrawer ? 1 : 0,
                marginBottom: showSearchDrawer ? '14px' : '0',
                overflow: 'hidden',
                pointerEvents: showSearchDrawer ? 'auto' : 'none',
              }}
            >
              <div style={{ minHeight: 0, paddingBottom: '2px' }}>
                <div
                  style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-primary)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 14px',
                    boxShadow: '0 8px 24px rgba(160, 82, 45, 0.08)',
                    transform: showSearchDrawer ? 'translateY(0)' : 'translateY(-6px)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <form onSubmit={handleDrawerSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                      <i
                        className="fa-solid fa-magnifying-glass"
                        style={{
                          position: 'absolute',
                          left: '12px',
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                          pointerEvents: 'none',
                        }}
                      ></i>
                      <input
                        ref={drawerInputRef}
                        type="text"
                        className="input"
                        placeholder="e.g. M&M-260909-001"
                        value={drawerInput}
                        onChange={(e) => setDrawerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowSearchDrawer(false);
                          }
                        }}
                        style={{
                          width: '100%',
                          fontFamily: drawerInput ? 'monospace' : 'inherit',
                          fontWeight: '700',
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          height: '40px',
                          minHeight: '40px',
                          padding: '0 32px 0 32px',
                          letterSpacing: drawerInput ? '0.04em' : 'normal',
                        }}
                      />
                      {drawerInput.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDrawerInput('');
                            drawerInputRef.current?.focus();
                          }}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                          }}
                          aria-label="Clear input"
                        >
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !drawerInput.trim()}
                      style={{
                        padding: '0 16px',
                        height: '40px',
                        minHeight: '40px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        flexShrink: 0,
                        borderRadius: 'var(--radius-md)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {loading ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <>
                          <span>Track</span>
                          <i className="fa-solid fa-arrow-right" style={{ fontSize: '10.5px' }}></i>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Quick recent orders chips if available */}
                  {(() => {
                    const otherOrders = (savedHistory || []).filter(
                      (o) => o.referenceCode && o.referenceCode.toUpperCase() !== order?.reference_code?.toUpperCase()
                    );
                    if (otherOrders.length === 0) return null;

                    return (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--color-border-light)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Recent:</span>
                        {otherOrders.slice(0, 3).map((hist, hIdx) => (
                          <button
                            key={`drawer-rec-${hIdx}`}
                            type="button"
                            className="btn-press"
                            onClick={() => {
                              setRefInput(hist.referenceCode);
                              handleSearch(hist.referenceCode);
                              setShowSearchDrawer(false);
                            }}
                            style={{
                              background: 'var(--color-surface-warm, #FAF8F5)',
                              border: '1px solid var(--color-border-light)',
                              borderRadius: 'var(--radius-full)',
                              padding: '3px 9px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '9px', opacity: 0.7 }}></i>
                            <span>{hist.referenceCode}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Unified Master Status & Progress Card */}
            {!isCancelled ? (
              <div className="card" style={{ marginBottom: 'var(--space-3)', background: 'var(--color-surface)', padding: '16px' }}>
                {/* Header: Title on Left, Reference Code on Right */}
                <div style={{ marginBottom: isCompleted ? '12px' : '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                      {heroInfo?.title}
                    </h2>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      color: 'var(--color-primary)',
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}>
                      {order.reference_code}
                    </span>
                  </div>
                </div>

                {/* Compact Horizontal Stepper (4 steps) */}
                {!isCompleted && (
                  <div style={{ marginBottom: '18px', padding: '8px 4px 4px' }}>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Connecting Background Line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '13px',
                          left: '12.5%',
                          right: '12.5%',
                          height: '3px',
                          background: 'var(--color-border-light)',
                          borderRadius: '999px',
                          zIndex: 0,
                        }}
                      />
                      {/* Connecting Active Fill Line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '13px',
                          left: '12.5%',
                          width: `${(Math.min(3, Math.max(0, currentStatusIdx)) / 3) * 75}%`,
                          height: '3px',
                          background: 'var(--color-primary)',
                          borderRadius: '999px',
                          zIndex: 0,
                          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      />

                      {/* 4 Process Step Points */}
                      {processSteps.map((step, idx) => {
                        const isStepCompleted = idx < currentStatusIdx;
                        const isCurrent = idx === currentStatusIdx;

                        return (
                          <div
                            key={step.key}
                            style={{
                              position: 'relative',
                              zIndex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: '25%',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: isStepCompleted || isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                                border: `2px solid ${isStepCompleted || isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                color: isStepCompleted || isCurrent ? '#fff' : 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10.5px',
                                fontWeight: '800',
                                boxShadow: isCurrent ? '0 0 0 3.5px rgba(160, 82, 45, 0.18)' : 'none',
                                transition: 'all 0.2s ease',
                                marginBottom: '6px',
                              }}
                            >
                              {isStepCompleted ? (
                                <i className="fa-solid fa-check" style={{ fontSize: '10px' }}></i>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: isCurrent ? '800' : isStepCompleted ? '700' : '500',
                                color: isCurrent ? 'var(--color-primary)' : isStepCompleted ? 'var(--color-text)' : 'var(--color-text-muted)',
                                lineHeight: 1.2,
                              }}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Metadata Box */}
                <div
                  style={{
                    background: 'var(--color-surface-warm, #FAF8F5)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '1px' }}>Customer</span>
                      <span
                        style={{
                          fontWeight: '700',
                          color: 'var(--color-text)',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={order.customer_name}
                      >
                        {order.customer_name}
                      </span>
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '1px' }}>Claim Method</span>
                      <span
                        style={{
                          fontWeight: '700',
                          color: 'var(--color-text)',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={isDelivery ? 'Delivery' : 'Pickup'}
                      >
                        {isDelivery ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid var(--color-border-light)', paddingTop: '8px' }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '1px' }}>Placed On</span>
                      <span
                        style={{
                          fontWeight: '600',
                          color: 'var(--color-text)',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={formatDate(order.created_at) || formatRelative(order.created_at)}
                      >
                        {formatDate(order.created_at) || formatRelative(order.created_at)}
                      </span>
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '1px' }}>
                        {(order.target_date || order.preferred_date || order.preferredDate) ? 'Target Schedule' : isDelivery ? 'Delivery Type' : 'Pickup Location'}
                      </span>
                      <span
                        style={{
                          fontWeight: '600',
                          color: 'var(--color-text)',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={
                          (order.target_date || order.preferred_date || order.preferredDate)
                            ? `${formatDateShort(order.target_date || order.preferred_date || order.preferredDate)}${order.preferred_time || order.preferredTime ? ` · ${formatTime12Hour(order.preferred_time || order.preferredTime)}` : ''}`
                            : isDelivery
                            ? 'Standard Delivery'
                            : 'Barugo Store'
                        }
                      >
                        {(order.target_date || order.preferred_date || order.preferredDate)
                          ? `${formatDateShort(order.target_date || order.preferred_date || order.preferredDate)}${order.preferred_time || order.preferredTime ? ` · ${formatTime12Hour(order.preferred_time || order.preferredTime)}` : ''}`
                          : isDelivery
                          ? 'Standard Delivery'
                          : 'Barugo Store'}
                      </span>
                    </div>
                  </div>

                  {order.delivery_address && isDelivery && (
                    <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', display: 'block', marginBottom: '1px' }}>Delivery Address</span>
                      <span
                        style={{
                          fontWeight: '500',
                          color: 'var(--color-text)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.35,
                        }}
                        title={order.delivery_address}
                      >
                        {order.delivery_address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: '2rem', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}></i>
                <p style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-danger)', margin: 0 }}>Order Cancelled</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Reference: <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{order.reference_code}</span>
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  Please contact us via Messenger for any questions.
                </p>
              </div>
            )}

            {/* Card 3: Completed Rating & Feedback (Only when Completed) */}
            {isCompleted && !order.isCustomRequest && order.order_items?.length > 0 && (
              <div className="card" style={{ marginBottom: 'var(--space-3)', background: 'var(--color-surface)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-star" style={{ fontSize: '15px', color: '#F59E0B' }}></i>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                      Rate Your Items
                    </h3>
                  </div>
                  <span className="badge badge-completed" style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px' }}>
                    ✓ Completed
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.order_items.map((item, idx) => {
                    const currentRating = itemRatings[idx] || 5;
                    const isDone = itemReviewed[idx];
                    const isPosting = itemSubmitting[idx];

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--color-surface-warm, #FAF8F5)',
                          border: '1px solid var(--color-border-light)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Top: Product Name + Rating Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isDone ? (itemComments[idx] ? '4px' : '0') : '8px' }}>
                          <span
                            style={{
                              fontWeight: '700',
                              fontSize: '13.5px',
                              color: 'var(--color-text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                              minWidth: 0,
                              paddingRight: '8px',
                            }}
                            title={item.product_name}
                          >
                            {item.product_name}
                          </span>
                          {isDone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <div style={{ color: '#F59E0B', fontSize: '15px', letterSpacing: '1.5px' }}>
                                {'★'.repeat(currentRating)}{'☆'.repeat(5 - currentRating)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600', flexShrink: 0 }}>
                              {currentRating} of 5 Stars
                            </span>
                          )}
                        </div>

                        {/* If already reviewed: Show sleek quote comment if present */}
                        {isDone ? (
                          itemComments[idx] ? (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--color-text-secondary)',
                              fontStyle: 'italic',
                              margin: '4px 0 0',
                              lineHeight: '1.4',
                            }}>
                              &ldquo;{itemComments[idx]}&rdquo;
                            </p>
                          ) : null
                        ) : (
                          <>
                            {/* Interactive Stars for unreviewed item */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#fff',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  border: '1px solid var(--color-border-light)',
                                }}
                              >
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    disabled={isPosting}
                                    onClick={() => setItemRatings((prev) => ({ ...prev, [idx]: star }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '24px',
                                      lineHeight: 1,
                                      color: star <= currentRating ? '#F59E0B' : 'var(--color-border)',
                                      padding: '3px 5px',
                                      transition: 'transform 0.1s ease',
                                      touchAction: 'manipulation',
                                    }}
                                    aria-label={`${star} star`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Tap to rate
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                              <input
                                type="text"
                                className="input"
                                placeholder="Write a note (optional)..."
                                value={itemComments[idx] || ''}
                                onChange={(e) => setItemComments((prev) => ({ ...prev, [idx]: e.target.value }))}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: '12px',
                                  padding: '0 12px',
                                  height: '36px',
                                  minHeight: '36px',
                                  maxHeight: '36px',
                                  background: '#fff',
                                  borderRadius: 'var(--radius-md)',
                                  boxSizing: 'border-box',
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleReviewSubmit(idx, item, itemComments[idx])}
                                disabled={isPosting}
                                style={{
                                  padding: '0 16px',
                                  height: '36px',
                                  minHeight: '36px',
                                  maxHeight: '36px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  flexShrink: 0,
                                  borderRadius: 'var(--radius-md)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxSizing: 'border-box',
                                }}
                              >
                                {isPosting ? '...' : 'Submit'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card 4: Ordered Items & Total */}
            <div className="card" style={{ marginBottom: 'var(--space-3)', padding: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-text)' }}>
                Ordered Items
              </h3>
              {order.order_items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '13px' }}>
                  <div style={{ paddingRight: '12px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <p
                      style={{
                        fontWeight: '700',
                        margin: 0,
                        color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.product_name}
                    >
                      {item.product_name}
                      {item.quantity > 1 && (
                        <span style={{
                          display: 'inline-block',
                          marginLeft: '6px',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-surface-warm, #FAF8F5)',
                          border: '1px solid var(--color-border-light)',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: 'var(--color-primary)',
                        }}>
                          ×{item.quantity}
                        </span>
                      )}
                    </p>
                    {item.order_item_options?.length > 0 && (
                      <p
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--color-text-secondary)',
                          margin: '2px 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.order_item_options.map(o => o.option_value).join(' · ')}
                      >
                        {item.order_item_options.map(o => o.option_value).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p style={{ fontWeight: '700', margin: 0, whiteSpace: 'nowrap', color: 'var(--color-text)', flexShrink: 0 }}>{formatCurrency(item.total_price)}</p>
                </div>
              ))}

              {/* Pricing Breakdown */}
              <div style={{ marginTop: '10px', paddingTop: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal || (order.total_amount - (order.delivery_fee || 0)))}</span>
                </div>
                {parseFloat(order.delivery_fee) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                {parseFloat(order.rush_fee || order.rushFee) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EA580C', fontWeight: '600', marginBottom: '4px' }}>
                    <span>Rush Fee</span>
                    <span>+{formatCurrency(order.rush_fee || order.rushFee)}</span>
                  </div>
                )}
                {Math.max(0, (parseFloat(order.subtotal || 0) + (order.order_type === 'pickup' ? 0 : parseFloat(order.delivery_fee || 0))) - parseFloat(order.total_amount || 0)) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: '600', marginBottom: '4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i> Voucher Discount
                    </span>
                    <span>-{formatCurrency(Math.max(0, (parseFloat(order.subtotal || 0) + (order.order_type === 'pickup' ? 0 : parseFloat(order.delivery_fee || 0))) - parseFloat(order.total_amount || 0)))}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border-light)', fontWeight: '800', fontSize: '15px' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Need Assistance & Quick Message Templates (Only for Active / Ongoing Orders) */}
            {!isCompleted && !isCancelled && (
              <div className="card" style={{ marginBottom: 'var(--space-3)', background: 'var(--color-surface)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <i className="fa-brands fa-facebook-messenger" style={{ color: '#0866FF', fontSize: '18px' }}></i>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                    Need Help with this Order?
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Pumili ng template sa ibaba para kusa itong makopya at direktang magbukas sa chatbox:
                </p>

                {/* Quick Template Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Follow up on order status', text: `Hi M&M Artsy! Following up on my order: ${order.reference_code}. May update na po ba?` },
                    { label: 'Ask about delivery time', text: `Hi M&M Artsy! Anong oras po estimated delivery ng order kong ${order.reference_code}?` },
                    { label: 'Update delivery address or notes', text: `Hi M&M Artsy! Pwede po mag-update ng delivery details para sa ${order.reference_code}?` },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleCopyRef(item.text);
                        openMessengerDirect(item.text);
                      }}
                      style={{
                        background: 'var(--color-surface-warm, #FAF8F5)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '9px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ fontSize: '11.5px', color: '#0866FF', fontWeight: '700' }}>Chat →</span>
                    </button>
                  ))}
                </div>

                {copiedRef && (
                  <div style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    background: 'var(--color-success-bg, #ECFDF5)',
                    color: 'var(--color-success, #10B981)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                    ✓ Kopyado na sa clipboard! I-paste lang sa chatbox.
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions: Order Again & Browse Collection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-3)' }}>
              {isCompleted && !order.isCustomRequest && (
                <button
                  type="button"
                  className="btn btn-primary btn-full ripple"
                  onClick={handleOrderAgain}
                  disabled={reordering}
                  id="track-order-again-btn"
                  style={{
                    height: '46px',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <i className={reordering ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-cart-plus'}></i>
                  <span>{reordering ? 'Adding items to Cart...' : 'Order Again'}</span>
                </button>
              )}

              <div style={{ textAlign: 'center' }}>
                <Link href="/shop" className="btn btn-ghost" style={{ fontSize: '13px', padding: '10px' }} id="track-shop-again-btn">
                  Browse Collection →
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>Loading...</div>}>
      <TrackContent />
    </Suspense>
  );
}


