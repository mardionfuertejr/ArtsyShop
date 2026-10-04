'use client';

import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'likha_cart';

// Global shared in-memory store across all hook callers
let globalCart = [];
let isStoreInitialized = false;
const listeners = new Set();

/**
 * Check if two cart items are the same product (by id, slug, or name)
 */
export function isSameProduct(a, b) {
  if (!a || !b) return false;
  const aId = String(a.productId || a.id || '').trim();
  const bId = String(b.productId || b.id || '').trim();
  const aSlug = String(a.productSlug || a.slug || '').trim();
  const bSlug = String(b.productSlug || b.slug || '').trim();
  const aName = String(a.productName || a.name || '').trim().toLowerCase();
  const bName = String(b.productName || b.name || '').trim().toLowerCase();

  if (aId && bId && aId !== 'undefined' && aId !== 'null' && aId === bId) return true;
  if (aSlug && bSlug && aSlug !== 'undefined' && aSlug !== 'null' && aSlug === bSlug) return true;
  if (aName && bName && aName === bName) return true;
  return false;
}

/**
 * Normalize options array for robust comparison
 */
export function normalizeOptions(opts = []) {
  if (!Array.isArray(opts)) return [];
  return opts
    .map((o) => {
      const name = String(o?.optionName || o?.name || o?.option_name || o?.label || '').trim().toLowerCase();
      const value = String(o?.optionValue || o?.value || o?.option_value || '').trim().toLowerCase();
      return { name, value };
    })
    .filter((o) => o.value && o.value !== '---' && o.value !== '— select —');
}

/**
 * Compare two options lists for exact equivalence
 */
export function isOptionEqual(optsA = [], optsB = []) {
  const normA = normalizeOptions(optsA).map((o) => `${o.name}:${o.value}`).sort().join('|');
  const normB = normalizeOptions(optsB).map((o) => `${o.name}:${o.value}`).sort().join('|');
  return normA === normB;
}

/**
 * Consolidate / merge duplicate items in a cart list
 */
export function consolidateCartItems(rawCart = []) {
  if (!Array.isArray(rawCart) || rawCart.length <= 1) return rawCart || [];
  const result = [];

  for (const item of rawCart) {
    if (!item) continue;
    const existingIdx = result.findIndex((r) => isSameProduct(r, item) && isOptionEqual(r.options, item.options));

    if (existingIdx !== -1) {
      result[existingIdx] = {
        ...result[existingIdx],
        quantity: (parseInt(result[existingIdx].quantity, 10) || 1) + (parseInt(item.quantity, 10) || 1),
      };
    } else {
      result.push({ ...item });
    }
  }

  return result;
}

function getStoredCart() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const consolidated = consolidateCartItems(parsed);
        if (consolidated.length !== parsed.length) {
          localStorage.setItem(CART_KEY, JSON.stringify(consolidated));
        }
        return consolidated;
      }
    }
  } catch {}
  return [];
}

function saveCart(newCart) {
  const consolidated = consolidateCartItems(newCart);
  globalCart = consolidated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(consolidated));
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

    const existIdx = currentCart.findIndex((c) => isSameProduct(c, item) && isOptionEqual(c.options, item.options));

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
      const existIdx = currentCart.findIndex((c) => isSameProduct(c, item) && isOptionEqual(c.options, item.options));

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

  /** Update quantity of item */
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

  /** Update whole item options or metadata */
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

  return {
    cart,
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
