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
    if (Array.isArray(prod.product_photos) && prod.product_photos.length > 0) {
      return [...prod.product_photos]
        .sort((a, b) => {
          if (a.is_cover) return -1;
          if (b.is_cover) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
        .map((p) => ({
          id: p.id || Math.random().toString(),
          url: p.url || (
            p.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')
              ? `${supabaseUrl}/storage/v1/object/public/product-photos/${p.storage_path}`
              : (p.storage_path || 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80')
          ),
        }));
    }
    return [{
      id: 'ph-default',
      url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
    }];
  };

  // Client-side hydration and fallback resolution
  useEffect(() => {
    const targetSlug = (slug || '').toLowerCase().trim();
    const targetSlugClean = targetSlug.replace(/-/g, '');

    // 1. Check localStorage first (instant response for custom added products)
    try {
      const local = localStorage.getItem('likha_custom_products');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const match = parsed.find((p) => {
            const pSlug = (p.slug || '').toLowerCase().trim();
            const pId = (p.id || '').toLowerCase().trim();
            return (
              pSlug === targetSlug ||
              pId === targetSlug ||
              pSlug.replace(/-/g, '') === targetSlugClean ||
              (initialProduct && (p.id === initialProduct.id || pSlug === (initialProduct.slug || '').toLowerCase()))
            );
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

    // 2. If initialProduct is already present from server, keep it
    if (initialProduct) {
      setCurrentProduct(initialProduct);
      if (!photos || photos.length === 0) {
        setPhotos(buildPhotoList(initialProduct));
      }
      setLoading(false);
      return;
    }

    // 3. Fallback: Fetch /api/products from server
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
  }, [slug, initialProduct]);

  const defaultHandmadeOptions = [
    {
      id: 'default-opt-color',
      option_name: 'Color',
      is_required: true,
      choices: [
        { label: 'Pink', extra_cost: 0 },
        { label: 'Red', extra_cost: 0 },
        { label: 'Purple', extra_cost: 0 },
        { label: 'Yellow', extra_cost: 0 },
        { label: 'Blue', extra_cost: 0 },
        { label: 'Pastel', extra_cost: 0 },
        { label: 'Mixed Colors', extra_cost: 0 },
      ],
    },
    {
      id: 'default-opt-addons',
      option_name: 'Add-ons',
      is_required: false,
      choices: [
        { label: 'Message Card', extra_cost: 15 },
        { label: 'Ribbon', extra_cost: 15 },
        { label: 'Fairy Lights', extra_cost: 35 },
        { label: 'Gift Box', extra_cost: 30 },
      ],
    },
  ];

  const options = (currentProduct?.product_options && currentProduct.product_options.length > 0)
    ? currentProduct.product_options
    : defaultHandmadeOptions;

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

  const isSoldOut = Boolean(currentProduct.is_sold_out || (currentProduct.is_ready_made && currentProduct.ready_made_stock === 0));
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
    if (isSoldOut || added || hasMissingOptions) return;

    const photoUrl = photos[0]?.url || (photos[0]?.storage_path && supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/product-photos/${photos[0].storage_path}` : null);

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

    const selectedLabels = Object.values(selectedOptions)
      .map((o) => o?.value)
      .filter(Boolean)
      .join(', ');

    triggerToast({
      title: 'Added to Cart! ✨',
      message: `${currentProduct.name}${selectedLabels ? ` (${selectedLabels})` : ''}`,
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
    if (isSoldOut || hasMissingOptions) return;

    clearToast();

    const photoUrl = photos[0]?.url || (photos[0]?.storage_path && supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/product-photos/${photos[0].storage_path}` : null);

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
                <QuantityControl value={quantity} onChange={setQuantity} />
              </div>
            )}

            {/* Shopee-style Product Action Bar */}
            <div className="product-shopee-bar">
              {isSoldOut ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    className="btn btn-secondary btn-full"
                    disabled
                    style={{
                      opacity: 0.65,
                      cursor: 'not-allowed',
                      background: 'var(--color-surface-warm)',
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                      fontWeight: 'var(--weight-bold)',
                    }}
                  >
                    <i className="fa-solid fa-ban" style={{ marginRight: '6px' }}></i>
                    <span>Currently Sold Out</span>
                  </button>
                  <a
                    href={`${MESSENGER_URL}?text=${encodeURIComponent(`Hi M&M Artsy! Inquire ko lang po kung kailan magkaka-stock ulit ng ${currentProduct.name}?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openMessengerDirect(`Hi M&M Artsy! Inquire ko lang po kung kailan magkaka-stock ulit ng ${currentProduct.name}?`);
                    }}
                    className="btn btn-primary btn-full"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <i className="fa-brands fa-facebook-messenger"></i>
                    <span>Inquire Restock on Messenger</span>
                  </a>
                </div>
              ) : (
                <div className="shopee-bar-container">
                  {/* Action 1: Add to Cart */}
                  <button
                    ref={addBtnRef}
                    type="button"
                    className="shopee-btn-add-cart ripple"
                    onClick={handleAddToCart}
                    disabled={hasMissingOptions || added}
                    id="add-to-cart-btn"
                    title={hasMissingOptions ? `Please select ${missingRequiredOptions.map((o) => o.option_name).join(', ')}` : ''}
                  >
                    <i className={added ? 'fa-solid fa-check' : 'fa-solid fa-cart-plus'}></i>
                    <span>{added ? 'Added to Cart' : 'Add to Cart'}</span>
                  </button>

                  {/* Action 2: Buy Now / Direct Checkout */}
                  <button
                    type="button"
                    className="shopee-btn-buy-now ripple"
                    onClick={handleCheckoutNow}
                    disabled={hasMissingOptions}
                    id="checkout-now-btn"
                    title={hasMissingOptions ? `Please select ${missingRequiredOptions.map((o) => o.option_name).join(', ')}` : ''}
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
