'use client';

import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'likha_cart';

// Global shared in-memory store across all hook callers
let globalCart = [];
let isStoreInitialized = false;
const listeners = new Set();

function getStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

function saveCart(newCart) {
  globalCart = newCart;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('likha_cart_updated'));
    } catch {}
  }
  listeners.forEach((listener) => {
    try {
      listener(globalCart);
    } catch {}
  });
}

function initStoreIfNeeded() {
  if (isStoreInitialized || typeof window === 'undefined') return;
  globalCart = getStoredCart();
  isStoreInitialized = true;

  const handleStorage = (e) => {
    if (!e || e.key === CART_KEY) {
      globalCart = getStoredCart();
      listeners.forEach((listener) => {
        try {
          listener(globalCart);
        } catch {}
      });
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('focus', () => {
    const fresh = getStoredCart();
    if (JSON.stringify(fresh) !== JSON.stringify(globalCart)) {
      globalCart = fresh;
      listeners.forEach((listener) => {
        try {
          listener(globalCart);
        } catch {}
      });
    }
  });
}

const isOptionEqual = (optsA = [], optsB = []) => {
  const cleanA = (optsA || []).filter((o) => o?.optionValue && o.optionValue !== '---');
  const cleanB = (optsB || []).filter((o) => o?.optionValue && o.optionValue !== '---');
  if (cleanA.length !== cleanB.length) return false;
  if (cleanA.length === 0 && cleanB.length === 0) return true;

  const normA = cleanA
    .map((o) => `${(o.optionName || '').trim().toLowerCase()}:${(o.optionValue || '').trim().toLowerCase()}`)
    .sort()
    .join('|');
  const normB = cleanB
    .map((o) => `${(o.optionName || '').trim().toLowerCase()}:${(o.optionValue || '').trim().toLowerCase()}`)
    .sort()
    .join('|');
  return normA === normB;
};

export function useCart() {
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    initStoreIfNeeded();
    setCart([...globalCart]);
    setIsLoaded(true);

    const handleUpdate = (updatedCart) => {
      setCart([...updatedCart]);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  /**
   * Add single item to cart (increments quantity if matching product + options exist)
   */
  const addItem = useCallback((item) => {
    initStoreIfNeeded();
    const currentCart = [...getStoredCart()];
    const qtyToAdd = Math.max(1, parseInt(item.quantity, 10) || 1);

    const existIdx = currentCart.findIndex((c) => {
      const cId = c.productId ? String(c.productId).trim() : '';
      const itemId = item.productId ? String(item.productId).trim() : '';
      const cSlug = c.productSlug ? String(c.productSlug).trim() : '';
      const itemSlug = item.productSlug ? String(item.productSlug).trim() : '';

      const validIdMatch = cId && itemId && cId !== 'undefined' && cId !== 'null' && cId === itemId;
      const validSlugMatch = cSlug && itemSlug && cSlug !== 'undefined' && cSlug !== 'null' && cSlug === itemSlug;
      const validNameMatch = !cId && !itemId && !cSlug && !itemSlug && c.productName && item.productName && c.productName.trim().toLowerCase() === item.productName.trim().toLowerCase();

      if (!validIdMatch && !validSlugMatch && !validNameMatch) return false;

      return isOptionEqual(c.options, item.options);
    });

    let next;
    if (existIdx !== -1) {
      // Same item with same options: update quantity in-place without re-ordering
      const existing = currentCart[existIdx];
      const updatedItem = {
        ...existing,
        quantity: (parseInt(existing.quantity, 10) || 1) + qtyToAdd,
        unitPrice: item.unitPrice !== undefined ? item.unitPrice : existing.unitPrice,
      };
      next = currentCart.map((c, idx) => (idx === existIdx ? updatedItem : c));
    } else {
      // New distinct item / different options: prepend to top of cart
      const uniqueId = item.cartItemId || `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      next = [{ ...item, quantity: qtyToAdd, cartItemId: uniqueId }, ...currentCart];
    }

    saveCart(next);

    // Trigger luxury Dynamic Island toast notification
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'cart',
              title: 'Added to Cart! ✨',
              message: item.productName || 'Handcrafted Item',
              photo: item.photo || null,
              quantity: qtyToAdd,
              actionLabel: 'View Cart',
              actionUrl: '/cart',
              duration: 3200,
            },
          })
        );
      } catch {}
    }
  }, []);

  /**
   * Add multiple items at once (atomic single storage write)
   */
  const addItems = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    initStoreIfNeeded();
    let currentCart = [...getStoredCart()];

    items.forEach((item) => {
      const qtyToAdd = Math.max(1, parseInt(item.quantity, 10) || 1);
      const existIdx = currentCart.findIndex((c) => {
        const cId = c.productId ? String(c.productId).trim() : '';
        const itemId = item.productId ? String(item.productId).trim() : '';
        const cSlug = c.productSlug ? String(c.productSlug).trim() : '';
        const itemSlug = item.productSlug ? String(item.productSlug).trim() : '';

        const validIdMatch = cId && itemId && cId !== 'undefined' && cId !== 'null' && cId === itemId;
        const validSlugMatch = cSlug && itemSlug && cSlug !== 'undefined' && cSlug !== 'null' && cSlug === itemSlug;
        const validNameMatch = !cId && !itemId && !cSlug && !itemSlug && c.productName && item.productName && c.productName.trim().toLowerCase() === item.productName.trim().toLowerCase();

        if (!validIdMatch && !validSlugMatch && !validNameMatch) return false;
        return isOptionEqual(c.options, item.options);
      });

      if (existIdx !== -1) {
        const existing = currentCart[existIdx];
        const updatedItem = {
          ...existing,
          quantity: (parseInt(existing.quantity, 10) || 1) + qtyToAdd,
        };
        currentCart = currentCart.map((c, idx) => (idx === existIdx ? updatedItem : c));
      } else {
        const uniqueId = item.cartItemId || `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        currentCart = [{ ...item, quantity: qtyToAdd, cartItemId: uniqueId }, ...currentCart];
      }
    });

    saveCart(currentCart);

    if (typeof window !== 'undefined') {
      try {
        const totalCount = items.reduce((s, i) => s + (parseInt(i.quantity, 10) || 1), 0);
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'cart',
              title: 'Items Added to Cart! ✨',
              message: `${totalCount} item${totalCount > 1 ? 's' : ''} added to your cart`,
              photo: items[0]?.photo || null,
              quantity: totalCount,
              actionLabel: 'View Cart',
              actionUrl: '/cart',
              duration: 3200,
            },
          })
        );
      } catch {}
    }
  }, []);

  /** Remove single item by cartItemId */
  const removeItem = useCallback((cartItemId) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const next = currentCart.filter((c) => c.cartItemId !== cartItemId);
    saveCart(next);
  }, []);

  /** Remove multiple items by cartItemIds (atomic single storage write) */
  const removeItems = useCallback((cartItemIds = []) => {
    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) return;
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const idsSet = new Set(cartItemIds);
    const next = currentCart.filter((c) => !idsSet.has(c.cartItemId));
    saveCart(next);
  }, []);

  /** Update quantity of an item */
  const updateQty = useCallback((cartItemId, quantity) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const targetQty = parseInt(quantity, 10);
    if (isNaN(targetQty) || targetQty <= 0) {
      const next = currentCart.filter((c) => c.cartItemId !== cartItemId);
      saveCart(next);
      return;
    }
    const next = currentCart.map((c) => (c.cartItemId === cartItemId ? { ...c, quantity: targetQty } : c));
    saveCart(next);
  }, []);

  /** Update item properties */
  const updateItem = useCallback((cartItemId, updates) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const next = currentCart.map((c) => (c.cartItemId === cartItemId ? { ...c, ...updates } : c));
    saveCart(next);
  }, []);

  /** Clear entire cart */
  const clearCart = useCallback(() => {
    saveCart([]);
  }, []);

  const totalQuantity = cart.reduce((sum, c) => sum + (parseInt(c.quantity, 10) || 1), 0);
  const distinctCount = cart.length;
  const itemCount = totalQuantity; // Count total item units for badges
  const subtotal = cart.reduce((sum, c) => {
    return sum + (parseFloat(c.unitPrice) || 0) * (parseInt(c.quantity, 10) || 1);
  }, 0);

  return {
    cart,
    itemCount,
    distinctCount,
    totalQuantity,
    subtotal,
    isLoaded,
    addItem,
    addItems,
    removeItem,
    removeItems,
    updateQty,
    updateItem,
    clearCart,
  };
}

