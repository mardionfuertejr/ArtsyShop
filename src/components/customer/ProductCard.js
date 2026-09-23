'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';
import { useCart } from '@/lib/hooks/useCart';
import { openMessengerDirect } from '@/lib/utils/browserNav';
import { triggerToast } from '@/components/common/GlobalToast';

export default function ProductCard({ product, className = '', style = {} }) {
  const { cart, addItem, updateQty, removeItem } = useCart();

  // Find total quantity of this product in cart
  const inCartItems = (cart || []).filter(
    (c) => (c.productId && product.id && c.productId === product.id) ||
           (c.productSlug && product.slug && c.productSlug === product.slug)
  );
  const inCartQty = inCartItems.reduce((sum, c) => sum + (c.quantity || 0), 0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const coverPhoto = product.product_photos?.find((p) => p.is_cover) || product.product_photos?.[0];
  const photoUrl = coverPhoto?.url
    ? coverPhoto.url
    : (coverPhoto?.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder'))
      ? `${supabaseUrl}/storage/v1/object/public/product-photos/${coverPhoto.storage_path}`
      : 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80';

  const isSoldOut = Boolean(
    product.is_sold_out === true ||
    product.is_sold_out === 'true' ||
    (product.is_ready_made && (Number(product.ready_made_stock) === 0 || product.ready_made_stock === '0'))
  );

  // Uniform discount percent calculation (e.g. 15% OFF)
  const discountPercent = (product.is_on_sale && product.sale_price && product.base_price && Number(product.base_price) > Number(product.sale_price))
    ? Math.round(((Number(product.base_price) - Number(product.sale_price)) / Number(product.base_price)) * 100)
    : null;

  const saleBadgeText = discountPercent ? `${discountPercent}% OFF` : (product.sale_tag || 'Sale');

  const hasOptions = Array.isArray(product.product_options) && product.product_options.length > 0;
  const hasChoicesInOptions = hasOptions &&
    product.product_options.some((o) => Array.isArray(o.choices) && o.choices.length > 0);

  // Categories that ALWAYS need option selection (color, theme, etc.)
  const categorySlug = product.category?.slug || '';
  const categoryName = (product.category?.name || '').toLowerCase();
  const OPTION_REQUIRED_CATEGORIES = ['bouquets', 'fuzzy-crafts', 'resin-art', 'custom-gifts'];
  const isOptionCategory = OPTION_REQUIRED_CATEGORIES.includes(categorySlug) ||
    ['bouquet', 'fuzzy', 'wire', 'resin', 'custom'].some(k => categoryName.includes(k));

  // Show option modal if:
  // 1. Product has explicit options with choices defined in DB → always show
  // 2. Product belongs to a category that typically needs options (bouquets, fuzzy crafts, etc.) → show with defaults
  // 3. Product is NOT ready-made (custom/made-to-order) → show with defaults
  const hasRequiredOptions = hasChoicesInOptions || isOptionCategory || !product.is_ready_made;

  const [added, setAdded] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut || isCooldown) return;

    // If the product requires options (color theme, add-ons, etc.), open the Quick Option Bottom Sheet
    if (hasRequiredOptions) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('likha_open_quick_option', {
            detail: {
              product,
              photoUrl,
            },
          })
        );
      }
      return;
    }

    if (inCartQty > 0) {
      const match = inCartItems[0];
      if (match) {
        updateQty(match.cartItemId || match.id, inCartQty + 1);
        setAdded(true);
        setIsCooldown(true);
        triggerToast({
          title: 'Updated Cart! ✨',
          message: `${product.name} (Qty: ${inCartQty + 1})`,
          photo: photoUrl,
          type: 'cart',
          quantity: inCartQty + 1,
        });
        setTimeout(() => {
          setAdded(false);
          setIsCooldown(false);
        }, 200);
        return;
      }
    }

    const unitPrice = (product.is_on_sale && product.sale_price)
      ? parseFloat(product.sale_price)
      : parseFloat(product.base_price || 0);

    const cleanId = String(product.id || '').trim();
    const cleanSlug = String(product.slug || '').trim();

    setAdded(true);
    setIsCooldown(true);

    // Trigger smooth Flying Cart particle animation
    try {
      if (typeof window !== 'undefined') {
        const btnRect = e.currentTarget.getBoundingClientRect();
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

    addItem({
      productId: cleanId,
      productSlug: cleanSlug,
      productName: product.name || 'Handmade Piece',
      photo: photoUrl,
      basePrice: unitPrice,
      unitPrice: unitPrice,
      quantity: 1,
      options: [],
    });

    triggerToast({
      message: `${product.name} added to cart`,
      photo: photoUrl,
      type: 'cart',
      quantity: 1,
    });

    // Reset cooldown after 200ms for ultra-responsive tapping
    setTimeout(() => {
      setAdded(false);
      setIsCooldown(false);
    }, 200);
  };

  return (
    <Link
      href={`/shop/${product.slug}`}
      prefetch={true}
      className={`product-card${isSoldOut ? ' is-sold-out' : ''} ${className}`}
      style={{ textDecoration: 'none', ...style }}
    >
      <div className="product-card-image-wrap">
        {isSoldOut ? (
          <span className="product-badge-soldout">
            Sold Out
          </span>
        ) : product.is_on_sale && product.sale_price ? (
          <span className="product-badge-sale">
            {saleBadgeText}
          </span>
        ) : product.is_bestseller ? (
          <span className="product-badge-bestseller">
            Bestseller
          </span>
        ) : product.is_ready_made ? (
          <span className="product-badge-onhand">
            On Hand
          </span>
        ) : (
          <span className="product-badge-custom">
            Made to Order
          </span>
        )}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="product-card-image"
            src={photoUrl}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <div className="product-card-image-placeholder">
            <i className="fa-solid fa-gift"></i>
          </div>
        )}
      </div>
      <div className="product-card-body">
        <h3 className="product-card-name" title={product.name}>{product.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '3px' }}>
          <div className="product-card-price-wrap" style={{ margin: 0 }}>
            {product.is_on_sale && product.sale_price ? (
              <div className="product-card-price-row is-sale">
                <span className="product-card-price-current">
                  {formatCurrencyCompact(product.sale_price)}
                </span>
                <span className="product-card-price-original">
                  {formatCurrencyCompact(product.base_price)}
                </span>
              </div>
            ) : isSoldOut ? (
              <div className="product-card-price-row is-sold-out">
                <span className="product-card-price-prefix">From</span>
                <span className="product-card-price-current">
                  {formatCurrencyCompact(product.base_price)}
                </span>
              </div>
            ) : (
              <div className="product-card-price-row">
                <span className="product-card-price-prefix">From</span>
                <span className="product-card-price-current">
                  {formatCurrencyCompact(product.base_price)}
                </span>
              </div>
            )}
          </div>

          {isSoldOut ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = `Hi M&M Artsy! Inquire po sana ako para magpa-reserve ng "${product.name}" (${formatCurrencyCompact(product.base_price)}). Pa-notify po ako kapag available na. Maraming salamat po! 🌸`;
                openMessengerDirect(text);
              }}
              className="product-card-quick-add is-reserve"
              title={`Pa-reserve ang ${product.name} sa Messenger`}
              aria-label={`Pa-reserve ang ${product.name} sa Messenger`}
              style={{
                background: 'rgba(0, 132, 255, 0.12)',
                color: '#0084FF',
                border: '1px solid rgba(0, 132, 255, 0.28)',
              }}
            >
              <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '11.5px' }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isCooldown}
              aria-label={hasRequiredOptions ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
              title={hasRequiredOptions ? "Select options & color" : (isCooldown ? "Added! Wait a moment..." : "Quick Add to Cart")}
              className={`product-card-quick-add ${added ? 'is-added' : ''} ${isCooldown ? 'is-cooldown' : ''}`}
            >
              <i className={added ? 'fa-solid fa-check' : 'fa-solid fa-plus'} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
