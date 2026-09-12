'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import CartIconBtn from '@/components/customer/CartIconBtn';
import { CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';

export default function CustomRequestPage() {
  useEffect(() => {
    // Attempt automatic redirect to Facebook Messenger
    const timer = setTimeout(() => {
      window.location.href = CUSTOM_ORDER_MESSENGER_URL;
    }, 400);

    return () => clearTimeout(timer);
  }, []);

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
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      {/* Main Content */}
      <main
        className="page-content page-enter"
        style={{
          minHeight: 'calc(100dvh - 124px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6) var(--space-4)',
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
              Redirecting to Messenger...
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              Para sa custom handcrafted orders at reference photos, direkta po tayong mag-uusap sa official Facebook Messenger ng <strong>M&amp;M Artsy</strong>.
            </p>
          </div>

          <a
            href={CUSTOM_ORDER_MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary ripple"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-full)',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#0084FF',
              color: '#ffffff',
              textDecoration: 'none',
              marginTop: 'var(--space-2)',
            }}
          >
            <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '16px' }}></i>
            Open Messenger Now
          </a>

          <Link
            href="/shop"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            &larr; Back to Shop Collection
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
