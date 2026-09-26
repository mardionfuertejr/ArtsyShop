'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDateShort, formatTime12Hour } from '@/lib/utils/formatDate';
import { formatOrderSummary } from '@/lib/utils/formatOrderSummary';
import { openMessengerDirect, getMessengerChatUrl } from '@/lib/utils/browserNav';
import { isRushDate } from '@/components/common/PremiumDatePicker';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmationClient({ order: serverOrder, referenceCode }) {
  const [localOrder, setLocalOrder] = useState(serverOrder || null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [fbName, setFbName] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

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
              customer_phone: parsedOrder.customerPhone || parsedOrder.customer_phone || '',
              order_type: parsedOrder.orderType || 'delivery',
              delivery_address: parsedOrder.deliveryAddress || parsedOrder.delivery_address || parsedOrder.address || '',
              subtotal: parsedOrder.subtotal || 0,
              delivery_fee: parsedOrder.deliveryFee || 0,
              rush_fee: parsedOrder.rushFee || parsedOrder.rush_fee || 0,
              is_rush: parsedOrder.isRush || parsedOrder.is_rush || false,
              voucher_discount: parsedOrder.voucherDiscount || 0,
              applied_voucher_code: parsedOrder.appliedVoucherCode || null,
              total_amount: parsedOrder.totalAmount || 0,
              notes: parsedOrder.notes || '',
              preferred_date: parsedOrder.preferredDate || null,
              preferred_time: parsedOrder.preferredTime || null,
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
    customer_phone: '',
    order_type: 'delivery',
    delivery_address: '',
    subtotal: 0,
    delivery_fee: 0,
    rush_fee: 0,
    is_rush: false,
    voucher_discount: 0,
    total_amount: 0,
    order_items: [],
  };

  const isRush = Boolean(order.is_rush || order.isRush || isRushDate(order.preferred_date || order.preferredDate));
  const rushFee = parseFloat(order.rush_fee || order.rushFee) || (isRush ? 50 : 0);

  const targetDate = order.preferred_date || order.preferredDate || order.target_date;
  const targetTime = order.preferred_time || order.preferredTime;
  const formattedSchedule = targetDate
    ? `${formatDateShort(targetDate)}${targetTime ? ` · ${formatTime12Hour(targetTime)}` : ''}`
    : null;

  const prefilledMessage = formatOrderSummary(order);
  const messengerUrl = getMessengerChatUrl(prefilledMessage);

  const copyToClipboard = (text) => {
    if (!text) return false;
    let copied = false;
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
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          copied = true;
        }).catch(() => {});
      }
    } catch {}
    return copied;
  };

  const handleOpenMessenger = () => {
    copyToClipboard(prefilledMessage);
    setCopiedReceipt(true);
    const nowIso = new Date().toISOString();
    const code = order.reference_code || effectiveCode;
    try {
      if (code && typeof window !== 'undefined') {
        const mockRaw = localStorage.getItem('likha_mock_orders');
        if (mockRaw) {
          const list = JSON.parse(mockRaw);
          const idx = list.findIndex(o => o.reference_code === code || o.referenceCode === code);
          if (idx !== -1) {
            list[idx].messenger_opened_at = nowIso;
            list[idx].sent_to_messenger = true;
            localStorage.setItem('likha_mock_orders', JSON.stringify(list));
          }
        }
        const singleRaw = localStorage.getItem(`likha_last_order_${code}`);
        if (singleRaw) {
          const s = JSON.parse(singleRaw);
          s.messenger_opened_at = nowIso;
          s.sent_to_messenger = true;
          localStorage.setItem(`likha_last_order_${code}`, JSON.stringify(s));
        }
      }
    } catch {}
    try {
      const supabase = createClient();
      if (supabase && code) {
        supabase
          .from('orders')
          .update({
            messenger_opened_at: nowIso,
            sent_to_messenger: true,
          })
          .eq('reference_code', code)
          .then(() => {})
          .catch(() => {});
      }
    } catch {}
    openMessengerDirect(prefilledMessage);
  };

  // Lock body scroll when receipt preview modal is open
  useEffect(() => {
    if (showPreviewModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showPreviewModal]);

  const generateReceiptCanvas = () => {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const scale = 2;
      const width = 480;
      
      const items = order.order_items || [];
      let itemsHeight = 0;
      items.forEach((it) => {
        const opts = (it.order_item_options || [])
          .map(o => o?.option_value || o?.optionValue)
          .filter(val => Boolean(val) && val.trim().toLowerCase() !== (it.product_name || '').trim().toLowerCase())
          .join(' · ');
        itemsHeight += opts ? 32 : 22;
      });

      const hasDiscount = Number(order.voucher_discount) > 0;
      const hasRush = Number(rushFee) > 0;
      const breakdownRows = 2 + (hasDiscount ? 1 : 0) + (hasRush ? 1 : 0);
      const totalsHeight = (breakdownRows * 16) + 32;

      // Exact height calculation with generous bottom padding so footer never overflows
      const height = 196 + itemsHeight + totalsHeight + 84;

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Background Card - Clean Warm Ivory
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(0, 0, width, height);

      // Outer Perimeter Border (Frames the image on white/dark viewer backgrounds)
      ctx.strokeStyle = '#E5DCCD';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Main White Card with Rounded Border
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(8, 8, width - 16, height - 16, 12);
      ctx.fill();
      ctx.strokeStyle = '#E0D4C3';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle Decorative Inset Framing Border
      ctx.beginPath();
      ctx.roundRect(14, 14, width - 28, height - 28, 8);
      ctx.strokeStyle = '#F3ECE0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Delicate Corner Botanical Accents
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🌸🍃', 22, 34);
      ctx.textAlign = 'right';
      ctx.fillText('🍃🌸', width - 22, 34);

      // Brand Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#881337';
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText("M&M'S ARTSY SHOP", width / 2, 34);

      ctx.fillStyle = '#BE123C';
      ctx.font = 'italic bold 20px Georgia, "Playfair Display", serif';
      ctx.fillText('Order Receipt', width / 2, 58);

      // Reference Badge
      const refCode = order.reference_code || effectiveCode;
      const badgeText = `ORDER #${refCode}`;
      ctx.font = 'bold 10.5px monospace';
      const badgeWidth = ctx.measureText(badgeText).width + 24;
      
      ctx.fillStyle = '#FFF1F2';
      ctx.beginPath();
      ctx.roundRect((width - badgeWidth) / 2, 68, badgeWidth, 20, 10);
      ctx.fill();
      ctx.strokeStyle = '#FECDD3';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#9F1239';
      ctx.fillText(badgeText, width / 2, 82);

      // Info Table Box (4 rows: Customer, Order Type, Schedule, Payment)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FAF6F0';
      ctx.beginPath();
      ctx.roundRect(22, 96, width - 44, 78, 8);
      ctx.fill();
      ctx.strokeStyle = '#EFE6D8';
      ctx.lineWidth = 1;
      ctx.stroke();

      const drawRow = (label, val, y) => {
        ctx.fillStyle = '#64748B';
        ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label, 34, y);
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(val, 116, y);
      };

      const pMethod = order.payment_method === 'gcash' || order.paymentMethod === 'gcash'
        ? `GCash ${order.gcash_reference_no || order.gcashRefNo ? `(Ref: ${order.gcash_reference_no || order.gcashRefNo})` : ''}`
        : (order.order_type === 'delivery' ? 'Cash on Delivery (COD)' : 'Cash upon Pickup');

      const addrSummary = order.delivery_address 
        ? (order.delivery_address.length > 38 ? order.delivery_address.substring(0, 36) + '...' : order.delivery_address)
        : 'Address on file';

      drawRow('Customer:', order.customer_name || 'Customer', 114);
      drawRow('Order Type:', order.order_type === 'delivery' ? `Delivery (${addrSummary})` : 'Pickup at Studio', 131);
      drawRow('Schedule:', formattedSchedule || 'Standard Turnaround', 148);
      drawRow('Payment:', pMethod, 165);

      // Items List Header
      let curY = 194;
      ctx.fillStyle = '#881337';
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('ITEM', 24, curY);
      ctx.textAlign = 'right';
      ctx.fillText('AMOUNT', width - 24, curY);

      ctx.strokeStyle = '#EFE6D8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, curY + 6);
      ctx.lineTo(width - 24, curY + 6);
      ctx.stroke();

      curY += 20;

      // Items Rows
      (order.order_items || []).forEach((it) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0F172A';
        ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const nameText = `${it.product_name} × ${it.quantity}`;
        ctx.fillText(nameText, 24, curY);

        ctx.textAlign = 'right';
        ctx.font = '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(formatCurrency(it.total_price), width - 24, curY);

        const opts = (it.order_item_options || [])
          .map(o => o?.option_value || o?.optionValue)
          .filter(val => Boolean(val) && val.trim().toLowerCase() !== (it.product_name || '').trim().toLowerCase())
          .join(' · ');

        if (opts) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#64748B';
          ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(opts, 24, curY + 13);
          curY += 28;
        } else {
          curY += 20;
        }
      });

      // Total Breakdown Divider
      ctx.strokeStyle = '#EFE6D8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, curY);
      ctx.lineTo(width - 24, curY);
      ctx.stroke();

      curY += 16;

      const drawTotalRow = (lbl, val, isBold = false, color = '#64748B') => {
        ctx.textAlign = 'left';
        ctx.fillStyle = color;
        ctx.font = isBold ? '700 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(lbl, width - 190, curY);

        ctx.textAlign = 'right';
        ctx.fillStyle = color === '#64748B' ? '#0F172A' : color;
        ctx.font = isBold ? 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(val, width - 24, curY);
        curY += 16;
      };

      drawTotalRow('Subtotal:', formatCurrency(order.subtotal));
      drawTotalRow('Delivery Fee:', order.order_type === 'pickup' ? 'FREE' : formatCurrency(order.delivery_fee));
      if (hasRush) drawTotalRow('Rush Fee:', `+${formatCurrency(rushFee)}`, false, '#EA580C');
      if (hasDiscount) drawTotalRow('Voucher Discount:', `-${formatCurrency(order.voucher_discount)}`, false, '#16A34A');

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - 190, curY - 2);
      ctx.lineTo(width - 24, curY - 2);
      ctx.stroke();
      curY += 14;

      drawTotalRow('TOTAL AMOUNT:', formatCurrency(order.total_amount), true, '#BE123C');

      // Footer Note
      curY += 16;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#881337';
      ctx.font = 'italic 11px Georgia, serif';
      ctx.fillText("Thank you for shopping with M&M's Artsy Shop!", width / 2, curY);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Please present this e-receipt upon pickup or delivery.', width / 2, curY + 14);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error generating receipt canvas:', e);
      return null;
    }
  };

  const handleOpenReceiptPreview = () => {
    setIsGeneratingReceipt(true);
    setTimeout(() => {
      try {
        const dataUrl = generateReceiptCanvas();
        if (dataUrl) {
          setPreviewImageUrl(dataUrl);
          setShowPreviewModal(true);
        }
      } catch (e) {
        console.error('Error previewing receipt image:', e);
      } finally {
        setIsGeneratingReceipt(false);
      }
    }, 50);
  };

  const handleDownloadReceiptImage = () => {
    try {
      const dataUrl = previewImageUrl || generateReceiptCanvas();
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = `MM_Artsy_Receipt_${order.reference_code || 'order'}.png`;
      link.href = dataUrl;
      link.click();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'success',
              title: 'E-Receipt Saved! 📸',
              message: 'Saved receipt image to your device downloads.',
              duration: 3500,
            },
          })
        );
      }
    } catch (e) {
      console.error('Error downloading receipt image:', e);
    }
  };

  return (
    <div className="customer-shell">
      {/* Top App Bar with safe-area spacing */}
      <header className="top-bar">
        <Link href="/" className="top-bar-action" aria-label="Back to home">
          <i className="fa-solid fa-house"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, textAlign: 'center', fontSize: '1rem', fontWeight: '800', letterSpacing: '-0.01em', margin: 0 }}>
          Order Confirmation
        </span>
        <div style={{ width: 40 }} />
      </header>

      <main className="page-content page-enter" style={{ maxWidth: '540px', width: '100%', margin: '0 auto', padding: 'var(--space-3) var(--page-padding) var(--space-16)', boxSizing: 'border-box', overflowX: 'hidden' }}>
        
        {/* ── BOTANICAL ARTISAN E-RECEIPT CARD (Stunning & Aesthetic) ── */}
        <div className="artisan-ticket-card" style={{
          background: '#FFFDF9',
          borderRadius: '24px',
          boxShadow: '0 12px 36px rgba(184, 138, 102, 0.12), 0 2px 8px rgba(0, 0, 0, 0.03)',
          border: '2px solid #F3EAD8',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '14px',
        }}>
          {/* Floral Corner Accents */}
          <div style={{ position: 'absolute', top: '10px', right: '14px', fontSize: '1.2rem', pointerEvents: 'none', opacity: 0.9 }}>
            🌸🌿
          </div>
          <div style={{ position: 'absolute', top: '10px', left: '14px', fontSize: '1.2rem', pointerEvents: 'none', opacity: 0.9 }}>
            🌺🍃
          </div>

          <div style={{ padding: '22px 20px 18px' }}>
            {/* Header Status Badge */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontSize: '18px',
                marginBottom: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}>
                <i className="fa-solid fa-check"></i>
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                M&M's Artsy Shop
              </div>

              <h1 style={{
                fontFamily: 'Georgia, "Playfair Display", serif',
                fontStyle: 'italic',
                fontSize: '1.75rem',
                fontWeight: '700',
                color: '#BE123C',
                margin: '0 0 2px',
                letterSpacing: '-0.01em',
              }}>
                Order Receipt
              </h1>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                Thank you, <strong>{order.customer_name}</strong>!
              </p>
            </div>

            {/* Key Info Grid: Reference Code & Schedule */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: '#FAF5EF',
              border: '1px solid #EFE4D6',
              borderRadius: '14px',
              padding: '10px 12px',
              marginBottom: '14px',
              textAlign: 'center',
            }}>
              <div style={{ minWidth: 0, paddingRight: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Reference No</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', maxWidth: '100%' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '900', fontFamily: 'monospace', color: '#C2410C', whiteSpace: 'nowrap' }}>#{order.reference_code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(order.reference_code);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('likha_toast', {
                            detail: {
                              type: 'success',
                              title: 'Reference Copied! 📋',
                              message: order.reference_code,
                              duration: 2500,
                            },
                          })
                        );
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#C2410C', fontSize: '11px', cursor: 'pointer', padding: '2px', opacity: 0.85, flexShrink: 0 }}
                    title="Copy Reference"
                  >
                    <i className="fa-regular fa-copy"></i>
                  </button>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #E5DFD5', minWidth: 0, paddingLeft: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>Target Schedule</span>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0F172A', whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formattedSchedule || 'As crafted'}</span>
              </div>
            </div>

            {/* Messenger Action Card (Formal & Compact) */}
            <div style={{
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '14px',
              textAlign: 'center',
            }}>
              <button
                type="button"
                onClick={handleOpenMessenger}
                className="btn btn-primary ripple"
                id="messenger-btn"
                style={{
                  background: 'linear-gradient(135deg, #0866FF 0%, #0052CC 100%)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  borderRadius: '999px',
                  boxShadow: '0 4px 12px rgba(8, 102, 255, 0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '17px' }} />
                <span>Send Order to Messenger</span>
              </button>

              <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#3B82F6', fontWeight: '600' }}>
                Open Messenger to confirm your order with seller.
              </div>

              {copiedReceipt && (
                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#059669', fontWeight: '700' }}>
                  ✓ Receipt copied to clipboard
                </div>
              )}
            </div>

            {/* Ruled Separator Line */}
            <div style={{ borderTop: '2px dashed #EFE4D6', margin: '0 -20px 14px' }} />

            {/* Order Summary Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Summary</span>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#C2410C', background: '#FFF1F2', padding: '2px 8px', borderRadius: '999px', border: '1px solid #FECDD3' }}>
                {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Items List (Ruled Notebook Line Aesthetic) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {order.order_items?.map((item, i) => {
                const formattedOpts = item.order_item_options
                  ?.filter(Boolean)
                  .map((o) => o?.option_value || o?.optionValue)
                  .filter((val) => Boolean(val) && val.trim().toLowerCase() !== (item.product_name || '').trim().toLowerCase())
                  .join(' · ');

                return (
                  <div key={i} style={{ borderBottom: '1px dashed #F3EAD8', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '12px', minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '0.86rem', color: '#0F172A' }}>
                          {item.product_name} {item.quantity > 1 && <span style={{ color: '#C2410C' }}>×{item.quantity}</span>}
                        </div>
                        {formattedOpts && (
                          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>{formattedOpts}</div>
                        )}
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '0.86rem', color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Breakdown */}
            <div style={{ borderTop: '1.5px solid #EFE4D6', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.81rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>{formatCurrency(order.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Delivery Fee</span>
                <span style={{ fontWeight: '700', color: '#0F172A' }}>{order.order_type === 'pickup' ? 'Free (Pickup)' : formatCurrency(order.delivery_fee)}</span>
              </div>
              {rushFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#C2410C', fontWeight: '700' }}>
                  <span>Rush Fee</span>
                  <span>+{formatCurrency(rushFee)}</span>
                </div>
              )}
              {order.voucher_discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: '700' }}>
                  <span>Voucher Discount</span>
                  <span>-{formatCurrency(order.voucher_discount)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                marginTop: '2px',
                borderTop: '2px dashed #E2E8F0',
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#0F172A' }}>Total Amount</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#E05638' }}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
          {/* Preview & Save Receipt Button */}
          <button
            type="button"
            onClick={handleOpenReceiptPreview}
            disabled={isGeneratingReceipt}
            className="btn btn-primary no-print"
            id="download-receipt-btn"
            style={{
              height: '46px',
              fontSize: '13.5px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <i className={isGeneratingReceipt ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-receipt'}></i>
            <span>{isGeneratingReceipt ? 'Loading Receipt...' : 'Save Order Receipt'}</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
            <Link
              href={`/track?ref=${encodeURIComponent(order.reference_code || effectiveCode)}`}
              className="btn btn-secondary no-print"
              id="track-order-btn"
              style={{
                height: '42px',
                fontSize: '12.5px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                borderRadius: 'var(--radius-lg)',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <i className="fa-solid fa-truck-fast"></i>
              <span>Track Order</span>
            </Link>

            <Link
              href="/shop"
              className="btn btn-secondary no-print"
              id="continue-shopping-btn"
              style={{
                height: '42px',
                fontSize: '12.5px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                borderRadius: 'var(--radius-lg)',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <i className="fa-solid fa-bag-shopping"></i>
              <span>Shop More</span>
            </Link>
          </div>
        </div>
      </main>

      {/* ── E-RECEIPT IMAGE PREVIEW MODAL ── */}
      {showPreviewModal && previewImageUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setShowPreviewModal(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>Order Receipt</h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body - Generated Image */}
            <div style={{ padding: '16px', overflowY: 'auto', background: '#F8FAFC', textAlign: 'center' }}>
              <img
                src={previewImageUrl}
                alt="Order Receipt"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '14px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E2E8F0',
                }}
              />
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={handleDownloadReceiptImage}
                className="btn btn-primary"
                style={{ width: '100%', height: '44px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '12px', background: '#EA580C', borderColor: '#EA580C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-download"></i>
                <span>Save to Device</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
