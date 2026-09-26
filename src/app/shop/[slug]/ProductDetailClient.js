'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CUSTOM_ORDER_MESSENGER_URL, MESSENGER_URL } from '@/lib/constants/customPrompts';
import { openExternalSafe, openMessengerDirect } from '@/lib/utils/browserNav';
import { useRouter } from 'next/navigation';
import PhotoCarousel from '@/components/customer/PhotoCarousel';
import OptionSelector from '@/components/customer/OptionSelector';
import QuantityControl from '@/components/customer/QuantityControl';
import ProductReviews from '@/components/customer/ProductReviews';
import BottomNav from '@/components/customer/BottomNav';
import CartIconBtn from '@/components/customer/CartIconBtn';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import BrandLogo from '@/components/common/BrandLogo';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { triggerToast, clearToast } from '@/components/common/GlobalToast';
import { resolveProductPhoto, getSmartFallbackImage } from '@/lib/utils/productImage';

export default function ProductDetailClient({ product: initialProduct, photos: initialPhotos, slug }) {
  const router = useRouter();
  const [currentProduct, setCurrentProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [photos, setPhotos] = useState(initialPhotos && initialPhotos.length > 0 ? initialPhotos : []);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Dynamic Browser Tab Title & Route Prefetching for Instant 0ms Navigation
  useEffect(() => {
    if (currentProduct?.name && typeof document !== 'undefined') {
      document.title = `${currentProduct.name} | M&M's Artsy`;
    }
    try {
      router.prefetch('/checkout');
      router.prefetch('/cart');
      router.prefetch('/shop');
    } catch {}
  }, [currentProduct?.name, router]);

  // Helper to build photo list
  const buildPhotoList = (prod) => {
    if (!prod) return [];
    const catSlug = prod.category?.slug || prod.category?.name || '';
    if (Array.isArray(prod.product_photos) && prod.product_photos.length > 0) {
      return [...prod.product_photos]
        .sort((a, b) => {
          if (a.is_cover) return -1;
          if (b.is_cover) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
        .map((p, idx) => ({
          id: p.id || `photo-${p.display_order ?? idx}`,
          url: resolveProductPhoto(p.url || (
            p.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !p.storage_path.startsWith('placeholder')
              ? `${supabaseUrl}/storage/v1/object/public/product-photos/${p.storage_path}`
              : null
          ), catSlug),
        }));
    }
    return [{
      id: 'ph-default',
      url: getSmartFallbackImage(catSlug, prod.name),
    }];
  };

  // Client-side hydration and fallback resolution
  useEffect(() => {
    const targetSlug = (slug || '').toLowerCase().trim();
    const targetSlugClean = targetSlug.replace(/-/g, '');

    const syncProductData = () => {
      let activeProduct = initialProduct ? { ...initialProduct } : null;

      // Check localStorage for admin-created or updated products
      try {
        const local = localStorage.getItem('likha_custom_products');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const match = parsed.find((p) => {
              const pSlug = (p.slug || '').toLowerCase().trim();
              const pId = (p.id || '').toLowerCase().trim();
              return (
                (initialProduct && (p.id === initialProduct.id || pSlug === (initialProduct.slug || '').toLowerCase())) ||
                pSlug === targetSlug ||
                pId === targetSlug ||
                pSlug.replace(/-/g, '') === targetSlugClean
              );
            });

            if (match) {
              activeProduct = activeProduct ? { ...activeProduct, ...match } : match;
            }
          }
        }
      } catch {}

      if (activeProduct) {
        setCurrentProduct(activeProduct);
        setPhotos(buildPhotoList(activeProduct));
        setLoading(false);
        return;
      }

      // Fallback: Fetch /api/products from server
      async function fetchFromApi() {
        try {
          const res = await fetch('/api/products');
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.products)) {
              const match = data.products.find((p) => {
                const pSlug = (p.slug || '').toLowerCase().trim();
                const pId = (p.id || '').toLowerCase().trim();
                return pSlug === targetSlug || pId === targetSlug || pSlug.replace(/-/g, '') === targetSlugClean;
              });
              if (match) {
                setCurrentProduct(match);
                setPhotos(buildPhotoList(match));
                setLoading(false);
                return;
              }
            }
          }
        } catch {}
        setLoading(false);
      }

      fetchFromApi();
    };

    syncProductData();

    window.addEventListener('likha_products_updated', syncProductData);
    window.addEventListener('storage', syncProductData);

    return () => {
      window.removeEventListener('likha_products_updated', syncProductData);
      window.removeEventListener('storage', syncProductData);
    };
  }, [slug, initialProduct]);

  // Smart category-based default options when product has no explicit options
  const CATEGORY_DEFAULT_OPTIONS = {
    bouquets: [
      {
        id: 'default-opt-color', option_name: 'Color / Theme', is_required: true,
        choices: [
          { label: 'Pastel Blush Pink', extra_cost: 0 }, { label: 'Crimson Velvet Red', extra_cost: 0 },
          { label: 'Lilac Lavender', extra_cost: 0 }, { label: 'Sunflower Warm Yellow', extra_cost: 0 },
          { label: 'White Elegance', extra_cost: 0 }, { label: 'Mixed Colors', extra_cost: 0 },
        ],
      },
      {
        id: 'default-opt-addons', option_name: 'Add-ons', is_required: false,
        choices: [
          { label: 'Message Card', extra_cost: 15 }, { label: 'Ribbon', extra_cost: 15 },
          { label: 'Fairy LED Light', extra_cost: 35 }, { label: 'Gift Packaging', extra_cost: 30 },
        ],
      },
    ],
    'fuzzy-crafts': [
      {
        id: 'default-opt-color', option_name: 'Color / Theme', is_required: true,
        choices: [
          { label: 'Pastel Pink', extra_cost: 0 }, { label: 'Baby Blue', extra_cost: 0 },
          { label: 'Cream White', extra_cost: 0 }, { label: 'Lavender', extra_cost: 0 },
          { label: 'Sage Green', extra_cost: 0 },
        ],
      },
    ],
    'resin-art': [
      {
        id: 'default-opt-style', option_name: 'Color / Style', is_required: true,
        choices: [
          { label: 'Ocean Blue', extra_cost: 0 }, { label: 'Rose Gold', extra_cost: 0 },
          { label: 'Crystal Clear', extra_cost: 0 }, { label: 'Galaxy Purple', extra_cost: 0 },
          { label: 'Emerald Green', extra_cost: 0 },
        ],
      },
    ],
    'custom-gifts': [
      {
        id: 'default-opt-color', option_name: 'Color Theme', is_required: true,
        choices: [
          { label: 'Pink', extra_cost: 0 }, { label: 'Red', extra_cost: 0 },
          { label: 'White', extra_cost: 0 }, { label: 'Purple', extra_cost: 0 },
          { label: 'Mixed Colors', extra_cost: 0 },
        ],
      },
    ],
  };
  const defaultFallback = [
    {
      id: 'default-opt-color', option_name: 'Color', is_required: true,
      choices: [
        { label: 'Pink', extra_cost: 0 }, { label: 'Red', extra_cost: 0 },
        { label: 'Purple', extra_cost: 0 }, { label: 'Yellow', extra_cost: 0 },
        { label: 'Blue', extra_cost: 0 }, { label: 'Mixed Colors', extra_cost: 0 },
      ],
    },
    {
      id: 'default-opt-addons', option_name: 'Add-ons', is_required: false,
      choices: [
        { label: 'Message Card', extra_cost: 15 }, { label: 'Ribbon', extra_cost: 15 },
        { label: 'Fairy Lights', extra_cost: 35 }, { label: 'Gift Box', extra_cost: 30 },
      ],
    },
  ];

  const getSmartDefaults = () => {
    const catSlug = currentProduct?.category?.slug || '';
    const catName = (currentProduct?.category?.name || '').toLowerCase();
    if (CATEGORY_DEFAULT_OPTIONS[catSlug]) return CATEGORY_DEFAULT_OPTIONS[catSlug];
    for (const [key, opts] of Object.entries(CATEGORY_DEFAULT_OPTIONS)) {
      if (catName.includes(key.replace('-', ' ')) || catName.includes(key.split('-')[0])) return opts;
    }
    return defaultFallback;
  };

  const options = (currentProduct?.product_options && currentProduct.product_options.length > 0)
    ? currentProduct.product_options
    : getSmartDefaults();

  // Blank/unselected options by default (displays '---')
  const [selectedOptions, setSelectedOptions] = useState({});
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addBtnRef = useRef(null);

  // Loading Screen
  if (loading) {
    return (
      <div className="customer-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="top-bar">
          <Link href="/shop" className="top-bar-action" aria-label="Back to collection">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <span className="top-bar-title" style={{ flex: 1, textAlign: 'left', marginLeft: '6px', margin: 0 }}>
            Loading Product...
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CartIconBtn />
          </div>
        </header>

        <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--color-primary, #b45309)' }}></i>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: '500' }}>
              Loading product details...
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Not Found Screen
  if (!currentProduct) {
    return (
      <div className="customer-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="top-bar">
          <Link href="/shop" className="top-bar-action" aria-label="Back to collection">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <span className="top-bar-title" style={{ flex: 1, textAlign: 'left', marginLeft: '6px', margin: 0 }}>
            Product Details
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CartIconBtn />
          </div>
        </header>

        <main className="page-content" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--color-bg, #FAF6F0)',
          textAlign: 'center',
        }}>
          <div style={{
            background: '#ffffff',
            padding: '36px 24px',
            borderRadius: '24px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            <BrandLogo size="small" />

            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              fontSize: '26px',
              marginTop: '4px',
            }}>
              <i className="fa-solid fa-bag-shopping"></i>
            </div>

            <h1 style={{
              fontSize: '20px',
              fontWeight: '800',
              color: 'var(--color-text, #1E293B)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Product Not Found
            </h1>

            <p style={{
              fontSize: '13px',
              color: '#64748b',
              lineHeight: 1.5,
              margin: 0,
            }}>
              Ang item o page na ito ay maaaring naalis na o wala pa sa catalog. Maaari kang mag-browse sa collection o pumunta sa home page.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '100%',
              marginTop: '8px',
            }}>
              <Link
                href="/shop"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--color-primary, #b45309)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)',
                }}
              >
                <i className="fa-solid fa-store"></i>
                <span>Browse Collection</span>
              </Link>

              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontWeight: '700',
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                }}
              >
                <i className="fa-solid fa-house"></i>
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const isSoldOut = Boolean(
    currentProduct.is_sold_out === true ||
    currentProduct.is_sold_out === 'true' ||
    (currentProduct.is_ready_made && (Number(currentProduct.ready_made_stock) === 0 || currentProduct.ready_made_stock === '0'))
  );
  const maxStock = (currentProduct.is_ready_made && Number(currentProduct.ready_made_stock) > 0)
    ? Number(currentProduct.ready_made_stock)
    : 99;
  const isOnSale = Boolean(currentProduct.is_on_sale && currentProduct.sale_price && Number(currentProduct.base_price) > Number(currentProduct.sale_price));
  const originalBasePrice = parseFloat(currentProduct.base_price || 0);
  const effectiveBasePrice = isOnSale ? parseFloat(currentProduct.sale_price) : originalBasePrice;
  const discountPercent = isOnSale && originalBasePrice > 0
    ? Math.round(((originalBasePrice - parseFloat(currentProduct.sale_price)) / originalBasePrice) * 100)
    : null;
  const saleBadgeText = discountPercent ? `${discountPercent}% OFF` : (currentProduct.sale_tag || 'Sale');

  // Calculate live price (including options)
  const extraCost = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + (opt.extraCost || 0),
    0
  );
  const unitPrice = effectiveBasePrice + extraCost;
  const totalPrice = unitPrice * quantity;

  const handleOptionSelect = (optionName, value, extraCost) => {
    setSelectedOptions((prev) => {
      if (!value || value === '---') {
        const next = { ...prev };
        delete next[optionName];
        return next;
      }
      return {
        ...prev,
        [optionName]: { value, extraCost: extraCost || 0 },
      };
    });
  };

  const getFilteredSelectedOptions = () => {
    return Object.entries(selectedOptions)
      .filter(([_, opt]) => opt?.value && opt.value !== '— Select —' && opt.value !== '---' && opt.value.trim() !== '')
      .map(([name, { value, extraCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: extraCost || 0,
      }));
  };

  const requiredOptions = (options || []).filter(
    (opt) => opt.is_required !== false && Array.isArray(opt.choices) && opt.choices.length > 0
  );
  const missingRequiredOptions = requiredOptions.filter((opt) => {
    const val = selectedOptions[opt.option_name]?.value;
    return !val || val === '— Select —' || val === '---' || val.trim() === '';
  });
  const hasMissingOptions = missingRequiredOptions.length > 0;

  const handleAddToCart = () => {
    if (isSoldOut || added) return;

    if (hasMissingOptions) {
      const missingLabels = missingRequiredOptions.map((o) => o.option_name).join(', ');
      triggerToast({
        message: `Please select ${missingLabels} first ✨`,
        type: 'warning',
      });
      const optEl = document.querySelector('.option-selector-trigger');
      if (optEl) {
        optEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        optEl.click();
      }
      return;
    }

    const photoUrl = resolveProductPhoto(photos[0]?.url || currentProduct);

    addItem({
      productId: currentProduct.id,
      productSlug: currentProduct.slug,
      productName: currentProduct.name,
      photo: photoUrl,
      basePrice: effectiveBasePrice,
      unitPrice,
      quantity,
      options: getFilteredSelectedOptions(),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);

    triggerToast({
      message: 'Added to cart ✨',
      photo: photoUrl,
      type: 'cart',
      quantity,
    });

    // Trigger Parabolic Fly-to-Cart Animation
    try {
      const btnEl = addBtnRef.current || document.getElementById('add-to-cart-btn');
      if (btnEl) {
        const btnRect = btnEl.getBoundingClientRect();
        const startX = btnRect.left + btnRect.width / 2;
        const startY = btnRect.top + btnRect.height / 2;

        window.dispatchEvent(
          new CustomEvent('likha_fly_to_cart', {
            detail: {
              startX,
              startY,
              photo: photoUrl,
            },
          })
        );
      }
    } catch {}
  };

  const handleCheckoutNow = () => {
    if (isSoldOut) return;

    if (hasMissingOptions) {
      const missingLabels = missingRequiredOptions.map((o) => o.option_name).join(', ');
      triggerToast({
        message: `Please select ${missingLabels} first ✨`,
        type: 'warning',
      });
      const optEl = document.querySelector('.option-selector-trigger');
      if (optEl) {
        optEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        optEl.click();
      }
      return;
    }

    clearToast();

    const photoUrl = resolveProductPhoto(photos[0]?.url || currentProduct);

    const directItem = {
      cartItemId: `direct-${Date.now()}`,
      productId: currentProduct.id || `prod-${currentProduct.slug}`,
      productSlug: currentProduct.slug,
      productName: currentProduct.name,
      photo: photoUrl,
      basePrice: effectiveBasePrice,
      unitPrice,
      quantity,
      options: getFilteredSelectedOptions(),
    };

    try {
      localStorage.removeItem('likha_checkout_items');
      localStorage.setItem('likha_direct_checkout_item', JSON.stringify(directItem));
    } catch {}

    router.push('/checkout');
  };

  const handleGoBack = (e) => {
    if (e) e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/shop');
    }
  };

  return (
    <div className="customer-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <button
          type="button"
          onClick={handleGoBack}
          className="top-bar-action"
          aria-label="Back"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="top-bar-title" style={{ flex: 1, textAlign: 'left', marginLeft: '6px', margin: 0 }}>Product Details</span>
        
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

      <main className="page-content page-enter">
        <div className="product-detail-layout">
          {/* Photos */}
          <div className="product-gallery">
            <PhotoCarousel photos={photos} productName={currentProduct.name} />
          </div>

          {/* Details */}
          <div className="product-info-panel">
            {/* Status Badges Row (Sold Out | On-Hand | Made to Order | Bestseller | Sale) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {isSoldOut ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#1E293B',
                  color: '#F8FAFC',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}>
                  <i className="fa-solid fa-ban" style={{ fontSize: '10px' }}></i>
                  <span>Sold Out</span>
                </span>
              ) : currentProduct.is_ready_made ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid rgba(22, 163, 74, 0.25)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}>
                  <i className="fa-solid fa-leaf" style={{ fontSize: '10px' }}></i>
                  <span>On Hand{currentProduct.ready_made_stock ? ` (${currentProduct.ready_made_stock} left)` : ''}</span>
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(194, 94, 56, 0.10)',
                  color: 'var(--color-primary, #C25E38)',
                  border: '1px solid rgba(194, 94, 56, 0.22)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '10px' }}></i>
                  <span>Made to Order</span>
                </span>
              )}

              {currentProduct.is_bestseller && !isSoldOut && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
                  color: '#FFFFFF',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                }}>
                  <i className="fa-solid fa-fire" style={{ fontSize: '9.5px' }}></i>
                  <span>Bestseller</span>
                </span>
              )}

              {isOnSale && !isSoldOut && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#FEE2E2',
                  color: '#B91C1C',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}>
                  <span>{saleBadgeText}</span>
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="product-detail-title">{currentProduct.name}</h1>

            {/* Price Row */}
            <div className="product-price-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="product-detail-price" style={{ color: isOnSale ? 'var(--color-primary)' : 'var(--color-text)' }}>
                {formatCurrency(unitPrice)}
              </span>

              {isOnSale && (
                <span style={{ fontSize: '15px', color: 'var(--color-text-muted)', textDecoration: 'line-through', fontWeight: '500' }}>
                  {formatCurrency(originalBasePrice + extraCost)}
                </span>
              )}

              {isOnSale && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#B91C1C',
                  background: '#FEE2E2',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.02em',
                }}>
                  {saleBadgeText}
                </span>
              )}
            </div>

            {/* Description */}
            {currentProduct.description && (
              <p className="product-detail-desc">{currentProduct.description}</p>
            )}

            {/* Out of Stock Notice Banner */}
            {isSoldOut && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '12px 0 16px',
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#DC2626', fontSize: '18px', flexShrink: 0 }}></i>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B' }}>Currently Out of Stock</div>
                  <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '2px', lineHeight: '1.4' }}>
                    Pansamantalang ubos ang stock para sa item na ito. Pwede kang mag-inquire sa Messenger para sa pre-order o custom crafting.
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            {options && options.length > 0 && options.map((opt) => {
              if (!opt.choices || opt.choices.length === 0) return null;
              return (
                <div key={opt.id || opt.option_name} style={{ marginBottom: '6px' }}>
                  <OptionSelector
                    option={opt}
                    optionName={opt.option_name}
                    choices={opt.choices}
                    selected={selectedOptions[opt.option_name]?.value}
                    onSelect={(val, cost) => handleOptionSelect(opt.option_name, val, cost)}
                    required={opt.is_required !== false}
                  />
                </div>
              );
            })}

            {/* Quantity Control Card */}
            {!isSoldOut && (
              <div className="quantity-card">
                <span className="quantity-card-title">
                  <i className="fa-solid fa-layer-group"></i> Quantity
                </span>
                <QuantityControl
                  value={quantity}
                  onChange={(val) => {
                    if (val > maxStock) {
                      triggerToast({
                        message: `Only ${maxStock} items available in stock 🌿`,
                        type: 'warning',
                      });
                      setQuantity(maxStock);
                    } else {
                      setQuantity(val);
                    }
                  }}
                  min={1}
                  max={maxStock}
                />
              </div>
            )}

            {/* Shopee-style Product Action Bar */}
            <div className="product-shopee-bar">
              {isSoldOut ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedList = getFilteredSelectedOptions().map(o => `${o.optionName}: ${o.optionValue}`).join(', ');
                      const text = `Hi M&M Artsy! Inquire po sana ako para magpa-reserve ng "${currentProduct.name}" (Qty: ${quantity}${selectedList ? `, ${selectedList}` : ''}). Pa-notify po ako kapag available na. Maraming salamat po! 🌸`;
                      openMessengerDirect(text);
                    }}
                    className="btn btn-primary btn-full"
                    style={{
                      background: 'linear-gradient(135deg, #0084FF 0%, #0066CC 100%)',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(0, 132, 255, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minHeight: '44px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '16px' }}></i>
                    <span>Pa-reserve / Inquire sa Messenger</span>
                  </button>
                </div>
              ) : (
                <div className="shopee-bar-container">
                  {/* Action 1: Add to Cart */}
                  <button
                    ref={addBtnRef}
                    type="button"
                    className="shopee-btn-add-cart ripple"
                    onClick={handleAddToCart}
                    disabled={added}
                    id="add-to-cart-btn"
                  >
                    <i className={added ? 'fa-solid fa-check' : 'fa-solid fa-cart-plus'}></i>
                    <span>{added ? 'Added to Cart' : 'Add to Cart'}</span>
                  </button>

                  {/* Action 2: Buy Now / Direct Checkout */}
                  <button
                    type="button"
                    className="shopee-btn-buy-now ripple"
                    onClick={handleCheckoutNow}
                    id="checkout-now-btn"
                  >
                    <span>Buy Now · {formatCurrency(totalPrice)}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <ProductReviews product={currentProduct} />
      </main>

      <BottomNav />
    </div>
  );
}
