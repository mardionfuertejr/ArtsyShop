'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PRODUCTS } from '@/lib/mockData';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';
import { resolveProductPhoto } from '@/lib/utils/productImage';

const QUICK_SEARCH_SUGGESTIONS = ['Bouquet', 'Mirror', 'Keychain', 'Rose', 'Tulip'];

export default function HeaderSearchBar() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load products for live matching
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      let loaded = MOCK_PRODUCTS;
      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('products')
            .select(`
              id, name, slug, base_price, sale_price, sale_tag, is_on_sale, is_ready_made, ready_made_stock, is_sold_out, is_bestseller, description, is_available,
              category:categories(id, name, slug),
              product_photos(url, storage_path, is_cover, display_order)
            `)
            .eq('is_available', true);

          if (!error && data && data.length > 0) {
            loaded = data;
          }
        }
      } catch {}

      try {
        if (typeof window !== 'undefined') {
          const deletedIds = JSON.parse(localStorage.getItem('likha_deleted_products') || '[]');
          const localProds = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');

          const map = new Map();
          (loaded || []).forEach((p) => {
            if (p && !deletedIds.includes(p.id) && p.is_available !== false) {
              const key = String(p.id || p.slug || '').trim();
              if (key) map.set(key, p);
            }
          });

          if (Array.isArray(localProds) && localProds.length > 0) {
            localProds.forEach((p) => {
              if (p && !deletedIds.includes(p.id) && p.is_available !== false) {
                const key = String(p.id || p.slug || '').trim();
                if (key) {
                  if (map.has(key)) {
                    map.set(key, { ...map.get(key), ...p });
                  } else {
                    map.set(key, p);
                  }
                }
              }
            });
          }
          loaded = Array.from(map.values()).filter((p) => !deletedIds.includes(p.id) && p.is_available !== false);
        }
      } catch {}

      if (isMounted) {
        setProducts(loaded);
      }
    }

    loadProducts();

    window.addEventListener('likha_products_updated', loadProducts);
    window.addEventListener('storage', loadProducts);

    return () => {
      isMounted = false;
      window.removeEventListener('likha_products_updated', loadProducts);
      window.removeEventListener('storage', loadProducts);
    };
  }, []);

  // Handle outside click & escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsExpanded(false);
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // Auto-focus input on expand
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Clean, fast matching: Name + Category + Price
  const matchedProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const numericQuery = parseFloat(q.replace(/[^0-9.]/g, ''));
    const isPriceSearch = !isNaN(numericQuery) && numericQuery > 0;

    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const catMatch = p.category?.name?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);

      let priceMatch = false;
      const basePrice = Number(p.base_price || 0);
      const salePrice = Number(p.sale_price || basePrice);
      const effectivePrice = p.is_on_sale && salePrice ? salePrice : basePrice;

      if (isPriceSearch) {
        const priceStr = Math.round(effectivePrice).toString();
        const rawBaseStr = Math.round(basePrice).toString();
        if (priceStr.includes(Math.round(numericQuery).toString()) || rawBaseStr.includes(Math.round(numericQuery).toString())) {
          priceMatch = true;
        }
      }

      return nameMatch || catMatch || descMatch || priceMatch;
    });
  }, [query, products]);

  const searchResults = useMemo(() => {
    return matchedProducts.slice(0, 5);
  }, [matchedProducts]);

  const handleOpenSearch = () => {
    setIsExpanded(true);
    setIsOpen(true);
  };

  const handleCloseOrClear = (e) => {
    e?.stopPropagation?.();
    setQuery('');
    setIsOpen(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const handleFormSubmit = (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;
    setIsOpen(false);
    setIsExpanded(false);
    router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectSuggestion = (tag) => {
    setQuery(tag);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const matchCount = matchedProducts.length;

  return (
    <>
      {/* Background Dim Backdrop */}
      {isExpanded && (
        <div
          className="header-search-backdrop"
          onClick={handleCloseOrClear}
          aria-label="Close search overlay"
        />
      )}

      {/* Search Bar Wrapper */}
      <div
        ref={containerRef}
        className={`header-search-anchor ${isExpanded ? 'is-active' : ''}`}
      >
        <div className={`header-search-container ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
          <form onSubmit={handleFormSubmit} className="header-search-form">
            <button
              type="button"
              className="header-search-btn"
              onClick={handleOpenSearch}
              aria-label="Search items"
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>

            <input
              ref={inputRef}
              type="text"
              className="header-search-input"
              placeholder="Search products, categories..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                setIsExpanded(true);
                setIsOpen(true);
              }}
              aria-label="Search items"
            />

            {/* Clear / Close Button */}
            {isExpanded && (
              <button
                type="button"
                className="header-search-clear-btn"
                onClick={handleCloseOrClear}
                title="Close search"
                aria-label="Close search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Results & Suggestions Dropdown */}
          {isExpanded && isOpen && (
            <div className="header-search-dropdown">
              {query.trim().length > 0 ? (
                <>
                  {/* Header count */}
                  <div className="header-search-dropdown-header">
                    <span className="header-search-count-label">
                      {matchCount > 0
                        ? `${matchCount} ${matchCount === 1 ? 'item found' : 'items found'}`
                        : 'No matches found'}
                    </span>
                    <button
                      type="button"
                      className="header-search-dropdown-close"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close dropdown"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Results List */}
                  <div className="header-search-results-list">
                    {searchResults.length > 0 ? (
                      searchResults.map((prod) => (
                        <Link
                          key={prod.id}
                          href={`/shop/${prod.slug}`}
                          className="header-search-item"
                          onClick={() => {
                            setIsOpen(false);
                            setIsExpanded(false);
                            setQuery('');
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="header-search-thumb-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveProductPhoto(prod)}
                              alt={prod.name}
                              className="header-search-thumb"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          </div>

                          {/* Info: Name & Category */}
                          <div className="header-search-info">
                            <p className="header-search-name">{prod.name}</p>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>
                              {prod.category?.name || 'Handcrafted Craft'}
                            </span>
                          </div>

                          {/* Price Column */}
                          <div className="header-search-price-box">
                            <span className="header-search-price">
                              {formatCurrencyCompact(prod.is_on_sale && prod.sale_price ? prod.sale_price : prod.base_price)}
                            </span>
                            {prod.is_on_sale && prod.sale_price && (
                              <span className="header-search-old-price">
                                {formatCurrencyCompact(prod.base_price)}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="header-search-empty" style={{ padding: '20px 16px', textAlign: 'center' }}>
                        <p style={{ fontWeight: '700', margin: '0 0 6px 0', fontSize: '13.5px', color: '#0F172A' }}>
                          No results for &ldquo;{query}&rdquo;
                        </p>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px 0' }}>
                          Try searching for popular craft tags below:
                        </p>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {QUICK_SEARCH_SUGGESTIONS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleSelectSuggestion(tag)}
                              style={{
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '14px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {matchCount > 0 && (
                    <div className="header-search-dropdown-footer">
                      <button
                        type="button"
                        className="header-search-view-all-btn"
                        onClick={handleFormSubmit}
                      >
                        <span>View all {matchCount} results in Shop</span>
                        <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Quick Search Suggestions when query is empty */
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Popular Searches
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {QUICK_SEARCH_SUGGESTIONS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectSuggestion(tag)}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '14px',
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '9px', color: '#94A3B8' }} />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
