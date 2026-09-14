'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import EmptyState from '@/components/customer/EmptyState';
import QuantityControl from '@/components/customer/QuantityControl';
import OptionSelector from '@/components/customer/OptionSelector';
import { useCart } from '@/lib/hooks/useCart';
import { createClient } from '@/lib/supabase/client';
import { getMockProductBySlug } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function CartPage() {
  const router = useRouter();
  const { cart, itemCount, totalQuantity, subtotal, removeItem, removeItems, updateQty, updateItem, isLoaded } = useCart();
  const [mounted, setMounted] = useState(false);

  // Shopee-style Item Selection State
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [deletingItemIds, setDeletingItemIds] = useState([]);
  const prevCartLengthRef = useRef(0);

  // Dropdown & Modal States
  const [openMenuId, setOpenMenuId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      document.title = "Shopping Cart | M&M's Artsy";
    }
    try {
      router.prefetch('/checkout');
    } catch {}
  }, [router]);

  // Initialize & sync selected items when cart items change (auto-select all by default)
  useEffect(() => {
    if (!isLoaded) return;
    if (cart.length === 0) {
      setSelectedItemIds([]);
      prevCartLengthRef.current = 0;
      return;
    }

    setSelectedItemIds((prev) => {
      const allCartIds = cart.map((i) => i.cartItemId);
      // Initial load or if previous selection was empty on initial load: select all
      if (prevCartLengthRef.current === 0 || prev.length === 0) {
        prevCartLengthRef.current = cart.length;
        return allCartIds;
      }

      const existingIdsInCart = new Set(allCartIds);
      const stillSelected = prev.filter((id) => existingIdsInCart.has(id));

      if (cart.length > prevCartLengthRef.current) {
        // Items were added: auto-select new item(s) as well
        const previousSet = new Set(prev);
        const newIds = allCartIds.filter((id) => !previousSet.has(id));
        prevCartLengthRef.current = cart.length;
        return [...stillSelected, ...newIds];
      }

      prevCartLengthRef.current = cart.length;
      return stillSelected.length > 0 ? stillSelected : allCartIds;
    });
  }, [cart, isLoaded]);

  // Lock scroll completely when any modal is open
  useEffect(() => {
    if (viewingItem || editingItem || itemToDelete || batchDeleteModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
      };
    }
  }, [viewingItem, editingItem, itemToDelete, batchDeleteModalOpen]);

  // Toggle single item selection
  const toggleSelectItem = (id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const isAllSelected = cart.length > 0 && selectedItemIds.length === cart.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cart.map((i) => i.cartItemId));
    }
  };

  // Animated Single Item Deletion Handler
  const handleConfirmSingleDelete = () => {
    const idToRemove = itemToDelete?.cartItemId;
    setItemToDelete(null);
    if (!idToRemove) return;

    setDeletingItemIds((prev) => [...prev, idToRemove]);
    setSelectedItemIds((prev) => prev.filter((id) => id !== idToRemove));

    setTimeout(() => {
      removeItem(idToRemove);
      setDeletingItemIds((prev) => prev.filter((id) => id !== idToRemove));
    }, 350);
  };

  // Animated Batch delete selected items
  const handleBatchDelete = () => {
    const ids = [...selectedItemIds];
    setBatchDeleteModalOpen(false);
    if (ids.length === 0) return;

    setDeletingItemIds((prev) => [...prev, ...ids]);
    setSelectedItemIds([]);

    setTimeout(() => {
      removeItems(ids);
      setDeletingItemIds((prev) => prev.filter((id) => !ids.includes(id)));
    }, 350);
  };

  // Track if all items or the last item is currently animating deletion
  const isClearingAll = cart.length > 0 && cart.every((item) => deletingItemIds.includes(item.cartItemId));

  // Calculate selected items, subtotal & count
  const selectedItems = cart.filter((item) => selectedItemIds.includes(item.cartItemId));
  const selectedCount = selectedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const selectedSubtotal = selectedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1);
  }, 0);

  // Navigate to checkout with only selected items
  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) return;
    try {
      localStorage.removeItem('likha_direct_checkout_item');
      localStorage.setItem('likha_checkout_items', JSON.stringify(selectedItemIds));
    } catch {}
    router.push('/checkout');
  };

  // Edit modal state
  const [editOptions, setEditOptions] = useState([]);
  const [selectedEditOptions, setSelectedEditOptions] = useState({});
  const [editQuantity, setEditQuantity] = useState(1);
  const [editLoading, setEditLoading] = useState(false);

  // Close dropdown when clicking or tapping outside
  useEffect(() => {
    const handleOutsideInteraction = (e) => {
      if (!e.target.closest('.cart-item-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideInteraction);
    document.addEventListener('click', handleOutsideInteraction);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteraction);
      document.removeEventListener('click', handleOutsideInteraction);
    };
  }, []);

  const DEFAULT_HANDMADE_OPTIONS = [
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
        { label: 'Sage Green', extra_cost: 0 },
        { label: 'Kraft Brown', extra_cost: 0 },
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

  // Handle opening Edit Modal
  const handleOpenEdit = async (item) => {
    setEditingItem(item);
    setEditQuantity(item.quantity || 1);
    setEditLoading(true);

    // Initial map from current item options
    const initialMap = {};
    (item.options || []).forEach((opt) => {
      initialMap[opt.optionName] = {
        value: opt.optionValue,
        extraCost: parseFloat(opt.additionalCost) || 0,
      };
    });

    let loadedOptions = [];

    // 1. Try Supabase
    try {
      const supabase = createClient();
      if (supabase && item.productId) {
        const { data } = await supabase
          .from('product_options')
          .select('*')
          .eq('product_id', item.productId)
          .order('display_order', { ascending: true });

        if (data && data.length > 0) {
          loadedOptions = data;
        }
      }
    } catch {}

    // 2. Try localStorage custom products
    if (loadedOptions.length === 0) {
      try {
        const local = localStorage.getItem('likha_custom_products');
        if (local) {
          const parsed = JSON.parse(local);
          const match = parsed.find((p) => p.id === item.productId || p.slug === item.productSlug);
          if (match?.product_options && match.product_options.length > 0) {
            loadedOptions = match.product_options;
          }
        }
      } catch {}
    }

    // 3. Try mockData
    if (loadedOptions.length === 0) {
      const mock = getMockProductBySlug(item.productSlug);
      if (mock?.product_options && mock.product_options.length > 0) {
        loadedOptions = mock.product_options;
      }
    }

    // 4. Fallback to default handcrafted options so customer always has choices
    if (loadedOptions.length === 0) {
      loadedOptions = DEFAULT_HANDMADE_OPTIONS;
    }

    // Ensure all options have valid selections
    loadedOptions.forEach((opt) => {
      const current = initialMap[opt.option_name];
      if (!current && opt.choices?.length > 0) {
        const first = opt.choices[0];
        const label = typeof first === 'string' ? first : first.label;
        const extraCost = typeof first === 'object' ? (first.extra_cost || 0) : 0;
        const clean = label.replace(/\s*\(\+?₱?[\d,.]+\)/gi, '').replace(/\s*\+?₱[\d,.]+/gi, '').trim();
        initialMap[opt.option_name] = { value: clean, extraCost };
      }
    });

    setSelectedEditOptions(initialMap);
    setEditOptions(loadedOptions);
    setEditLoading(false);
  };

  // Derive base price cleanly
  const itemBasePrice = editingItem
    ? (editingItem.basePrice !== undefined
        ? parseFloat(editingItem.basePrice)
        : (parseFloat(editingItem.unitPrice) || 0) - (editingItem.options || []).reduce((s, o) => s + (parseFloat(o.additionalCost) || 0), 0))
    : 0;

  // Option selection in Edit Modal
  const handleOptionSelect = (optionName, value, extraCost) => {
    setSelectedEditOptions((prev) => {
      if (!value || value === '---' || value === '— Select —') {
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

  // Calculate live total price in Edit modal
  const editExtraCost = Object.values(selectedEditOptions).reduce(
    (sum, opt) => sum + (parseFloat(opt?.extraCost) || 0),
    0
  );
  const editUnitPrice = itemBasePrice + editExtraCost;
  const editLinePrice = editingItem
    ? editUnitPrice * editQuantity
    : 0;

  const missingEditRequiredOptions = (editOptions || []).filter((opt) => {
    if (opt.is_required === false) return false;
    const val = selectedEditOptions[opt.option_name]?.value;
    return !val || val === '— Select —' || val === '---' || val.trim() === '';
  });
  const hasEditMissingOptions = missingEditRequiredOptions.length > 0;

  // Save changes from Edit Modal
  const handleSaveEdit = () => {
    if (!editingItem || hasEditMissingOptions) return;

    const formattedOptions = Object.entries(selectedEditOptions)
      .filter(([_, opt]) => opt?.value && opt.value !== '— Select —' && opt.value !== '---' && opt.value.trim() !== '')
      .map(([name, { value, extraCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: extraCost || 0,
      }));

    updateItem(editingItem.cartItemId, {
      basePrice: itemBasePrice,
      unitPrice: editUnitPrice,
      options: formattedOptions,
    });

    if (editQuantity !== editingItem.quantity) {
      updateQty(editingItem.cartItemId, editQuantity);
    }

    setEditingItem(null);
  };

  if (!isLoaded || !mounted) {
    return (
      <div className="customer-shell">
        <header className="top-bar">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <BrandLogo size="small" />
          </Link>
        </header>
        <main className="page-content">
          <div className="section">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 96, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-3)' }}
              />
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link">Collection</Link>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
            {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
          </span>
        </div>
      </header>

      <main
        className="page-content page-enter"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: cart.length === 0 ? 'calc(100dvh - 124px)' : 'auto',
          justifyContent: cart.length === 0 ? 'center' : 'flex-start',
          alignItems: 'center',
          paddingBottom: cart.length === 0 ? 'calc(var(--bottom-nav-height, 72px) + 24px)' : '100px',
          boxSizing: 'border-box',
        }}
      >
        {cart.length === 0 ? (
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 20px',
              margin: 'auto 0',
              transform: 'translateY(15px)',
            }}
          >
            <EmptyState
              icon={
                <div className="empty-cart-icon-wrapper" style={{ margin: '0 auto 16px' }}>
                  <i className="fa-solid fa-basket-shopping" style={{ fontSize: '2.4rem', color: 'var(--color-primary)' }}></i>
                </div>
              }
              title="Your cart is empty"
              message="Looks like you haven't added any handcrafted items to your cart yet."
              action={
                <Link
                  href="/shop"
                  className="btn btn-primary ripple btn-press"
                  id="cart-shop-btn"
                  style={{
                    padding: '13px 32px',
                    fontSize: '14px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(160, 82, 45, 0.25)',
                    marginTop: '8px',
                  }}
                >
                  <i className="fa-solid fa-sparkles" style={{ fontSize: '13px' }}></i>
                  <span>Browse Collection</span>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div
              className={`section cart-section-content ${isClearingAll ? 'cart-content-exiting' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: 'var(--space-3)' }}
            >
              {/* Shopee-style Master Select All Bar */}
              <div className="cart-select-all-bar">
                <div
                  className={`cart-item-checkbox ${isAllSelected ? 'checked' : ''}`}
                  onClick={toggleSelectAll}
                  role="checkbox"
                  aria-checked={isAllSelected}
                  aria-label="Select all cart items"
                >
                  {isAllSelected && <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>}
                </div>
                <span className="cart-select-all-label" onClick={toggleSelectAll}>
                  Select All ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
                </span>
                {selectedItemIds.length > 0 && (
                  <button
                    type="button"
                    className="cart-delete-selected-btn"
                    onClick={() => setBatchDeleteModalOpen(true)}
                    aria-label="Delete selected items"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    <span>Delete ({selectedItems.length})</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.map((item) => {
                const lineTotal = (parseFloat(item.unitPrice) || 0) * item.quantity;
                const isMenuOpen = Boolean(openMenuId && openMenuId === item.cartItemId);
                const isSelected = selectedItemIds.includes(item.cartItemId);
                const isDeleting = deletingItemIds.includes(item.cartItemId);

                return (
                  <div
                    key={item.cartItemId || `item-${item.productId}`}
                    className={`cart-item ${isSelected ? 'selected' : ''} ${isMenuOpen ? 'menu-active' : ''} ${isDeleting ? 'cart-item-exiting' : ''}`}
                  >
                    {/* Item Checkbox */}
                    <div
                      className={`cart-item-checkbox ${isSelected ? 'checked' : ''}`}
                      onClick={() => toggleSelectItem(item.cartItemId)}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select ${item.productName}`}
                    >
                      {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '11px' }}></i>}
                    </div>

                    {/* Item Image */}
                    <div
                      className="cart-item-image"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-surface-warm)',
                      }}
                    >
                      {item.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photo}
                          alt={item.productName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                        />
                      ) : (
                        <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)', fontSize: '1.25rem' }}></i>
                      )}
                    </div>

                    {/* Item Info (Single line with ellipsis, clean & no extra descriptions) */}
                    <div className="cart-item-info">
                      <p className="cart-item-name" title={item.productName}>{item.productName}</p>
                      {item.options?.length > 0 && (
                        <p className="cart-item-options" title={item.options.map((o) => o.optionValue).join(' · ')}>
                          {item.options.map((o) => o.optionValue).join(' · ')}
                        </p>
                      )}

                      {/* Quantity Controls & Price */}
                      <div className="cart-item-footer">
                        <QuantityControl
                          value={item.quantity}
                          onChange={(qty) => updateQty(item.cartItemId, qty)}
                          onDelete={() => setItemToDelete(item)}
                          min={1}
                        />
                        <p className="cart-item-price">{formatCurrency(lineTotal)}</p>
                      </div>
                    </div>

                    {/* Three-Dot Menu */}
                    <div className={`cart-item-menu-container ${isMenuOpen ? 'active' : ''}`}>
                      <button
                        type="button"
                        className={`cart-item-menu-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === item.cartItemId ? null : item.cartItemId));
                        }}
                        aria-label={`Actions for ${item.productName}`}
                        aria-expanded={isMenuOpen}
                      >
                        <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: '14px' }}></i>
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div className="cart-action-dropdown" role="menu">
                          {/* 1. View Details */}
                          <button
                            type="button"
                            className="cart-dropdown-item"
                            role="menuitem"
                            onClick={() => {
                              setViewingItem(item);
                              setOpenMenuId(null);
                            }}
                          >
                            <i className="fa-regular fa-eye"></i>
                            <span>View Details</span>
                          </button>

                          {/* 2. Edit Item */}
                          <button
                            type="button"
                            className="cart-dropdown-item"
                            role="menuitem"
                            onClick={() => {
                              handleOpenEdit(item);
                              setOpenMenuId(null);
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                            <span>Edit Item</span>
                          </button>

                          {/* Thin Divider Line */}
                          <div className="cart-dropdown-divider" />

                          {/* 3. Remove Item */}
                          <button
                            type="button"
                            className="cart-dropdown-item danger"
                            role="menuitem"
                            onClick={() => {
                              setItemToDelete(item);
                              setOpenMenuId(null);
                            }}
                          >
                            <i className="fa-regular fa-trash-can"></i>
                            <span>Remove Item</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
              );
            })}

              {/* Order Summary (Clean, unified card) */}
              <div className="order-summary" style={{ marginTop: '2px', padding: '14px 16px' }}>
                <h2 className="section-title" style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>
                  Order Summary
                </h2>
                <div className="order-summary-row" style={{ padding: '4px 0', fontSize: '13px' }}>
                  <span>
                    Subtotal ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
                  </span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(selectedSubtotal)}</span>
                </div>
                <div className="order-summary-row" style={{ padding: '4px 0', fontSize: '13px' }}>
                  <span>Delivery fee</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>Calculated at checkout</span>
                </div>
                <div className="order-summary-row total" style={{ marginTop: '6px', paddingTop: '8px', fontSize: '14px' }}>
                  <span>Total Amount</span>
                  <span className="amount" style={{ fontSize: '17px' }}>{formatCurrency(selectedSubtotal)}</span>
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {cart.length > 0 && (
        <div className={`sticky-cta ${isClearingAll ? 'sticky-cta-exiting' : ''}`}>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={selectedItems.length === 0}
            className="btn btn-primary btn-full ripple"
            id="proceed-checkout-btn"
            style={{
              opacity: selectedItems.length === 0 ? 0.45 : 1,
              cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
              height: '46px',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {selectedItems.length === 0 ? (
              <span>Select items to checkout</span>
            ) : (
              <span>Proceed to Checkout · {formatCurrency(selectedSubtotal)}</span>
            )}
          </button>
        </div>
      )}

      {/* ── 1. VIEW DETAILS MODAL ────────────────────────────── */}
      {viewingItem && mounted && createPortal(
        <div className="modal-overlay" onClick={() => setViewingItem(null)} style={{ padding: '16px' }}>
          <div
            className="modal"
            style={{ maxWidth: '400px', padding: '24px 20px', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                Product Details
              </h3>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                style={{
                  background: 'var(--color-surface-warm, #FAF8F5)',
                  border: '1px solid var(--color-border-light, #E5E7EB)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Product image & title card */}
            <div style={{
              display: 'flex',
              gap: '14px',
              padding: '12px',
              background: 'var(--color-surface-warm, #FAF8F5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-lighter)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {viewingItem.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewingItem.photo} alt={viewingItem.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)', fontSize: '20px' }}></i>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 4px', color: 'var(--color-text)' }}>
                  {viewingItem.productName}
                </h4>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>
                  {formatCurrency(viewingItem.unitPrice)}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                  Quantity in Cart: {viewingItem.quantity}
                </p>
              </div>
            </div>

            {/* Selected Options / Variants */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>
                Selected Options:
              </span>
              {viewingItem.options && viewingItem.options.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {viewingItem.options.map((opt, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#FFFFFF',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>{opt.optionName}:</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: '600' }}>
                        {opt.optionValue}
                        {parseFloat(opt.additionalCost) > 0 && ` (+₱${opt.additionalCost})`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>
                  Standard edition (no extra add-ons).
                </p>
              )}
            </div>

            {/* Total Line Price */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'var(--color-primary-lighter)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '18px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>
                Total for this item:
              </span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>
                {formatCurrency((parseFloat(viewingItem.unitPrice) || 0) * viewingItem.quantity)}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link
                href={`/shop/${viewingItem.productSlug}`}
                className="btn btn-secondary"
                style={{ flex: 1, textAlign: 'center', fontSize: '13px', textDecoration: 'none', height: '40px' }}
              >
                Go to Product Page
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewingItem(null)}
                style={{ flex: 1, fontSize: '13px', height: '40px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 2. EDIT ITEM MODAL ──────────────────────────────── */}
      {editingItem && mounted && createPortal(
        <div className="modal-overlay" onClick={() => setEditingItem(null)} style={{ padding: '16px' }}>
          <div
            className="modal"
            style={{ maxWidth: '420px', padding: '22px 20px', textAlign: 'left', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0, color: 'var(--color-text)' }}>
                Edit Item Options
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{
                  background: 'var(--color-surface-warm, #FAF8F5)',
                  border: '1px solid var(--color-border-light, #E5E7EB)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Product header preview */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: 'var(--color-surface-warm, #FAF8F5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-lighter)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {editingItem.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editingItem.photo} alt={editingItem.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)', fontSize: '18px' }}></i>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '700', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {editingItem.productName}
                </h4>
                <p style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-primary)', margin: 0 }}>
                  {formatCurrency(editUnitPrice)} <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: '400' }}>/ unit</span>
                </p>
              </div>
            </div>

            {/* Option Selectors */}
            {editLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> Loading options...
              </div>
            ) : editOptions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {editOptions.map((opt) => (
                  <OptionSelector
                    key={opt.id || opt.option_name}
                    optionName={opt.option_name}
                    choices={opt.choices || []}
                    selected={selectedEditOptions[opt.option_name]?.value}
                    onSelect={(value, extraCost) => handleOptionSelect(opt.option_name, value, extraCost)}
                    required={opt.is_required}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px 0', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                Standard handmade edition.
              </div>
            )}

            {/* Quantity Selector inside Edit Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#FFFFFF',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '16px',
            }}>
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--color-text)', display: 'block' }}>
                  Quantity
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Number of pieces
                </span>
              </div>
              <QuantityControl
                value={editQuantity}
                onChange={setEditQuantity}
                min={1}
              />
            </div>

            {/* Live Price Calculation Summary */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--color-primary-lighter, #FFF5F2)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '18px',
              border: '1px solid rgba(194, 65, 12, 0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                <span>Base Price {editQuantity > 1 ? `(${formatCurrency(itemBasePrice)} × ${editQuantity})` : ''}</span>
                <span>{formatCurrency(itemBasePrice * editQuantity)}</span>
              </div>
              {editExtraCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-primary)', marginBottom: '4px', fontWeight: '600' }}>
                  <span>Custom Add-ons {editQuantity > 1 ? `(+${formatCurrency(editExtraCost)} × ${editQuantity})` : ''}</span>
                  <span>+{formatCurrency(editExtraCost * editQuantity)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                <span>Unit Price</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(editUnitPrice)} / pc</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed rgba(194, 65, 12, 0.25)' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)' }}>Updated Total ({editQuantity} {editQuantity === 1 ? 'pc' : 'pcs'}):</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>{formatCurrency(editLinePrice)}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingItem(null)}
                style={{ height: '42px', fontSize: '13px', fontWeight: '600', borderRadius: 'var(--radius-full)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={hasEditMissingOptions}
                style={{
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-full)',
                  opacity: hasEditMissingOptions ? 0.55 : 1,
                  cursor: hasEditMissingOptions ? 'not-allowed' : 'pointer',
                }}
                title={hasEditMissingOptions ? `Please select ${missingEditRequiredOptions.map((o) => o.option_name).join(', ')}` : ''}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 3. REMOVE FROM CART CONFIRMATION DIALOG ─────────── */}
      {itemToDelete && mounted && createPortal(
        <div className="modal-overlay" onClick={() => setItemToDelete(null)} style={{ padding: '16px' }}>
          <div
            className="modal"
            style={{ maxWidth: '360px', padding: '24px 20px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-modal-title"
          >
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              marginBottom: '14px',
            }}>
              <i className="fa-regular fa-trash-can" />
            </div>

            <h3 id="remove-modal-title" style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 6px', color: 'var(--color-text)' }}>
              Remove this item from your cart?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.45 }}>
              This item will be removed from your cart.
            </p>

            {/* Product mini preview */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: 'var(--color-surface-warm, #FAF8F5)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)',
              marginBottom: '20px',
              textAlign: 'left',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-lighter)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {itemToDelete?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={itemToDelete.photo}
                    alt={itemToDelete.productName || 'Product'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {itemToDelete?.productName || 'Item'}
                </p>
                {itemToDelete?.options?.length > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {itemToDelete.options.map((o) => o.optionValue).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons: Cancel and Remove from Cart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setItemToDelete(null)}
                style={{ height: '42px', fontSize: '13px', fontWeight: '600', borderRadius: 'var(--radius-full)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmSingleDelete}
                style={{
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                }}
              >
                Remove from Cart
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 4. BATCH DELETE CONFIRMATION MODAL ────────────────── */}
      {batchDeleteModalOpen && mounted && createPortal(
        <div className="modal-overlay" onClick={() => setBatchDeleteModalOpen(false)} style={{ padding: '16px' }}>
          <div
            className="modal"
            style={{ maxWidth: '380px', padding: '24px 20px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Warning Trash Icon */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-regular fa-trash-can"></i>
            </div>

            {/* Modal Heading & Subtext */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 6px', color: 'var(--color-text)' }}>
              {selectedItems.length === 1 ? 'Remove from cart?' : `Delete ${selectedItems.length} items?`}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.4 }}>
              {selectedItems.length === 1
                ? 'This item will be removed from your cart.'
                : `Are you sure you want to remove all ${selectedItems.length} selected items from your cart?`}
            </p>

            {/* Selected items preview list */}
            {selectedItems.length === 1 && selectedItems[0] ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: 'var(--color-surface-warm, #FAF8F5)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-light)',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-lighter)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {selectedItems[0].photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedItems[0].photo}
                      alt={selectedItems[0].productName || 'Product'}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedItems[0].productName || 'Item'}
                  </p>
                  {selectedItems[0].options?.length > 0 && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedItems[0].options.map((o) => o.optionValue).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ) : selectedItems.length > 1 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '140px',
                overflowY: 'auto',
                padding: '8px 10px',
                background: 'var(--color-surface-warm, #FAF8F5)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-light)',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                {selectedItems.map((it) => (
                  <div key={it.cartItemId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'var(--color-primary-lighter)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}>
                      {it.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photo} alt={it.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className="fa-solid fa-image" style={{ fontSize: '10px' }} />
                      )}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.productName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      x{it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBatchDeleteModalOpen(false)}
                style={{ height: '42px', fontSize: '13px', fontWeight: '600', borderRadius: 'var(--radius-full)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleBatchDelete}
                style={{
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                }}
              >
                {selectedItems.length === 1 ? 'Remove Item' : `Delete (${selectedItems.length})`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <BottomNav />
    </div>
  );
}
