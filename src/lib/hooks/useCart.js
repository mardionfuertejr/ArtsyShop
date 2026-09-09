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
    if (!e || e.key === CART_KEY || e.type === 'likha_cart_updated') {
      globalCart = getStoredCart();
      listeners.forEach((listener) => {
        try {
          listener(globalCart);
        } catch {}
      });
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('likha_cart_updated', handleStorage);
  window.addEventListener('focus', handleStorage);
}

export function useCart() {
  const [cart, setCart] = useState(() => {
    if (typeof window !== 'undefined') {
      initStoreIfNeeded();
      return globalCart;
    }
    return [];
  });
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
   * Add item to cart (increments quantity if matching product + options exist)
   */
  const addItem = useCallback((item) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();

    const isOptionEqual = (optsA = [], optsB = []) => {
      if (optsA.length !== optsB.length) return false;
      const normA = optsA.map(o => `${o.optionName}:${o.optionValue}`).sort().join('|');
      const normB = optsB.map(o => `${o.optionName}:${o.optionValue}`).sort().join('|');
      return normA === normB;
    };

    const existIdx = currentCart.findIndex((c) => {
      const idMatch = (c.productId && item.productId && c.productId === item.productId) ||
                      (c.productSlug && item.productSlug && c.productSlug === item.productSlug);
      if (!idMatch) return false;

      if ((c.options?.length || 0) > 0 || (item.options?.length || 0) > 0) {
        return isOptionEqual(c.options || [], item.options || []);
      }
      return true;
    });

    let next;
    if (existIdx !== -1) {
      const existing = currentCart[existIdx];
      const updatedItem = {
        ...existing,
        quantity: (existing.quantity || 1) + (item.quantity || 1),
      };
      // Move updated item to the top of the cart
      const remaining = currentCart.filter((_, idx) => idx !== existIdx);
      next = [updatedItem, ...remaining];
    } else {
      const uniqueId = item.cartItemId || `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      // Prepend newest item to the top of the cart
      next = [{ ...item, cartItemId: uniqueId }, ...currentCart];
    }

    saveCart(next);
  }, []);

  /** Remove item by cartItemId */
  const removeItem = useCallback((cartItemId) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const next = currentCart.filter((c) => c.cartItemId !== cartItemId);
    saveCart(next);
  }, []);

  /** Update quantity of an item */
  const updateQty = useCallback((cartItemId, quantity) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    if (quantity <= 0) {
      const next = currentCart.filter((c) => c.cartItemId !== cartItemId);
      saveCart(next);
      return;
    }
    const next = currentCart.map((c) => c.cartItemId === cartItemId ? { ...c, quantity } : c);
    saveCart(next);
  }, []);

  /** Update item properties */
  const updateItem = useCallback((cartItemId, updates) => {
    initStoreIfNeeded();
    const currentCart = getStoredCart();
    const next = currentCart.map((c) => c.cartItemId === cartItemId ? { ...c, ...updates } : c);
    saveCart(next);
  }, []);

  /** Clear entire cart */
  const clearCart = useCallback(() => {
    saveCart([]);
  }, []);

  const itemCount = cart.length;
  const totalQuantity = cart.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const subtotal = cart.reduce((sum, c) => {
    return sum + (parseFloat(c.unitPrice) || 0) * (c.quantity || 1);
  }, 0);

  return {
    cart,
    itemCount,
    totalQuantity,
    subtotal,
    isLoaded,
    addItem,
    removeItem,
    updateQty,
    updateItem,
    clearCart,
  };
}
