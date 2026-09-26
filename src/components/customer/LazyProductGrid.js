'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { CUSTOM_ORDER_MESSENGER_URL, CUSTOM_ORDER_TEMPLATE } from '@/lib/constants/customPrompts';
import { openMessengerDirect } from '@/lib/utils/browserNav';

export default function LazyProductGrid({ products = [], initialCount = 12, batchSize = 12 }) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observerTargetRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Smoothly reset visible count whenever category or search filter changes
  useEffect(() => {
    setVisibleCount(initialCount);
    isFetchingRef.current = false;
    setIsLoadingMore(false);
  }, [products, initialCount]);

  // Track window scroll for the floating "Back to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalCount = products.length;
  const displayedCount = Math.min(visibleCount, totalCount);
  const hasMore = displayedCount < totalCount;
  const visibleProducts = products.slice(0, displayedCount);

  // Automatic seamless batch expansion
  const loadNextBatch = useCallback(() => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    // Micro-delay ensures the browser processes layout smoothly without UI stutter
    setTimeout(() => {
      setVisibleCount((prev) => {
        const next = Math.min(prev + batchSize, totalCount);
        isFetchingRef.current = false;
        setIsLoadingMore(false);
        return next;
      });
    }, 120);
  }, [hasMore, batchSize, totalCount]);

  // ── Automatic Infinite Scroll (Pre-loads 450px before bottom) ──
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
        rootMargin: '450px', // Seamless pre-fetching so user experiences 0ms waiting
        threshold: 0.01,
      }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loadNextBatch]);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-10) var(--page-padding)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-warm)',
          border: '1px solid var(--color-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary)',
          fontSize: '1.25rem',
          marginBottom: 'var(--space-3)',
        }}>
          <i className="fa-solid fa-box-open" />
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px 0' }}>
          No products in this category yet
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0', maxWidth: '280px', lineHeight: '1.4' }}>
          Browse our complete catalog to see all available creations.
        </p>
        <Link
          href="/shop"
          className="btn btn-primary btn-sm ripple"
          style={{ borderRadius: 'var(--radius-full)', padding: '8px 20px', fontSize: '12.5px', fontWeight: '600' }}
        >
          View All Products
        </Link>
      </div>
    );
  }

  return (
    <div className="lazy-product-grid-container" style={{ position: 'relative' }}>
      {/* Product Grid */}
      <div className="product-grid">
        {visibleProducts.map((p, idx) => {
          const isNewlyRevealed = idx >= initialCount;
          return (
            <ProductCard
              key={p.id || p.slug || idx}
              product={p}
              className={isNewlyRevealed ? 'checkout-slide-in' : 'product-card-reveal'}
              style={{
                animationDelay: isNewlyRevealed ? `${((idx - initialCount) % batchSize) * 30}ms` : `${(idx % batchSize) * 30}ms`,
              }}
            />
          );
        })}

        {/* Shimmer skeleton placeholders during quick continuous scrolling */}
        {hasMore && isLoadingMore && (
          <>
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ aspectRatio: '1/1', background: '#F8FAFC', borderRadius: '10px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
              <div style={{ height: '14px', width: '70%', background: '#F8FAFC', borderRadius: '4px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
              <div style={{ height: '12px', width: '40%', background: '#F8FAFC', borderRadius: '4px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ aspectRatio: '1/1', background: '#F8FAFC', borderRadius: '10px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
              <div style={{ height: '14px', width: '70%', background: '#F8FAFC', borderRadius: '4px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
              <div style={{ height: '12px', width: '40%', background: '#F8FAFC', borderRadius: '4px', animation: 'skeletonPulse 1.2s infinite ease-in-out' }} />
            </div>
          </>
        )}
      </div>

      {/* ── Seamless Auto-Scroll Sentinel Trigger ── */}
      {hasMore && (
        <div
          ref={observerTargetRef}
          style={{
            width: '100%',
            height: '24px',
            margin: '8px 0',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}

      {/* ── End of Collection Marker (When all products are shown) ── */}
      {!hasMore && totalCount > 4 && (
        <div className="collection-end-marker" style={{ margin: '28px auto 14px' }}>
          <div className="collection-end-line" />
          <div className="collection-end-badge">
            <i className="fa-solid fa-sparkles" style={{ color: 'var(--color-primary, #EA580C)' }}></i>
            <span>All {totalCount} items loaded</span>
          </div>
          <div className="collection-end-line" />
        </div>
      )}

      {/* ── Sleek Circular Floating "Back to Top" Button ── */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="floating-scroll-top-btn"
          title="Back to top"
          aria-label="Back to top"
        >
          <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
        </button>
      )}
    </div>
  );
}
