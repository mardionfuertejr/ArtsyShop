'use client';

import { useState } from 'react';
import Link from 'next/link';
import { triggerToast, clearToast } from '@/components/common/GlobalToast';

export default function ToastPreviewPage() {
  const SAMPLE_TOASTS = [
    {
      id: 'cart-standard',
      message: 'Flower Bouquet added to cart ✨',
      photo: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
      type: 'cart',
      quantity: 1,
      actionLabel: 'View Cart',
      actionUrl: '/cart',
      badgeColor: '#EA580C',
      badgeBg: '#FFF4EE',
    },
    {
      id: 'cart-qty',
      message: 'Flower Mirror updated in cart ✨',
      photo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      type: 'cart',
      quantity: 2,
      actionLabel: 'View Cart',
      actionUrl: '/cart',
      badgeColor: '#B45309',
      badgeBg: '#FEF3C7',
    },
    {
      id: 'warning-option',
      message: 'Please select Color / Theme first ✨',
      photo: null,
      type: 'warning',
      quantity: null,
      actionLabel: null,
      actionUrl: null,
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
    },
    {
      id: 'warning-stock',
      message: 'Only 8 items available in stock 🌿',
      photo: null,
      type: 'warning',
      quantity: null,
      actionLabel: null,
      actionUrl: null,
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
    },
    {
      id: 'success-general',
      message: 'Order #MM-8842 placed successfully! 🎉',
      photo: null,
      type: 'success',
      quantity: null,
      actionLabel: 'Track',
      actionUrl: '/track',
      badgeColor: '#059669',
      badgeBg: '#DCFCE7',
    },
    {
      id: 'info-general',
      message: 'Preparing pre-filled message for Messenger... 💬',
      photo: null,
      type: 'info',
      quantity: null,
      actionLabel: null,
      actionUrl: null,
      badgeColor: '#0284C7',
      badgeBg: '#E0F2FE',
    },
    {
      id: 'error-general',
      message: 'This item is currently out of stock 🚫',
      photo: null,
      type: 'error',
      quantity: null,
      actionLabel: null,
      actionUrl: null,
      badgeColor: '#DC2626',
      badgeBg: '#FEE2E2',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg, #FAF6F0)',
      padding: '24px 16px 80px',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      color: '#1E293B',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          background: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: '1px solid #E2E8F0',
        }}>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--color-text, #1E293B)' }}>
              🔔 Toast Notification Gallery (English)
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Clean, rounded-rectangle, 1-line direct feedback
            </p>
          </div>
          <Link
            href="/shop"
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--color-primary, #EA580C)',
              background: '#FFF4EE',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            ← Shop
          </Link>
        </header>

        {/* Quick Trigger Controls Card */}
        <div style={{
          background: '#FFFFFF',
          padding: '18px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: '1px solid #E2E8F0',
        }}>
          <h2 style={{ fontSize: '13.5px', fontWeight: '700', margin: '0 0 12px' }}>
            ⚡ Instant Test Buttons
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => triggerToast({
                message: 'Flower Bouquet added to cart ✨',
                photo: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
                type: 'cart',
                quantity: 1,
              })}
              style={{
                background: '#FFF4EE',
                border: '1.5px solid #EA580C',
                color: '#EA580C',
                padding: '9px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🛒 Cart Toast
            </button>

            <button
              type="button"
              onClick={() => triggerToast({
                message: 'Please select Color / Theme first ✨',
                type: 'warning',
              })}
              style={{
                background: '#FEF3C7',
                border: '1.5px solid #D97706',
                color: '#D97706',
                padding: '9px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ⚠️ Warning Toast
            </button>

            <button
              type="button"
              onClick={() => triggerToast({
                message: 'Order #MM-8842 placed successfully! 🎉',
                type: 'success',
                actionLabel: 'Track',
                actionUrl: '/track',
              })}
              style={{
                background: '#DCFCE7',
                border: '1.5px solid #10B981',
                color: '#059669',
                padding: '9px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✅ Success Toast
            </button>

            <button
              type="button"
              onClick={() => triggerToast({
                message: 'This item is currently out of stock 🚫',
                type: 'error',
              })}
              style={{
                background: '#FEE2E2',
                border: '1.5px solid #EF4444',
                color: '#DC2626',
                padding: '9px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ❌ Error Toast
            </button>
          </div>

          <div style={{ marginTop: '10px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={clearToast}
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Clear Toast
            </button>
          </div>
        </div>

        {/* Visual Showcase Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '14.5px', fontWeight: '800', margin: 0 }}>
            📋 Live 1-Line Variations
          </h2>

          {SAMPLE_TOASTS.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '800',
                  color: item.badgeColor,
                  background: item.badgeBg,
                  padding: '2.5px 7px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}>
                  {item.type}
                </span>

                <button
                  type="button"
                  onClick={() => triggerToast({
                    message: item.message,
                    photo: item.photo,
                    type: item.type,
                    quantity: item.quantity,
                    actionLabel: item.actionLabel,
                    actionUrl: item.actionUrl,
                  })}
                  style={{
                    background: item.badgeColor,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ▶ Test Live
                </button>
              </div>

              {/* Static Preview Card */}
              <div style={{
                background: '#FAF6F0',
                padding: '10px',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
                display: 'flex',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '12px',
                  border: `1.5px solid ${item.type === 'cart' ? 'rgba(234, 88, 12, 0.32)' : item.type === 'warning' ? 'rgba(217, 119, 6, 0.38)' : item.type === 'success' ? 'rgba(16, 185, 129, 0.38)' : item.type === 'error' ? 'rgba(239, 68, 68, 0.38)' : 'rgba(14, 165, 233, 0.38)'}`,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                  padding: '7px 10px 7px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  maxWidth: '380px',
                  width: '100%',
                }}>
                  {/* Media / Icon */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photo} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: item.type === 'warning' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : item.type === 'success' ? 'linear-gradient(135deg, #10B981, #059669)' : item.type === 'error' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                      }}>
                        <i className={`fa-solid ${item.type === 'warning' ? 'fa-triangle-exclamation' : item.type === 'success' ? 'fa-circle-check' : item.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}`} />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.message}
                    </span>
                    {item.quantity && item.quantity > 1 && (
                      <span style={{ fontSize: '9.5px', fontWeight: '700', background: '#FEF3C7', color: '#B45309', padding: '1px 5px', borderRadius: '6px', flexShrink: 0 }}>
                        +{item.quantity}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  {item.actionLabel && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      background: '#FFF5F2',
                      color: '#EA580C',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      border: '1px solid rgba(234, 88, 12, 0.22)',
                      flexShrink: 0,
                    }}>
                      <span>{item.actionLabel}</span>
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: '8.5px' }} />
                    </span>
                  )}

                  {/* Close */}
                  <span style={{ color: '#94A3B8', fontSize: '11px', padding: '2px', cursor: 'pointer' }}>
                    <i className="fa-solid fa-xmark" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
