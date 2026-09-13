'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import CartIconBtn from '@/components/customer/CartIconBtn';
import BottomNav from '@/components/customer/BottomNav';
import LazyProductGrid from '@/components/customer/LazyProductGrid';

export default function ShopClient({
  initialProducts = [],
  initialCategories = [],
  initialCategorySlug = 'all',
  searchQuery = '',
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState(initialCategorySlug);

  // Sync custom categories & products from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const localCats = localStorage.getItem('likha_custom_categories');
        if (localCats) {
          const parsed = JSON.parse(localCats);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories((prev) => {
              const map = new Map();
              [...prev, ...parsed].forEach((c) => {
                const key = (c.slug || c.name || c.id).toString().toLowerCase();
                map.set(key, c);
              });
              return Array.from(map.values());
            });
          }
        }

        const localProds = localStorage.getItem('likha_custom_products');
        if (localProds) {
          const parsed = JSON.parse(localProds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts((prev) => {
              const map = new Map();
              [...parsed, ...prev].forEach((p) => map.set(p.id || p.slug, p));
              return Array.from(map.values());
            });
          }
        }
      }
    } catch {}
  }, []);

  // Compute all available categories from categories list and all products
  const allCategories = useMemo(() => {
    const map = new Map();

    (categories || []).forEach((c) => {
      if (c && (c.name || c.slug || c.id)) {
        const key = (c.slug || c.name || c.id).toString().toLowerCase();
        map.set(key, {
          id: c.id || key,
          name: c.name || key,
          slug: c.slug || key,
        });
      }
    });

    (products || []).forEach((p) => {
      if (p.category && p.category.name) {
        const key = (p.category.slug || p.category.name || p.category.id).toString().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: p.category.id || key,
            name: p.category.name,
            slug: p.category.slug || key,
          });
        }
      } else if (p.category_id && typeof p.category_id === 'string' && p.category_id !== 'all' && p.category_id !== 'unassigned') {
        const key = p.category_id.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: p.category_id,
            name: p.category_id.charAt(0).toUpperCase() + p.category_id.slice(1),
            slug: key,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [categories, products]);

  // Filter products by selected category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.is_available === false) return false;

      // Category matching
      let matchesCat = true;
      if (selectedCategory === 'ready-made') {
        matchesCat = Boolean(p.is_ready_made);
      } else if (selectedCategory && selectedCategory !== 'all') {
        const target = selectedCategory.toLowerCase();
        const pCatSlug = (p.category?.slug || p.category?.name || p.category_id || '').toString().toLowerCase();
        const pCatId = (p.category?.id || p.category_id || '').toString().toLowerCase();
        const pCatName = (p.category?.name || '').toString().toLowerCase();
        matchesCat = pCatSlug === target || pCatId === target || pCatName === target;
      }

      // Search query matching
      let matchesSearch = true;
      if (searchQuery) {
        const nameMatch = p.name?.toLowerCase().includes(searchQuery);
        const descMatch = p.description?.toLowerCase().includes(searchQuery);
        const numQ = parseFloat(searchQuery.replace(/[^0-9.]/g, ''));
        const priceMatch = !isNaN(numQ) && (
          p.base_price?.toString().includes(Math.round(numQ).toString()) ||
          (p.sale_price && p.sale_price?.toString().includes(Math.round(numQ).toString()))
        );
        matchesSearch = nameMatch || descMatch || priceMatch;
      }

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link active">Collection</Link>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="page-content">
        {/* Category Filter Tabs */}
        <nav aria-label="Filter by category">
          <div className="category-tabs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`category-tab${selectedCategory === 'all' ? ' active' : ''}`}
              style={{ cursor: 'pointer', border: 'none', background: 'none', font: 'inherit' }}
            >
              All Pieces
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => setSelectedCategory(cat.slug || cat.id)}
                className={`category-tab${selectedCategory === (cat.slug || cat.id) ? ' active' : ''}`}
                style={{ cursor: 'pointer', border: 'none', background: 'none', font: 'inherit' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Product Grid */}
        <section className="section" aria-label="Products">
          <LazyProductGrid products={filteredProducts} initialCount={10} batchSize={10} />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
