'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import OptionSelector from '@/components/customer/OptionSelector';
import QuantityControl from '@/components/customer/QuantityControl';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { triggerToast } from '@/components/common/GlobalToast';

const DEFAULT_HANDMADE_OPTIONS = [
  {
    id: 'default-opt-color',
    option_name: 'Color Theme',
    is_required: true,
    choices: [
      { label: 'Pastel Blush Pink', extra_cost: 0 },
      { label: 'Crimson Velvet Red', extra_cost: 0 },
      { label: 'Lilac Lavender', extra_cost: 0 },
      { label: 'Sunflower Warm Yellow', extra_cost: 0 },
    ],
  },
];

export default function QuickOptionModal() {
  const [product, setProduct] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const addBtnRef = useRef(null);
  const { addItem } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scrolling completely when QuickOptionModal is open
  useEffect(() => {
    if (isOpen && !isClosing) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      const preventBackgroundScroll = (e) => {
        if (!e.target.closest('.quick-sheet-content')) {
          e.preventDefault();
        }
      };

      window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
      window.addEventListener('wheel', preventBackgroundScroll, { passive: false });

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
        document.body.style.touchAction = originalTouchAction || '';
        window.removeEventListener('touchmove', preventBackgroundScroll);
        window.removeEventListener('wheel', preventBackgroundScroll);
      };
    }
  }, [isOpen, isClosing]);

  useEffect(() => {
    const handleOpen = (e) => {
      const prod = e.detail?.product;
      const photo = e.detail?.photoUrl;
      if (!prod) return;

      setProduct(prod);
      setPhotoUrl(photo || '');
      setSelectedOptions({});
      setQuantity(1);
      setAdded(false);
      setIsClosing(false);
      setIsOpen(true);
    };

    window.addEventListener('likha_open_quick_option', handleOpen);
    return () => window.removeEventListener('likha_open_quick_option', handleOpen);
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setProduct(null);
    }, 220);
  };

  if (!mounted || !isOpen || !product) return null;

  const options = (product.product_options && product.product_options.length > 0)
    ? product.product_options
    : DEFAULT_HANDMADE_OPTIONS;

  const isOnSale = Boolean(product.is_on_sale && product.sale_price && Number(product.base_price) > Number(product.sale_price));
  const originalBasePrice = parseFloat(product.base_price || 0);
  const effectiveBasePrice = isOnSale ? parseFloat(product.sale_price) : originalBasePrice;

  const extraCost = Object.values(selectedOptions).reduce(
    (sum, opt) => sum + (opt?.extraCost || 0),
    0
  );
  const unitPrice = effectiveBasePrice + extraCost;
  const totalPrice = unitPrice * quantity;

  const handleOptionSelect = (optionName, value, optExtraCost) => {
    setSelectedOptions((prev) => {
      if (!value || value === '---' || value === '— Select —') {
        const next = { ...prev };
        delete next[optionName];
        return next;
      }
      return {
        ...prev,
        [optionName]: { value, extraCost: optExtraCost || 0 },
      };
    });
  };

  const requiredOptions = (options || []).filter(
    (opt) => opt.is_required !== false && Array.isArray(opt.choices) && opt.choices.length > 0
  );
  const missingRequiredOptions = requiredOptions.filter((opt) => {
    const val = selectedOptions[opt.option_name]?.value;
    return !val || val === '— Select —' || val === '---' || val.trim() === '';
  });
  const hasMissingOptions = missingRequiredOptions.length > 0;

  const getFilteredSelectedOptions = () => {
    return Object.entries(selectedOptions)
      .filter(([_, opt]) => opt?.value && opt.value !== '— Select —' && opt.value !== '---' && opt.value.trim() !== '')
      .map(([name, { value, extraCost: optCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: optCost || 0,
      }));
  };

  const handleAddToCart = () => {
    if (hasMissingOptions || added) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const coverPhoto = product.product_photos?.find((p) => p.is_cover) || product.product_photos?.[0];
    const resolvedPhoto = photoUrl || (coverPhoto?.url ? coverPhoto.url : (coverPhoto?.storage_path && supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/product-photos/${coverPhoto.storage_path}` : null));

    addItem({
      productId: product.id || `prod-${product.slug}`,
      productSlug: product.slug,
      productName: product.name,
      photo: resolvedPhoto,
      basePrice: effectiveBasePrice,
      unitPrice,
      quantity,
      options: getFilteredSelectedOptions(),
    });

    setAdded(true);

    // Trigger Parabolic Fly Animation
    try {
      const btnEl = addBtnRef.current;
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        window.dispatchEvent(
          new CustomEvent('likha_fly_to_cart', {
            detail: {
              startX,
              startY,
              photo: resolvedPhoto,
            },
          })
        );
      }
    } catch {}

    // Trigger Sleek Toast Notification with selected options
    const selectedLabels = Object.values(selectedOptions)
      .map((o) => o?.value)
      .filter(Boolean)
      .join(', ');

    triggerToast({
      title: 'Added to Cart! ✨',
      message: `${product.name}${selectedLabels ? ` (${selectedLabels})` : ''}`,
      photo: resolvedPhoto,
      type: 'cart',
      quantity,
    });

    // Close sheet immediately without delay
    handleClose();
  };

  return createPortal(
    <div
      className="quick-sheet-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
        animation: isClosing ? 'quickBackdropExit 0.22s ease forwards' : 'quickBackdropEnter 0.25s ease forwards',
      }}
    >
      <style>{`
        @keyframes quickBackdropEnter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes quickBackdropExit {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes quickSheetSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0.9;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes quickSheetSlideDown {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0.9;
          }
        }
        @media (min-width: 640px) {
          .quick-sheet-overlay {
            align-items: center !important;
            padding: 20px !important;
          }
          .quick-sheet-content {
            border-radius: 24px !important;
            max-height: 85vh !important;
            box-shadow: 0 20px 45px rgba(0,0,0,0.2) !important;
          }
        }
      `}</style>

      <div
        className="quick-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--color-surface, #FFFFFF)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          padding: '18px 20px 24px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
          animation: isClosing
            ? 'quickSheetSlideDown 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            : 'quickSheetSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Top Drag Handle (Mobile UX) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '999px',
              background: 'var(--color-border, #E2E8F0)',
            }}
          />
        </div>

        {/* Product Header Row */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '14px',
              overflow: 'hidden',
              background: 'var(--color-surface-warm, #FAF8F5)',
              border: '1px solid var(--color-border-light, #F1F5F9)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <i className="fa-solid fa-gift" style={{ color: 'var(--color-text-muted)', fontSize: '24px' }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingRight: '28px' }}>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--color-text, #1E293B)',
                margin: '0 0 4px 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {product.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  color: isOnSale ? 'var(--color-primary, #C2410C)' : 'var(--color-text, #1E293B)',
                }}
              >
                {formatCurrency(unitPrice)}
              </span>
              {isOnSale && (
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-muted, #94A3B8)',
                    textDecoration: 'line-through',
                    fontWeight: '500',
                  }}
                >
                  {formatCurrency(originalBasePrice + extraCost)}
                </span>
              )}
            </div>

            <Link
              href={`/shop/${product.slug}`}
              onClick={handleClose}
              style={{
                fontSize: '11.5px',
                color: 'var(--color-primary, #C2410C)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '3px',
              }}
            >
              <span>View full details</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px' }} />
            </Link>
          </div>

          {/* Close X Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Option Selectors List (Overflow Visible so Dropdown never gets clipped) */}
        <div
          style={{
            overflow: 'visible',
            paddingRight: '0',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
          }}
        >
          {options.map((opt) => {
            if (!opt.choices || opt.choices.length === 0) return null;
            return (
              <OptionSelector
                key={opt.id || opt.option_name}
                option={opt}
                optionName={opt.option_name}
                choices={opt.choices}
                selected={selectedOptions[opt.option_name]?.value}
                onSelect={(val, cost) => handleOptionSelect(opt.option_name, val, cost)}
                required={opt.is_required !== false}
              />
            );
          })}

          {/* Quantity Selector inside Sheet */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#F8FAFC',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              marginTop: '4px',
            }}
          >
            <div>
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text, #1E293B)', display: 'block' }}>
                Quantity
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Number of pieces
              </span>
            </div>
            <QuantityControl value={quantity} onChange={setQuantity} min={1} />
          </div>
        </div>

        {/* Bottom Action Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
          <button
            ref={addBtnRef}
            type="button"
            onClick={handleAddToCart}
            disabled={hasMissingOptions || added}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '999px',
              border: 'none',
              background: added
                ? '#16A34A'
                : hasMissingOptions
                  ? '#CBD5E1'
                  : 'linear-gradient(135deg, var(--color-primary, #C25E38) 0%, #B84E29 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: hasMissingOptions ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: hasMissingOptions ? 'none' : '0 4px 14px rgba(194, 94, 56, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <i className={added ? 'fa-solid fa-check' : 'fa-solid fa-cart-plus'} />
            <span>
              {added
                ? 'Added to Cart!'
                : hasMissingOptions
                  ? `Select ${missingRequiredOptions[0]?.option_name || 'Option'}`
                  : `Add to Cart · ${formatCurrency(totalPrice)}`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
