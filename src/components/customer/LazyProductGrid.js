'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { FUN_CUSTOM_PROMPTS, getRandomCustomPrompt, getPromptMessengerUrl, CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';

export default function LazyProductGrid({ products = [], initialCount = 10, batchSize = 10 }) {
  const [items, setItems] = useState(products);
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prompt, setPrompt] = useState(FUN_CUSTOM_PROMPTS[0]);

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
              merged[idx] = { ...merged[idx], ...p };
            } else {
              merged.unshift(p);
            }
          }
          setItems(merged);
          return;
        }
      }
    } catch {}
    setItems(products);
  }, [products]);

  // Pick a random fun prompt on mount
  useEffect(() => {
    setPrompt(getRandomCustomPrompt());
  }, []);

  // Reset count if items list changes
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items, initialCount]);

  const visibleProducts = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const remainingCount = items.length - visibleProducts.length;
  const progressPercent = Math.min(100, Math.round((visibleProducts.length / (items.length || 1)) * 100));

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Add small tactile delay for realistic smoothness
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      setIsLoadingMore(false);
    }, 280);
  };

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
              animationDelay: `${(idx % batchSize) * 55}ms`,
            }}
          />
        ))}
      </div>

      {/* Bottom Controls / Status Area */}
      <div style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        {hasMore ? (
          <>
            {/* Minimalist Progress Indicator */}
            <div style={{ width: '100%', maxWidth: '240px', textAlign: 'center' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                fontWeight: 'var(--weight-medium)',
                color: 'var(--color-text-secondary)',
                marginBottom: '5px',
              }}>
                <span>Showing {visibleProducts.length} of {products.length} products</span>
                <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>{progressPercent}%</span>
              </div>
              <div style={{
                height: '3.5px',
                background: 'var(--color-border-light)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>
            </div>

            {/* Load More Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm ripple"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              id="load-more-products-btn"
              style={{
                padding: '9px 24px',
                borderRadius: '999px',
                fontWeight: 'var(--weight-semibold)',
                fontSize: '12.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {isLoadingMore ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--color-primary)' }}></i>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Load More</span>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 'var(--weight-bold)',
                    background: 'var(--color-surface-warm)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}>
                    +{Math.min(batchSize, remainingCount)}
                  </span>
                  <i className="fa-solid fa-arrow-down" style={{ fontSize: '11px', color: 'var(--color-primary)' }}></i>
                </>
              )}
            </button>
          </>
        ) : (
          /* Elegant Minimal End of Collection Signature Marker */
          products.length > 3 && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '8px' }}>
              <div className="collection-end-marker">
                <div className="end-marker-line" />
                <div className="end-marker-content">
                  <span>All <strong>{products.length}</strong> products loaded</span>
                </div>
                <div className="end-marker-line" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
