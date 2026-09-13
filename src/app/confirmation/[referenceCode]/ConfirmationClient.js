'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function ConfirmationClient({ order: serverOrder, referenceCode }) {
  const [localOrder, setLocalOrder] = useState(serverOrder || null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [fbName, setFbName] = useState('');

  const effectiveCode = referenceCode || serverOrder?.reference_code || '';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = effectiveCode ? `Order Received #${effectiveCode} | M&M's Artsy` : "Order Received | M&M's Artsy";
    }
    try {
      const savedInfo = localStorage.getItem('likha_guest_info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        if (parsed.facebookName) setFbName(parsed.facebookName);
      }
      if (effectiveCode) {
        const orderInfo = localStorage.getItem(`likha_last_order_${effectiveCode}`);
        if (orderInfo) {
          const parsedOrder = JSON.parse(orderInfo);
          if (parsedOrder.facebookName) setFbName(parsedOrder.facebookName);
          if (!serverOrder) {
            setLocalOrder({
              reference_code: parsedOrder.referenceCode || effectiveCode,
              customer_name: parsedOrder.customerName || 'Customer',
              customer_phone: parsedOrder.customerPhone || '',
              order_type: parsedOrder.orderType || 'delivery',
              subtotal: parsedOrder.subtotal || 0,
              delivery_fee: parsedOrder.deliveryFee || 0,
              total_amount: parsedOrder.totalAmount || 0,
              notes: parsedOrder.notes || '',
              preferred_date: parsedOrder.preferredDate || null,
              order_items: (parsedOrder.items || []).map((i) => ({
                product_name: i.productName,
                quantity: i.quantity,
                total_price: (parseFloat(i.unitPrice) || 0) * (i.quantity || 1),
                order_item_options: (i.options || []).map((o) => ({
                  option_name: o.optionName,
                  option_value: o.optionValue,
                })),
              })),
            });
          }
        }
      }
    } catch {}
  }, [effectiveCode, serverOrder]);

  const order = localOrder || serverOrder || {
    reference_code: effectiveCode || 'M&M-ORDER',
    customer_name: 'Customer',
    order_type: 'delivery',
    subtotal: 0,
    delivery_fee: 0,
    total_amount: 0,
    order_items: [],
  };

  // Construct itemized message for Messenger & Facebook Chat
  const itemsListText = (order.order_items || [])
    .map((item) => {
      const opts = (item.order_item_options || []).map((o) => o.option_value).join(', ');
      return `• ${item.quantity}x ${item.product_name}${opts ? ` (${opts})` : ''} — ${formatCurrency(item.total_price)}`;
    })
    .join('\n');

  const fulfillmentType = order.order_type === 'pickup' ? 'Pickup' : 'Delivery';
  const deliveryFee = order.order_type === 'pickup' ? 0 : (parseFloat(order.delivery_fee) || 0);
  const itemsCount = (order.order_items || []).length;

  // Smart Price Formatting:
  // If single item and free pickup -> Direct Total only (no redundant Subtotal)
  // If delivery fee > 0 or multiple items -> Show Subtotal + Delivery Fee + Total
  let priceBreakdown = '';
  if (deliveryFee > 0) {
    priceBreakdown = `Subtotal: ${formatCurrency(order.subtotal || (order.total_amount - deliveryFee))}\nDelivery Fee: ${formatCurrency(deliveryFee)}\nTotal: ${formatCurrency(order.total_amount)}`;
  } else if (itemsCount > 1) {
    priceBreakdown = `Subtotal: ${formatCurrency(order.subtotal || order.total_amount)}\nTotal: ${formatCurrency(order.total_amount)}`;
  } else {
    priceBreakdown = `Total: ${formatCurrency(order.total_amount)}`;
  }

  const prefilledMessage = `M&M's Artsy — Order Receipt
───────────────────────────
Reference: ${order.reference_code}
Name: ${order.customer_name}
Claim Method: ${fulfillmentType}

Items:
${itemsListText || '• Handcrafted Bouquet / Crafts'}

${priceBreakdown}
───────────────────────────
Hi M&M's Artsy! I would like to confirm my order from the website. Thank you!`;
  // Using facebook.com/messages/t/ instead of m.me (m.me gets blocked by browsers)
  const messengerUrl = `https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent(prefilledMessage)}`;

  const copyToClipboard = (text) => {
    if (!text) return false;
    let copied = false;

    // 1. Synchronous document.execCommand fallback (works 100% reliably during click events & on all mobile browsers)
    try {
      if (typeof document !== 'undefined' && document.body) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        copied = document.execCommand('copy');
        if (textarea.parentNode === document.body) {
          document.body.removeChild(textarea);
        }
      }
    } catch {}

    // 2. Modern navigator.clipboard API
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          copied = true;
        }).catch(() => {});
      }
    } catch {}

    return copied;
  };

  const handleCopyOnly = () => {
    copyToClipboard(prefilledMessage);
    setCopiedReceipt(true);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'success',
              title: 'Order Details Copied! 📋',
              message: 'Ready to paste in Messenger chat',
              duration: 3000,
            },
          })
        );
      } catch {}
    }
    setTimeout(() => setCopiedReceipt(false), 3500);
  };

  const handleOpenMessenger = () => {
    // Copy full receipt before opening window so user can paste it
    copyToClipboard(prefilledMessage);
    setCopiedReceipt(true);
    // Open Messenger with short greeting only (long URLs get blocked)
    window.open(messengerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="customer-shell">
      {/* Top App Bar */}
      <header className="top-bar">
        <Link href="/" className="top-bar-action" aria-label="Back to home">
          <i className="fa-solid fa-house"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, margin: 0 }}>
          Order Confirmation
        </span>
        <div style={{ width: 40 }} />
      </header>

      <main className="page-content page-enter" style={{ maxWidth: '580px', margin: '0 auto', padding: 'var(--space-4) var(--page-padding) var(--space-16)' }}>
        {/* Top Hero Status */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-4) var(--space-2) var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10B981',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            marginBottom: '10px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
          }}>
            <i className="fa-solid fa-check"></i>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.4rem',
            fontWeight: '800',
            color: 'var(--color-text)',
            margin: '0 0 4px',
          }}>
            Order Received!
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
            Salamat, <strong>{order.customer_name}</strong>! Na-save na ang iyong order request.
          </p>

          {/* Clean Reference Pill */}
          <div style={{
            background: 'var(--color-surface-warm)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 18px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-text)',
          }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
              Reference No:
            </span>
            <span style={{ color: 'var(--color-primary)', fontWeight: '800', fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.03em' }}>
              {order.reference_code}
            </span>
          </div>
        </div>

        {/* ── UNIFIED 1-TAP MESSENGER HANDOFF (Frictionless & User-Friendly) ── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: '18px 16px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(8, 102, 255, 0.1)',
              color: '#0866FF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
              marginTop: '2px',
            }}>
              <i className="fa-brands fa-facebook-messenger"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 3px' }}>
                I-send ang Order sa Messenger
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Isang pindot lang — <strong>automatic nang makokopya</strong> ang resibo at bubuksan ang aming Messenger para ma-confirm agad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenMessenger}
            className="btn btn-primary btn-full ripple"
            id="messenger-btn"
            style={{
              background: '#0866FF',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '46px',
              fontSize: '14.5px',
              fontWeight: '700',
              boxShadow: '0 4px 14px rgba(8, 102, 255, 0.3)',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '19px' }}></i>
            <span>Copy Receipt & Open Messenger</span>
          </button>

          {copiedReceipt && (
            <div style={{
              marginTop: '10px',
              padding: '7px 12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-full)',
              color: '#065F46',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.2s ease',
            }}>
              <i className="fa-solid fa-circle-check" style={{ color: '#10B981', fontSize: '13px' }}></i>
              <span>Kopyado na sa clipboard! I-paste lang sa chatbox.</span>
            </div>
          )}
        </div>

        {/* ── ORDER SUMMARY CARD ── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-2xl)',
          padding: '16px',
          marginBottom: 'var(--space-4)',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--color-text)',
            margin: '0 0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>Order Summary</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)' }}>
              {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'items'}
            </span>
          </h2>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {order.order_items?.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: i < order.order_items.length - 1 ? '10px' : '0',
                  borderBottom: i < order.order_items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                }}
              >
                <div style={{ flex: 1, paddingRight: '12px', minWidth: 0, overflow: 'hidden' }}>
                  <p
                    style={{
                      fontWeight: '600',
                      fontSize: '13.5px',
                      color: 'var(--color-text)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.product_name}
                  >
                    {item.product_name}
                    {item.quantity > 1 && (
                      <span style={{ color: 'var(--color-primary)', fontWeight: '700' }}> ×{item.quantity}</span>
                    )}
                  </p>
                  {item.order_item_options?.length > 0 && (
                    <p
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--color-text-secondary)',
                        margin: '3px 0 0',
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
                <p style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap' }}>
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>

          <hr className="divider" style={{ margin: '0 0 10px' }} />

          {/* Price Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Delivery Fee</span>
              <span>{order.order_type === 'pickup' ? 'Free (Pickup)' : formatCurrency(order.delivery_fee)}</span>
            </div>
            {Math.max(0, (parseFloat(order.subtotal || 0) + (order.order_type === 'pickup' ? 0 : parseFloat(order.delivery_fee || 0))) - parseFloat(order.total_amount || 0)) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: '600' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i> Voucher Discount
                </span>
                <span>-{formatCurrency(Math.max(0, (parseFloat(order.subtotal || 0) + (order.order_type === 'pickup' ? 0 : parseFloat(order.delivery_fee || 0))) - parseFloat(order.total_amount || 0)))}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: '800',
              fontSize: '15px',
              color: 'var(--color-text)',
              paddingTop: '6px',
              borderTop: '1px dashed var(--color-border-light)',
            }}>
              <span>Total Amount</span>
              <span style={{ color: 'var(--color-primary)', fontSize: '17px' }}>
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Link
            href={`/track?ref=${order.reference_code}`}
            className="btn btn-secondary"
            id="track-order-btn"
            style={{
              height: '44px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <i className="fa-solid fa-truck-fast"></i>
            <span>Track Order</span>
          </Link>

          <Link
            href="/shop"
            className="btn btn-secondary"
            id="continue-shopping-btn"
            style={{
              height: '44px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <i className="fa-solid fa-bag-shopping"></i>
            <span>Shop More</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
