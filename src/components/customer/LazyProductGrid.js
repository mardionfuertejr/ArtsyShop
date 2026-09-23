'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { FUN_CUSTOM_PROMPTS, getRandomCustomPrompt, CUSTOM_ORDER_MESSENGER_URL, CUSTOM_ORDER_TEMPLATE } from '@/lib/constants/customPrompts';
import { openMessengerDirect } from '@/lib/utils/browserNav';

export default function LazyProductGrid({ products = [], initialCount = 12, batchSize = 12 }) {
  const [items, setItems] = useState(products);
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTargetRef = useRef(null);

  const sortStorefront = (a, b) => {
    const aSold = Boolean(a.is_sold_out || (a.is_ready_made && a.ready_made_stock === 0));
    const bSold = Boolean(b.is_sold_out || (b.is_ready_made && b.ready_made_stock === 0));
    if (aSold && !bSold) return 1;
    if (!aSold && bSold) return -1;

    const aSale = Boolean(a.is_on_sale && a.sale_price);
    const bSale = Boolean(b.is_on_sale && b.sale_price);
    if (aSale && !bSale) return -1;
    if (!aSale && bSale) return 1;

    const aBest = Boolean(a.is_bestseller);
    const bBest = Boolean(b.is_bestseller);
    if (aBest && !bBest) return -1;
    if (!aBest && bBest) return 1;

    const aReady = Boolean(a.is_ready_made);
    const bReady = Boolean(b.is_ready_made);
    if (aReady && !bReady) return -1;
    if (!aReady && bReady) return 1;

    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  };

  // Merge custom products / updates on mount or props change
  useEffect(() => {
    try {
      const local = localStorage.getItem('likha_custom_products');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...products];
          for (const p of parsed) {
            const idx = merged.findIndex((m) => m.id === p.id || m.slug === p.slug);
            if (idx >= 0) {
              merged[idx] = { ...p, ...merged[idx] };
            } else {
              merged.unshift(p);
            }
          }
          setItems(merged.sort(sortStorefront));
          return;
        }
      }
    } catch {}
    setItems([...products].sort(sortStorefront));
  }, [products]);

  // Reset count if items list changes
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items, initialCount]);

  const visibleProducts = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadNextBatch = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      setIsLoadingMore(false);
    }, 150);
  }, [hasMore, isLoadingMore, batchSize, items.length]);

  // ── Shopee-style Automatic Infinite Scroll Observer ──
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextBatch();
        }
      },
      {
        root: null,
        rootMargin: '300px', // Pre-load 300px before user even reaches bottom for 0ms lag
        threshold: 0.05,
      }
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loadNextBatch]);

  if (!items || items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--page-padding)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-warm)',
          border: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary)',
          fontSize: '1.35rem',
          marginBottom: 'var(--space-3)',
        }}>
          <i className="fa-solid fa-box-open" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px 0' }}>
          No products in this category yet
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0', maxWidth: '280px', lineHeight: '1.4' }}>
          Browse our complete catalog or request a personalized handmade creation.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/shop"
            className="btn btn-primary btn-sm ripple"
            style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '12.5px', fontWeight: '600' }}
          >
            View All Products
          </Link>
          <a
            href={CUSTOM_ORDER_MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              openMessengerDirect(CUSTOM_ORDER_TEMPLATE);
            }}
            className="btn btn-secondary btn-sm ripple"
            style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '12.5px', fontWeight: '600' }}
          >
            Custom Order
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="lazy-product-grid-container">
      <div className="product-grid">
        {visibleProducts.map((p, idx) => (
          <ProductCard
            key={p.id}
            product={p}
            className="product-card-reveal"
            style={{
              animationDelay: `${(idx % batchSize) * 45}ms`,
            }}
          />
        ))}
      </div>

      {/* ── Automatic Infinite Scroll Sentinel Trigger ── */}
      {hasMore && (
        <div
          ref={observerTargetRef}
          style={{
            width: '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '12px',
          }}
        >
          {isLoadingMore && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border-light, #E2E8F0)',
              color: 'var(--color-primary, #EA580C)',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Loading more crafts...</span>
            </div>
          )}
        </div>
      )}

      {/* ── End of Collection Marker (Subtle & Clean) ── */}
      {!hasMore && items.length > 4 && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            maxWidth: '320px',
            margin: '20px auto 8px',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: 'var(--color-border-light, #E2E8F0)' }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #94A3B8)', fontWeight: '600', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
            All {items.length} items loaded ✨
          </span>
          <span style={{ flex: 1, height: '1px', background: 'var(--color-border-light, #E2E8F0)' }} />
        </div>
      )}
    </div>
  );
}
