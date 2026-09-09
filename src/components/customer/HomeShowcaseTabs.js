'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import { FUN_CUSTOM_PROMPTS, getRandomCustomPrompt, getPromptMessengerUrl } from '@/lib/constants/customPrompts';

export default function HomeShowcaseTabs({ allProducts = [] }) {
  const [activeTab, setActiveTab] = useState('bestsellers'); // 'bestsellers' | 'on-hand' | 'deals'
  const [prompt, setPrompt] = useState(FUN_CUSTOM_PROMPTS[0]);

  // Pick a random fun prompt on mount
  useEffect(() => {
    setPrompt(getRandomCustomPrompt());
  }, []);

  // Filter products by tab
  const bestsellers = allProducts.filter((p) => p.is_bestseller).slice(0, 6);
  const onHand = allProducts.filter((p) => p.is_ready_made && !p.is_sold_out).slice(0, 6);
  const deals = allProducts.filter((p) => p.is_on_sale).slice(0, 6);

  // Fallback if empty
  const displayedProducts =
    activeTab === 'bestsellers'
      ? (bestsellers.length > 0 ? bestsellers : allProducts.slice(0, 6))
      : activeTab === 'on-hand'
        ? (onHand.length > 0 ? onHand : allProducts.filter((p) => p.is_ready_made).slice(0, 6))
        : (deals.length > 0 ? deals : allProducts.slice(0, 4));

  const seeAllHref = activeTab === 'on-hand' ? '/shop?category=ready-made' : '/shop';

  return (
    <section className="section" aria-label="Curated showcase" style={{ paddingTop: 'var(--space-2)' }}>
      {/* Header & Mode Switcher - 100% Consistent with Shop Category Pills */}
      <div className="showcase-header-row">
        <div className="category-tabs" style={{ padding: 0, margin: 0, gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('bestsellers')}
            className={`category-tab${activeTab === 'bestsellers' ? ' active' : ''}`}
          >
            Bestsellers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('on-hand')}
            className={`category-tab${activeTab === 'on-hand' ? ' active' : ''}`}
          >
            On-Hand
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deals')}
            className={`category-tab${activeTab === 'deals' ? ' active' : ''}`}
          >
            Promos
          </button>
        </div>

        <Link
          href={seeAllHref}
          className="showcase-see-all-btn"
        >
          <span>See all</span>
          <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }}></i>
        </Link>
      </div>

      {/* Product Grid with Smooth Stagger Transitions */}
      {displayedProducts.length > 0 ? (
        <>
          <div key={activeTab} className="product-grid">
            {displayedProducts.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                className="product-card-reveal"
                style={{
                  animationDelay: `${idx * 40}ms`,
                }}
              />
            ))}
          </div>

          {/* Smart End-of-Showcase Custom Invite */}
          <div className="smart-custom-invite">
            <h4 className="smart-custom-invite-title">{prompt.title}</h4>
            <p className="smart-custom-invite-subtitle">{prompt.subtitle}</p>
            <a
              href={getPromptMessengerUrl(prompt)}
              target="_blank"
              rel="noopener noreferrer"
              className="smart-custom-invite-btn"
              id="home-smart-custom-btn"
            >
              <span>{prompt.buttonText}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }}></i>
            </a>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            No items in this section right now.
          </p>
        </div>
      )}
    </section>
  );
}
