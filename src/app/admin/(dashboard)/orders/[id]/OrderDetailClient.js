'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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

  // Sync with localStorage on mount
  useEffect(() => {
    try {
      const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
      const found = localPlaced.find(
        (o) => o.id === initialOrder.id || o.reference_code === initialOrder.id || o.reference_code === initialOrder.reference_code
      );
      if (found) {
        setOrder(found);
        setStatus((found.status === 'pending' || found.status === 'for_confirmation') ? 'confirmed' : found.status);
      }
    } catch {}
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
            grid-template-columns: minmax(0, 1.55fr) minmax(340px, 1fr);
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
            {initialOrder.reference_code}
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
                Order #{initialOrder.reference_code}
              </h1>
              {getStatusBadge(status)}
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-regular fa-clock" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}></i>
              <span>Placed {formatRelative(initialOrder.created_at)} ({formatDate(initialOrder.created_at)})</span>
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
            <div>
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
                  {initialOrder.order_items?.length || 0} {initialOrder.order_items?.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Clean Items List */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {initialOrder.order_items?.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: idx < initialOrder.order_items.length - 1 ? '1px solid var(--color-border-light)' : 'none',
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
                ))}
              </div>
            </div>

            {/* Integrated Financial Summary */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(initialOrder.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span>Fulfillment Fee</span>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{formatCurrency(initialOrder.delivery_fee)}</span>
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
                <span style={{ color: 'var(--color-primary)', fontSize: '18px' }}>{formatCurrency(initialOrder.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Fulfillment Details */}
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
            <div>
              <h3 style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
                <i className="fa-solid fa-user" style={{ color: 'var(--color-primary)', fontSize: '13px' }}></i>
                <span>Customer & Fulfillment</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Customer Name */}
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>
                    Customer Name
                  </span>
                  <p style={{ fontWeight: '800', fontSize: '15px', color: 'var(--color-text)', margin: 0 }}>
                    {initialOrder.customer_name}
                  </p>
                </div>

                {/* Fulfillment Method */}
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>
                    Fulfillment Method
                  </span>
                  <p style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <i className={initialOrder.order_type === 'delivery' ? 'fa-solid fa-motorcycle' : 'fa-solid fa-store'} style={{ color: 'var(--color-primary)' }}></i>
                    <span>{initialOrder.order_type === 'delivery' ? 'Door-to-door Delivery' : 'In-Studio Pickup'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Address Details or Studio Pickup Info Tile */}
            <div style={{ marginTop: '16px' }}>
              {initialOrder.order_type === 'delivery' && initialOrder.delivery_location ? (
                <div style={{ background: 'var(--color-surface-warm, #FAF6F0)', padding: '14px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: 'var(--color-primary)' }}></i>
                      <span>Delivery Address</span>
                    </span>
                    {initialOrder.delivery_location.latitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${initialOrder.delivery_location.latitude},${initialOrder.delivery_location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 9px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px', fontWeight: '700' }}
                      >
                        <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--color-primary)' }}></i>
                        <span>Maps</span>
                      </a>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px', lineHeight: 1.4 }}>
                    {initialOrder.delivery_location.address}
                  </p>
                  {initialOrder.delivery_location.landmark_notes && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>Landmark: </span>
                      {initialOrder.delivery_location.landmark_notes}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ background: 'var(--color-surface-warm, #FAF6F0)', padding: '14px', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-store" style={{ color: 'var(--color-primary)' }}></i>
                      <span>Studio Pickup Station</span>
                    </span>
                    <span style={{
                      background: 'rgba(22, 163, 74, 0.1)',
                      color: '#16A34A',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '2px 7px',
                      borderRadius: '6px',
                    }}>
                      In Studio
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 2px' }}>
                    M&M Artsy Crafts Studio
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Carigara, Leyte • Studio Pickup
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Customer Note Card (Uniform & Balanced Across the Whole Container) */}
      {initialOrder.notes && (
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
            &ldquo;{initialOrder.notes}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
