'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import CartIconBtn from '@/components/customer/CartIconBtn';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import { useCart } from '@/lib/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, formatRelative } from '@/lib/utils/formatDate';
import { getMockOrderByReference, addMockReview, MOCK_PRODUCTS } from '@/lib/mockData';
import { MESSENGER_URL, CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';

function getTimelineSteps(orderType = 'delivery') {
  const isDelivery = orderType === 'delivery';
  return [
    { key: 'confirmed', label: 'Confirmed',        desc: 'Details & payment verified' },
    { key: 'preparing', label: 'Crafting',         desc: 'Handcrafting your order' },
    { 
      key: 'ready',     
      label: isDelivery ? 'Out for Delivery' : 'Ready for Pickup', 
      desc: isDelivery ? 'On the way to your address' : 'Ready at workshop location' 
    },
    { key: 'completed', label: 'Completed',        desc: 'Order successfully fulfilled' },
  ];
}

function getStatusIndex(status) {
  switch (status) {
    case 'pending':
    case 'for_confirmation':
    case 'confirmed':
      return 0;
    case 'preparing':
    case 'crafting':
      return 1;
    case 'ready':
      return 2;
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
      return { title: 'Order Received', subtitle: 'Your order has been submitted and is awaiting confirmation.' };
    case 'confirmed':
      return { title: 'Order Confirmed', subtitle: 'Payment & details verified. Scheduled for crafting.' };
    case 'preparing':
    case 'crafting':
      return { title: "We're Handcrafting Your Order", subtitle: 'Our crafters are actively preparing your handmade pieces.' };
    case 'ready':
      return {
        title: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
        subtitle: isDelivery ? 'Your package is on the way to your address.' : 'Your order is ready at the workshop.'
      };
    case 'completed':
      return { title: 'Order Completed', subtitle: 'Your order has been successfully delivered and completed.' };
    case 'cancelled':
      return { title: 'Order Cancelled', subtitle: 'This order was cancelled. Chat with us on Messenger for help.' };
    default:
      return { title: 'Order Received', subtitle: 'Tracking your order progress.' };
  }
}

function TrackContent() {
  const router = useRouter();
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const [refInput, setRefInput] = useState(searchParams?.get('ref') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Per-item review state
  const [itemRatings, setItemRatings] = useState({});
  const [itemComments, setItemComments] = useState({});
  const [itemReviewed, setItemReviewed] = useState({});
  const [itemSubmitting, setItemSubmitting] = useState({});

  const handleOrderAgain = () => {
    if (!order?.order_items?.length) return;
    setReordering(true);

    try {
      order.order_items.forEach((item, idx) => {
        const productName = item.product_name || '';
        const matched = MOCK_PRODUCTS.find((p) =>
          p.name.toLowerCase() === productName.toLowerCase() ||
          productName.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(productName.toLowerCase())
        );

        const itemUnitPrice = parseFloat(item.unit_price) || (parseFloat(item.total_price) / (item.quantity || 1)) || matched?.base_price || 250;

        addItem({
          productId: matched?.id || item.product_id || `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          productSlug: matched?.slug || 'fuzzy-wire-rose-bouquet',
          productName: item.product_name || 'Handmade Flower Piece',
          photo: matched?.photos?.[0] || matched?.product_photos?.[0]?.url || '/images/categories/flower-bouquets.png',
          basePrice: matched?.base_price || itemUnitPrice,
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
        });
      });

      setTimeout(() => {
        router.push('/cart');
      }, 350);
    } catch (e) {
      setReordering(false);
      router.push('/shop');
    }
  };

  const handleCopyRef = (text) => {
    if (!text) return;
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedRef(true);
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
      foundOrder = getMockOrderByReference(lookupRef);
    }

    if (!foundOrder) {
      const mockCR = (await import('@/lib/mockData')).MOCK_CUSTOM_REQUESTS?.find(
        (r) => r.reference_code === lookupRef
      );
      if (mockCR) {
        foundOrder = {
          isCustomRequest: true,
          reference_code: mockCR.reference_code,
          customer_name: mockCR.customer_name,
          status: mockCR.status === 'pending' ? 'pending' : 'confirmed',
          order_type: 'custom_order',
          total_amount: parseFloat(mockCR.quoted_price || mockCR.budget || 0),
          preferred_date: mockCR.preferred_date,
          created_at: mockCR.created_at,
          order_items: [{
            product_name: `Custom: ${mockCR.description?.slice(0, 50)}`,
            quantity: 1,
            total_price: parseFloat(mockCR.quoted_price || mockCR.budget || 0),
            order_item_options: mockCR.preferred_color ? [{ option_value: `Color: ${mockCR.preferred_color}` }] : [],
          }],
        };
      }
    }

    if (!foundOrder) {
      try {
        const localRaw = localStorage.getItem(`likha_last_order_${lookupRef}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          foundOrder = {
            reference_code: parsed.referenceCode || lookupRef,
            customer_name: parsed.customerName || 'Customer',
            status: 'pending',
            order_type: parsed.orderType || 'delivery',
            total_amount: parsed.totalAmount || 0,
            subtotal: parsed.subtotal || 0,
            delivery_fee: parsed.deliveryFee || 0,
            preferred_date: parsed.preferredDate || null,
            created_at: new Date().toISOString(),
            delivery_address: parsed.address || null,
            landmark: parsed.landmark || null,
            order_items: (parsed.items || []).map((i) => ({
              product_name: i.productName,
              quantity: i.quantity,
              total_price: (i.unitPrice + (i.options || []).reduce((s, o) => s + (parseFloat(o.additionalCost) || 0), 0)) * i.quantity,
              order_item_options: (i.options || []).map((o) => ({
                option_value: `${o.optionName}: ${o.optionValue}`,
              })),
            })),
          };
        }
      } catch {}
    }

    if (!foundOrder) {
      setError('Order not found. Please verify your reference code (e.g. M&M-260908-001).');
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
      const defaultActive = {
        referenceCode: 'M&M-260908-001',
        customerName: 'Maria Santos',
        orderType: 'delivery',
        totalAmount: 949,
        itemsSummary: 'Fuzzy Wire Sunflower Bouquet ×1',
        createdAt: new Date().toISOString(),
        status: 'crafting',
      };
      const defaultCompleted = {
        referenceCode: 'M&M-260906-006',
        customerName: 'Janine Alcantara',
        orderType: 'pickup',
        totalAmount: 1250,
        itemsSummary: 'Fuzzy Wire Tulip Garden Pot ×2',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: 'completed',
      };

      let merged = Array.isArray(stored) ? [...stored] : [];
      if (!merged.some((o) => o.referenceCode === defaultActive.referenceCode)) {
        merged.push(defaultActive);
      }
      if (!merged.some((o) => o.referenceCode === defaultCompleted.referenceCode)) {
        merged.push(defaultCompleted);
      }

      setSavedHistory(merged);
      localStorage.setItem('likha_my_orders', JSON.stringify(merged));
    } catch {}
  }, []);

  // Auto-search if ref is in URL
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) handleSearch(ref);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const productName = item?.product_name || '';
    const matchedProduct = MOCK_PRODUCTS.find((p) => 
      p.name.toLowerCase() === productName.toLowerCase() ||
      productName.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(productName.toLowerCase())
    );
    const productSlug = matchedProduct ? matchedProduct.slug : 'fuzzy-wire-rose-bouquet';

    const cleanComment = (commentText || '').trim();
    const newReview = {
      productSlug,
      customer_name: order?.customer_name || 'Verified Customer',
      rating,
      comment: cleanComment || 'Verified buyer review',
      is_verified_buyer: true,
      is_approved: true,
    };

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
      if (supabase && matchedProduct?.id) {
        await supabase.from('product_reviews').insert([
          {
            product_id: matchedProduct.id,
            customer_name: order?.customer_name || 'Verified Customer',
            rating,
            comment: cleanComment || 'Verified buyer review',
            is_verified_buyer: true,
            is_approved: true,
          }
        ]);
      }
    } catch {}

    addMockReview(newReview);
    setItemSubmitting((prev) => ({ ...prev, [itemIndex]: false }));
    setItemReviewed((prev) => ({ ...prev, [itemIndex]: true }));
  };

  const isCancelled = order?.status === 'cancelled';
  const isCompleted = order?.status === 'completed';
  const isDelivery = (order?.order_type || 'delivery') === 'delivery';
  const timelineSteps = getTimelineSteps(order?.order_type || 'delivery');
  const currentStatusIdx = order ? getStatusIndex(order.status) : -1;
  const currentStepInfo = timelineSteps[currentStatusIdx] || timelineSteps[0];
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
          <a href={CUSTOM_ORDER_MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="top-bar-link">Custom Orders</a>
          <Link href="/track" className="top-bar-link active">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="page-content page-enter" style={{ maxWidth: '560px', margin: '0 auto', width: '100%' }}>
        {/* Search Header Section & My Orders List (Only when NO order is currently being viewed) */}
        {!order && (
          <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <h1 className="section-title" style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                Track Your Order
              </h1>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                className="input"
                type="text"
                placeholder="e.g. M&M-260908-001"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  fontSize: '13.5px',
                  height: '46px',
                  minHeight: '46px',
                  maxHeight: '46px',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0 14px',
                  boxSizing: 'border-box',
                }}
                id="track-ref-input"
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSearch()}
                disabled={loading || !refInput.trim()}
                style={{
                  height: '46px',
                  minHeight: '46px',
                  maxHeight: '46px',
                  padding: '0 20px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-lg)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                id="track-search-btn"
              >
                {loading ? '...' : 'Track'}
              </button>
            </div>

            {error && (
              <div style={{
                marginTop: 'var(--space-3)',
                padding: '12px 14px',
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            {/* My Orders Section (Active on top, Past/Completed at bottom) */}
            {savedHistory.length > 0 && (() => {
              const activeList = savedHistory.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
              const pastList = savedHistory.filter(o => o.status === 'completed' || o.status === 'cancelled');

              return (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-receipt" style={{ color: 'var(--color-primary)', fontSize: '13.5px' }}></i>
                      <h2 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>
                        My Orders ({savedHistory.length})
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('likha_my_orders');
                        setSavedHistory([]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 1. Active Orders on TOP */}
                    {activeList.map((item, idx) => (
                      <div
                        key={`active-${idx}`}
                        onClick={() => {
                          setRefInput(item.referenceCode);
                          handleSearch(item.referenceCode);
                        }}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '13.5px', color: 'var(--color-primary)' }}>
                            {item.referenceCode}
                          </span>
                          <span className="badge badge-pending" style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px' }}>
                            {item.status === 'ready' ? (item.orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup') : item.status === 'crafting' ? 'Crafting' : item.status === 'confirmed' ? 'Confirmed' : 'Submitted'}
                          </span>
                        </div>

                        {item.itemsSummary && (
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--color-text)',
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

                    {/* 2. Past / Completed Orders at BOTTOM (Pinakahuli) */}
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
            {/* Back to Search & My Orders */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { setOrder(null); setRefInput(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0',
                }}
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Back to My Orders</span>
              </button>

              <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                {order.reference_code}
              </span>
            </div>

            {/* Card 1: Order Status & Details (Only for Active / Ongoing Orders) */}
            {!isCompleted && (
              <div className="card" style={{ marginBottom: 'var(--space-3)', background: 'var(--color-surface)', padding: '16px' }}>
                {/* Header: Reference + Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', color: 'var(--color-primary)', fontSize: '15px' }}>
                      {order.reference_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(order.reference_code)}
                      style={{
                        background: copiedRef ? 'var(--color-success-bg, #ECFDF5)' : 'var(--color-surface-warm, #FAF8F5)',
                        border: `1px solid ${copiedRef ? 'var(--color-success, #10B981)' : 'var(--color-border)'}`,
                        color: copiedRef ? 'var(--color-success, #10B981)' : 'var(--color-text-secondary)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                      title="Copy Reference Code"
                    >
                      {copiedRef ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>

                  <span className={`badge badge-${isCancelled ? 'danger' : order.status === 'completed' ? 'completed' : 'pending'}`} style={{ fontSize: '11.5px', textTransform: 'capitalize', fontWeight: '700' }}>
                    {isCancelled ? 'Cancelled' : currentStepInfo.label}
                  </span>
                </div>

                {/* Status Headline */}
                <div style={{ marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 2px 0', color: 'var(--color-text)' }}>
                    {heroInfo?.title}
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {heroInfo?.subtitle}
                  </p>
                </div>

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>Customer</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{order.customer_name}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>Fulfillment Method</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-text)' }}>{isDelivery ? 'Delivery' : 'Pickup'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11.5px' }}>Placed On</span>
                    <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                      {formatDate(order.created_at) || formatRelative(order.created_at)}
                    </span>
                  </div>

                  {order.delivery_address && isDelivery && (
                    <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11.5px', flexShrink: 0 }}>Address</span>
                      <span style={{ fontWeight: '500', color: 'var(--color-text)', textAlign: 'right', wordBreak: 'break-word' }}>
                        {order.delivery_address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card 2: Order Progress Stepper (Only for Active / Ongoing Orders) */}
            {!isCancelled && !isCompleted ? (
              <div className="card" style={{ marginBottom: 'var(--space-3)', padding: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: '800', marginBottom: '14px', color: 'var(--color-text)' }}>
                  Order Progress
                </h3>

                <div className="order-timeline" style={{ padding: '0 4px' }}>
                  {timelineSteps.map((step, idx) => {
                    const isStepCompleted = idx < currentStatusIdx;
                    const isActive = idx === currentStatusIdx;
                    return (
                      <div key={step.key} className={`timeline-step${isStepCompleted ? ' completed' : ''}${isActive ? ' active' : ''}`}>
                        <div className="timeline-dot" style={{ fontWeight: '700', fontSize: '12px' }}>
                          {isStepCompleted ? (
                            <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div className="timeline-content">
                          <p className="timeline-label" style={{ fontSize: '13.5px', fontWeight: '700' }}>{step.label}</p>
                          {(isActive || isStepCompleted) && (
                            <p className="timeline-desc" style={{ fontSize: '11.5px' }}>{step.desc}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : isCancelled ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: '2rem', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}></i>
                <p style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-danger)', margin: 0 }}>Order Cancelled</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                  Please contact us via Messenger for any questions.
                </p>
              </div>
            ) : null}

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
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', fontSize: '13px' }}>
                  <div style={{ paddingRight: '12px' }}>
                    <p style={{ fontWeight: '700', margin: 0 }}>
                      {item.product_name}
                      {item.quantity > 1 && <span style={{ color: 'var(--color-text-muted)' }}> ×{item.quantity}</span>}
                    </p>
                    {item.order_item_options?.length > 0 && (
                      <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                        {item.order_item_options.map(o => o.option_value).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p style={{ fontWeight: '700', margin: 0, whiteSpace: 'nowrap' }}>{formatCurrency(item.total_price)}</p>
                </div>
              ))}

              {/* Pricing Breakdown */}
              <div style={{ marginTop: '10px', paddingTop: '6px', fontSize: '13px' }}>
                {parseFloat(order.delivery_fee) > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal || (order.total_amount - (order.delivery_fee || 0)))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: parseFloat(order.delivery_fee) > 0 ? '1px solid var(--color-border-light)' : 'none', fontWeight: '800', fontSize: '14.5px' }}>
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
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0' }}>
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
                        window.open(`https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent(item.text)}`, '_blank', 'noopener,noreferrer');
                      }}
                      style={{
                        background: 'var(--color-surface-warm, #FAF8F5)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
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


