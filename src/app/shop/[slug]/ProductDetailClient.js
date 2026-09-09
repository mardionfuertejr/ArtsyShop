'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';
import { useRouter } from 'next/navigation';
import PhotoCarousel from '@/components/customer/PhotoCarousel';
import OptionSelector from '@/components/customer/OptionSelector';
import QuantityControl from '@/components/customer/QuantityControl';
import ProductReviews from '@/components/customer/ProductReviews';
import BottomNav from '@/components/customer/BottomNav';
import CartIconBtn from '@/components/customer/CartIconBtn';
import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { MESSENGER_URL } from '@/lib/constants/customPrompts';

export default function ProductDetailClient({ product, photos }) {
  const router = useRouter();
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    try {
      const local = localStorage.getItem('likha_custom_products');
      if (local) {
        const parsed = JSON.parse(local);
        const match = parsed.find((p) => p.id === product.id || p.slug === product.slug);
        if (match) {
          setCurrentProduct((prev) => ({ ...prev, ...match }));
        }
      }
    } catch {}
  }, [product]);

  const defaultHandmadeOptions = [
    {
      id: 'default-opt-color',
      option_name: 'Color Theme',
      is_required: true,
      choices: [
        { label: 'Blush Pink', extra_cost: 0 },
        { label: 'Velvet Red', extra_cost: 0 },
        { label: 'Lavender', extra_cost: 0 },
        { label: 'Sky Blue', extra_cost: 0 },
        { label: 'Sunflower', extra_cost: 0 },
      ],
    },
    {
      id: 'default-opt-addons',
      option_name: 'Add-ons',
      is_required: false,
      choices: [
        { label: 'None', extra_cost: 0 },
        { label: 'Fairy Lights (+₱35)', extra_cost: 35 },
        { label: 'Greeting Card (+₱20)', extra_cost: 20 },
        { label: 'Lights + Card (+₱50)', extra_cost: 50 },
      ],
    },
  ];

  const options = (currentProduct.product_options && currentProduct.product_options.length > 0)
    ? currentProduct.product_options
    : defaultHandmadeOptions;

  // Initialize default selections for required options
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = {};
    options.forEach((opt) => {
      if (opt.is_required && opt.choices?.length > 0) {
        const first = opt.choices[0];
        const label = typeof first === 'string' ? first : first.label;
        const extraCost = typeof first === 'object' ? (first.extra_cost || 0) : 0;
        const clean = label.replace(/\s*\(\+?₱?[\d,.]+\)/gi, '').replace(/\s*\+?₱[\d,.]+/gi, '').trim();
        initial[opt.option_name] = { value: clean, extraCost };
      }
    });
    return initial;
  });
  const { addItem, itemCount } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [flyingItems, setFlyingItems] = useState([]);
  const addBtnRef = useRef(null);

  const isSoldOut = Boolean(currentProduct.is_sold_out || (currentProduct.is_ready_made && currentProduct.ready_made_stock === 0));
  const isOnSale = Boolean(currentProduct.is_on_sale && currentProduct.sale_price && Number(currentProduct.base_price) > Number(currentProduct.sale_price));
  const originalBasePrice = parseFloat(currentProduct.base_price || 0);
  const effectiveBasePrice = isOnSale ? parseFloat(currentProduct.sale_price) : originalBasePrice;

  const discountPercent = (isOnSale && originalBasePrice > 0)
    ? Math.round(((originalBasePrice - parseFloat(currentProduct.sale_price)) / originalBasePrice) * 100)
    : null;

  // Calculate live price (including options)
  const extraCost = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + (opt.extraCost || 0),
    0
  );
  const unitPrice = effectiveBasePrice + extraCost;
  const totalPrice = unitPrice * quantity;

  const handleOptionSelect = (optionName, value, extraCost) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: { value, extraCost },
    }));
  };

  const handleAddToCart = () => {
    const photoUrl = photos[0]?.url || (photos[0]?.storage_path && process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${photos[0].storage_path}` : null);

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      photo: photoUrl,
      basePrice: effectiveBasePrice,
      unitPrice,
      quantity,
      options: Object.entries(selectedOptions).map(([name, { value, extraCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: extraCost,
      })),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);

    // Trigger Parabolic Fly-to-Cart Animation
    try {
      const btnEl = addBtnRef.current || document.getElementById('add-to-cart-btn');
      const cartEl = document.getElementById('detail-cart-btn') || document.querySelector('.cart-btn-wrapper');

      if (btnEl && cartEl) {
        const btnRect = btnEl.getBoundingClientRect();
        const cartRect = cartEl.getBoundingClientRect();

        const startX = btnRect.left + btnRect.width / 2;
        const startY = btnRect.top + btnRect.height / 2;
        const targetX = cartRect.left + cartRect.width / 2;
        const targetY = cartRect.top + cartRect.height / 2;

        const particleId = `fly-${Date.now()}`;
        const newParticle = {
          id: particleId,
          startX: `${startX}px`,
          startY: `${startY}px`,
          targetX: `${targetX}px`,
          targetY: `${targetY}px`,
          photo: photoUrl,
        };

        setFlyingItems((prev) => [...prev, newParticle]);

        // On arrival at top cart icon (650ms), trigger cart bounce & badge pop
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('likha_cart_updated'));
          setFlyingItems((prev) => prev.filter((item) => item.id !== particleId));
        }, 650);
      }
    } catch {}
  };

  const handleCheckoutNow = () => {
    const photoUrl = photos[0]?.url || (photos[0]?.storage_path && process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${photos[0].storage_path}` : null);

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      photo: photoUrl,
      basePrice: effectiveBasePrice,
      unitPrice,
      quantity,
      options: Object.entries(selectedOptions).map(([name, { value, extraCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: extraCost,
      })),
    });

    router.push('/checkout');
  };

  const allRequiredSelected = options.every((opt) =>
    !opt.is_required || selectedOptions[opt.option_name]
  );

  return (
    <div className="customer-shell">
      {/* Top Bar */}
      <header className="top-bar">
        <Link href="/shop" className="top-bar-action" aria-label="Back to collection">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, textAlign: 'left', marginLeft: '6px', margin: 0 }}>Product Details</span>
        
        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link active">Collection</Link>
          <a href={CUSTOM_ORDER_MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="top-bar-link">Custom Orders</a>
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
            <PhotoCarousel photos={photos} productName={product.name} />
          </div>

          {/* Details */}
          <div className="product-info-panel">
            {/* Title */}
            <h1 className="product-detail-title">{product.name}</h1>

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
            </div>

            {/* Description */}
            {product.description && (
              <p className="product-detail-desc">{product.description}</p>
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
                    required={opt.is_required}
                    onSelect={(val, cost) => handleOptionSelect(opt.option_name, val, cost)}
                  />
                </div>
              );
            })}

            {/* Quantity Control Card */}
            {!isSoldOut && (
              <div className="quantity-card">
                <div className="quantity-card-label">
                  <span className="quantity-card-title">
                    <i className="fa-solid fa-layer-group"></i> Quantity
                  </span>
                  <span className="quantity-card-sub">
                    {quantity > 1 ? `${formatCurrency(unitPrice)} each` : 'Number of items'}
                  </span>
                </div>
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
                    href={`${MESSENGER_URL}?text=${encodeURIComponent(`Hi M&M Artsy! Inquire ko lang po kung kailan magkaka-stock ulit ng ${product.name}?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
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
                    disabled={!allRequiredSelected}
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
                    disabled={!allRequiredSelected}
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
        <ProductReviews product={product} />

        {/* Parabolic Flying Cart Items */}
        {flyingItems.map((item) => (
          <div
            key={item.id}
            className="flying-cart-particle"
            style={{
              '--fly-start-x': item.startX,
              '--fly-start-y': item.startY,
              '--fly-end-x': item.targetX,
              '--fly-end-y': item.targetY,
            }}
          >
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo} alt="Piece added" />
            ) : (
              <i className="fa-solid fa-gift" style={{ color: '#FFFFFF', fontSize: '20px' }}></i>
            )}
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
