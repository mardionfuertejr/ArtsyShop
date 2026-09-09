'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CUSTOM_ORDER_MESSENGER_URL } from '@/lib/constants/customPrompts';
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
  const { cart, itemCount, subtotal, removeItem, updateQty, updateItem, isLoaded } = useCart();
  const [mounted, setMounted] = useState(false);

  // Shopee-style Item Selection State
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  // Dropdown & Modal States
  const [openMenuId, setOpenMenuId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize & sync selected items when cart items change
  useEffect(() => {
    if (cart.length > 0) {
      setSelectedItemIds((prev) => {
        // If not initialized yet, select all by default
        if (prev.length === 0) {
          return cart.map((i) => i.cartItemId);
        }
        // Filter out IDs no longer in cart
        const valid = prev.filter((id) => cart.some((c) => c.cartItemId === id));
        return valid.length > 0 ? valid : cart.map((i) => i.cartItemId);
      });
    } else {
      setSelectedItemIds([]);
    }
  }, [cart]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (viewingItem || editingItem || itemToDelete || batchDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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

  // Batch delete selected items
  const handleBatchDelete = () => {
    selectedItemIds.forEach((id) => removeItem(id));
    setSelectedItemIds([]);
    setBatchDeleteModalOpen(false);
  };

  // Calculate selected items, subtotal & count
  const selectedItems = cart.filter((item) => selectedItemIds.includes(item.cartItemId));
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedSubtotal = selectedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1);
  }, 0);

  // Navigate to checkout with only selected items
  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) return;
    try {
      localStorage.setItem('likha_checkout_items', JSON.stringify(selectedItemIds));
    } catch {}
    router.push('/checkout');
  };

  // Edit modal state
  const [editOptions, setEditOptions] = useState([]);
  const [selectedEditOptions, setSelectedEditOptions] = useState({});
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

  // Handle opening Edit Modal
  const handleOpenEdit = async (item) => {
    setEditingItem(item);
    setEditLoading(true);

    // Set initial selected options from existing cart item
    const initialMap = {};
    (item.options || []).forEach((opt) => {
      initialMap[opt.optionName] = {
        value: opt.optionValue,
        extraCost: parseFloat(opt.additionalCost) || 0,
      };
    });
    setSelectedEditOptions(initialMap);

    // Fetch product options from Supabase or mockData
    try {
      const supabase = createClient();
      if (supabase && item.productId) {
        const { data } = await supabase
          .from('product_options')
          .select('*')
          .eq('product_id', item.productId)
          .order('display_order', { ascending: true });

        if (data && data.length > 0) {
          setEditOptions(data);
          setEditLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback to mock product options
    const mock = getMockProductBySlug(item.productSlug);
    if (mock?.product_options) {
      setEditOptions(mock.product_options);
    } else {
      setEditOptions([]);
    }
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
    setSelectedEditOptions((prev) => ({
      ...prev,
      [optionName]: { value, extraCost },
    }));
  };

  // Calculate live total price in Edit modal
  const editExtraCost = Object.values(selectedEditOptions).reduce(
    (sum, opt) => sum + (parseFloat(opt.extraCost) || 0),
    0
  );
  const editUnitPrice = itemBasePrice + editExtraCost;
  const editLinePrice = editingItem
    ? editUnitPrice * editingItem.quantity
    : 0;

  // Save changes from Edit Modal
  const handleSaveEdit = () => {
    if (!editingItem) return;

    const formattedOptions = Object.entries(selectedEditOptions).map(
      ([name, { value, extraCost }]) => ({
        optionName: name,
        optionValue: value,
        additionalCost: extraCost,
      })
    );

    updateItem(editingItem.cartItemId, {
      basePrice: itemBasePrice,
      unitPrice: editUnitPrice,
      options: formattedOptions,
    });

    setEditingItem(null);
  };

  if (!isLoaded) {
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
          <a href={CUSTOM_ORDER_MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="top-bar-link">Custom Orders</a>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </header>

      <main className="page-content page-enter">
        {cart.length === 0 ? (
          <EmptyState
            icon={<i className="fa-solid fa-basket-shopping" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}></i>}
            title="Your cart is empty"
            action={
              <Link href="/shop" className="btn btn-primary" id="cart-shop-btn">
                Browse Collection
              </Link>
            }
          />
        ) : (
          <>
            <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: 'var(--space-3)' }}>
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
                  Select All ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </span>
                {selectedItemIds.length > 0 && (
                  <button
                    type="button"
                    className="cart-delete-selected-btn"
                    onClick={() => setBatchDeleteModalOpen(true)}
                    aria-label="Delete selected items"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    <span>Delete ({selectedItemIds.length})</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.map((item) => {
                const lineTotal = (parseFloat(item.unitPrice) || 0) * item.quantity;
                const isMenuOpen = Boolean(openMenuId && openMenuId === item.cartItemId);
                const isSelected = selectedItemIds.includes(item.cartItemId);

                return (
                  <div
                    key={item.cartItemId || `item-${item.productId}`}
                    className={`cart-item ${isSelected ? 'selected' : ''} ${isMenuOpen ? 'menu-active' : ''}`}
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
                        background: 'var(--color-primary-lighter)',
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
                          min={1}
                        />
                        <p className="cart-item-price">{formatCurrency(lineTotal)}</p>
                      </div>
                    </div>

                    {/* Three-Dot Action Menu Container */}
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
                        <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: '15px' }}></i>
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
                    Subtotal ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected)
                  </span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(selectedSubtotal)}</span>
                </div>
                <div className="order-summary-row" style={{ padding: '4px 0', fontSize: '13px' }}>
                  <span>Delivery fee</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>TBD at checkout</span>
                </div>
                <div className="order-summary-row total" style={{ marginTop: '6px', paddingTop: '8px', fontSize: '14px' }}>
                  <span>Estimated Total</span>
                  <span className="amount" style={{ fontSize: '17px' }}>{formatCurrency(selectedSubtotal)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {cart.length > 0 && (
        <div className="sticky-cta">
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
              <span>Proceed to Checkout ({selectedCount}) · {formatCurrency(selectedSubtotal)}</span>
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
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
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
                  <img src={viewingItem.photo} alt={viewingItem.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)} style={{ padding: '16px' }}>
          <div
            className="modal"
            style={{ maxWidth: '420px', padding: '24px 20px', textAlign: 'left', maxHeight: '85vh', overflowY: 'auto' }}
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
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Product header */}
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
                width: '48px',
                height: '48px',
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
                  <img src={editingItem.photo} alt={editingItem.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)', fontSize: '16px' }}></i>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {editingItem.productName}
                </h4>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)', margin: 0 }}>
                  Updated Total: {formatCurrency(editLinePrice)}
                </p>
              </div>
            </div>

            {/* Option Selectors */}
            {editLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading options...
              </div>
            ) : editOptions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
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
                No custom option variants available for this item.
              </div>
            )}

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
                style={{ height: '42px', fontSize: '13px', fontWeight: '600', borderRadius: 'var(--radius-full)' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. REMOVE FROM CART CONFIRMATION DIALOG ─────────── */}
      {itemToDelete && (
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
                {itemToDelete.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={itemToDelete.photo}
                    alt={itemToDelete.productName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: 'var(--color-primary)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {itemToDelete.productName}
                </p>
                {itemToDelete.options?.length > 0 && (
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
                onClick={() => {
                  removeItem(itemToDelete.cartItemId);
                  setItemToDelete(null);
                }}
                style={{
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Remove from Cart
              </button>
            </div>
          </div>
        </div>
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
              Delete {selectedItemIds.length} {selectedItemIds.length === 1 ? 'item' : 'items'}?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.4 }}>
              Are you sure you want to remove all selected items from your cart?
            </p>

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
                }}
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
