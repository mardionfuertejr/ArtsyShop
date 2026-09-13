'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MOCK_PRODUCTS } from '@/lib/mockData';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';

export default function HeaderSearchBar() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load all products for live instant matching
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
              id, name, slug, base_price, sale_price, is_on_sale, description,
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
          const localProds = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');
          if (Array.isArray(localProds) && localProds.length > 0) {
            const map = new Map();
            [...localProds, ...loaded].forEach((p) => map.set(p.id || p.slug, p));
            loaded = Array.from(map.values());
          }
        }
      } catch {}

      if (isMounted) {
        setProducts(loaded);
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle outside click & escape to collapse
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

  // Focus input on expand
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 90);
    }
  }, [isExpanded]);

  // Comprehensive matching: Name + Price + Description
  const matchedProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const numericQuery = parseFloat(q.replace(/[^0-9.]/g, ''));
    const isPriceSearch = !isNaN(numericQuery) && numericQuery > 0;

    return products.filter((p) => {
      // 1. Name match
      const nameMatch = p.name?.toLowerCase().includes(q);

      // 2. Description match
      const descMatch = p.description?.toLowerCase().includes(q);

      // 3. Category match
      const catMatch = p.category?.name?.toLowerCase().includes(q);

      // 4. Price match
      let priceMatch = false;
      const basePrice = Number(p.base_price || 0);
      const salePrice = Number(p.sale_price || basePrice);
      const effectivePrice = p.is_on_sale && salePrice ? salePrice : basePrice;

      if (isPriceSearch) {
        const priceStr = Math.round(effectivePrice).toString();
        const rawBaseStr = Math.round(basePrice).toString();
        if (priceStr.includes(Math.round(numericQuery).toString()) || rawBaseStr.includes(Math.round(numericQuery).toString())) {
          priceMatch = true;
        } else if (q.includes('<') || q.includes('under') || q.includes('below')) {
          priceMatch = effectivePrice <= numericQuery;
        }
      }

      return nameMatch || descMatch || catMatch || priceMatch;
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
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    setIsExpanded(false);
    router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const getProductImage = (p) => {
    const cover = p.product_photos?.find((ph) => ph.is_cover) || p.product_photos?.[0];
    if (cover?.url) return cover.url;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (cover?.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')) {
      return `${supabaseUrl}/storage/v1/object/public/product-photos/${cover.storage_path}`;
    }
    return 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';
  };

  // Whole-word clean snippet extractor (no broken word cutoffs)
  const getCleanSnippet = (product, q) => {
    const desc = (product.description || '').trim();
    if (!desc) return '';
    const lowerDesc = desc.toLowerCase();
    const cleanQ = (q || '').trim().toLowerCase();

    if (!cleanQ || !lowerDesc.includes(cleanQ)) {
      return desc.length > 70 ? desc.slice(0, 70).trim() + '...' : desc;
    }

    const matchIdx = lowerDesc.indexOf(cleanQ);

    // If match is near start, begin cleanly at index 0
    if (matchIdx <= 25) {
      return desc.length > 75 ? desc.slice(0, 75).trim() + '...' : desc;
    }

    // Find previous space to avoid cutting word in half
    const searchStart = Math.max(0, matchIdx - 20);
    const spaceBefore = desc.indexOf(' ', searchStart);
    const startIdx = spaceBefore !== -1 && spaceBefore < matchIdx ? spaceBefore + 1 : matchIdx;

    const endSearch = Math.min(desc.length, matchIdx + cleanQ.length + 40);
    const spaceAfter = desc.indexOf(' ', endSearch);
    const endIdx = spaceAfter !== -1 ? spaceAfter : desc.length;

    const snippet = desc.slice(startIdx, endIdx).trim();
    return `...${snippet}${endIdx < desc.length ? '...' : ''}`;
  };

  const matchCount = matchedProducts.length;

  return (
    <>
      {/* Background Dim / Lock Overlay when Searching */}
      {isExpanded && (
        <div
          className="header-search-backdrop"
          onClick={handleCloseOrClear}
          aria-label="Close search overlay"
        />
      )}

      {/* Search Bar Wrapper - Keeps Header Static without shifting elements */}
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
                if (query.trim()) setIsOpen(true);
              }}
              aria-label="Search items"
            />

            {/* Always visible Close/Clear Button inside the expanded box */}
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

          {/* Spacious, Beautiful Results Dropdown */}
          {isExpanded && isOpen && query.trim().length > 0 && (
            <div className="header-search-dropdown">
              <div className="header-search-dropdown-header">
                <span className="header-search-count-label">
                  {matchCount > 0
                    ? `${matchCount} ${matchCount === 1 ? 'product found' : 'products found'}`
                    : 'No matching products'}
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
                      {/* Thumbnail Image */}
                      <div className="header-search-thumb-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getProductImage(prod)}
                          alt={prod.name}
                          className="header-search-thumb"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      </div>

                      {/* Info: Title & Clean Snippet */}
                      <div className="header-search-info">
                        <p className="header-search-name">{prod.name}</p>
                        <p className="header-search-desc">
                          {getCleanSnippet(prod, query)}
                        </p>
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
                  <div className="header-search-empty">
                    <p style={{ fontWeight: '700', margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-text)' }}>
                      Walang nahanap para sa &ldquo;{query}&rdquo;
                    </p>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                      Subukang maghanap ng craft name (tulad ng <em>Rose</em>, <em>Crochet</em>), presyo (tulad ng <em>250</em>), o detalye.
                    </p>
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
                    <span>View all {matchCount > 1 ? `(${matchCount}) ` : ''}results in Shop</span>
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
