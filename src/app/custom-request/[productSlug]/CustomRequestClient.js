'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { getProductCustomOrderTemplate, getProductCustomOrderMessengerUrl } from '@/lib/constants/customPrompts';
import { openMessengerDirect } from '@/lib/utils/browserNav';

export default function CustomRequestClient({ product }) {
  const prodName = product?.name || 'Custom Handmade Craft';
  const template = getProductCustomOrderTemplate(product);
  const messengerUrl = getProductCustomOrderMessengerUrl(product);

  useEffect(() => {
    // Attempt automatic redirect to Facebook Messenger with product template
    const timer = setTimeout(() => {
      openMessengerDirect(template);
    }, 400);

    return () => clearTimeout(timer);
  }, [template]);

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 140px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8) var(--space-6)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        {/* Product Preview if Available */}
        {product && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              background: 'var(--color-surface-warm)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 14px',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            {product.product_photos?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.product_photos[0].url}
                alt={prodName}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  background: '#ffffff',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Custom Peg Request
              </p>
              <p style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--color-text)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {prodName}
              </p>
            </div>
          </div>
        )}

        {/* Messenger Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0084FF 0%, #00C6FF 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            boxShadow: '0 8px 20px rgba(0, 132, 255, 0.25)',
          }}
        >
          <i className="fa-brands fa-facebook-messenger"></i>
        </div>

        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: '0 0 6px 0',
            }}
          >
            Opening Messenger...
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            Lahat ng custom handcrafted orders at special requests ay direkta po nating pag-uusapan sa official Facebook Messenger ng <strong>M&amp;M Artsy</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => openMessengerDirect(template)}
            className="btn btn-primary ripple"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-full)',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#0084FF',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '16px' }}></i>
            <span>Open Messenger Now</span>
          </button>

          <Link
            href={product?.slug ? `/shop/${product.slug}` : '/shop'}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: '500',
              marginTop: '4px',
            }}
          >
            &larr; Back to {product?.name ? 'Product' : 'Shop'}
          </Link>
        </div>
      </div>
    </div>
  );
}
