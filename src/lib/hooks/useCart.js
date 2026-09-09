'use client';

import { useState, useEffect, useCallback } from 'react';

const CART_KEY = 'likha_cart';

export function useCart() {
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage & listen for cross-component and mobile back/forward sync
  useEffect(() => {
    const loadCart = () => {
      try {
        const stored = localStorage.getItem(CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Deduplicate / ensure unique cartItemId for every item
            const seenIds = new Set();
            const sanitized = parsed.map((item, idx) => {
              let id = item.cartItemId;
              if (!id || seenIds.has(id)) {
                id = `cart-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`;
              }
              seenIds.add(id);
              return { ...item, cartItemId: id };
            });
            setCart(sanitized);
            // Sync sanitized list back to storage if any IDs were fixed
            localStorage.setItem(CART_KEY, JSON.stringify(sanitized));
          }
        }
      } catch {}
      setIsLoaded(true);
    };

    loadCart();

    const handleSync = () => loadCart();
    window.addEventListener('likha_cart_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('pageshow', handleSync); // Handles iOS Safari & Android Chrome back-forward cache
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('likha_cart_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('pageshow', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, isLoaded]);

  const dispatchUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('likha_cart_updated'));
    }
  };

  /**
   * Add item to cart
   * @param {{ productId, productSlug, productName, photo, unitPrice, quantity, options, notes }} item
   */
  const addItem = useCallback((item) => {
    setCart((prev) => {
      // Check if same product + same options exist
      const optKey = JSON.stringify(item.options || []);
      const existIdx = prev.findIndex(
        (c) => c.productId === item.productId && JSON.stringify(c.options || []) === optKey
      );

      let next;
      if (existIdx !== -1) {
        // Increment quantity
        const updated = [...prev];
        updated[existIdx] = {
          ...updated[existIdx],
          quantity: updated[existIdx].quantity + (item.quantity || 1),
        };
        next = updated;
      } else {
        const uniqueId = item.cartItemId || `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 10000)}`;
        next = [...prev, { ...item, cartItemId: uniqueId }];
      }

      try {
        localStorage.setItem(CART_KEY, JSON.stringify(next));
      } catch {}
      setTimeout(dispatchUpdate, 10);
      return next;
    });
  }, []);

  /** Remove item by cartItemId */
  const removeItem = useCallback((cartItemId) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.cartItemId !== cartItemId);
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(next));
      } catch {}
      setTimeout(dispatchUpdate, 10);
      return next;
    });
  }, []);

  /** Update quantity of an item */
  const updateQty = useCallback((cartItemId, quantity) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setCart((prev) => {
      const next = prev.map((c) => c.cartItemId === cartItemId ? { ...c, quantity } : c);
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(next));
      } catch {}
      setTimeout(dispatchUpdate, 10);
      return next;
    });
  }, [removeItem]);

  /** Update item properties (e.g., options, variant, quantity) */
  const updateItem = useCallback((cartItemId, updates) => {
    setCart((prev) => {
      const next = prev.map((c) => c.cartItemId === cartItemId ? { ...c, ...updates } : c);
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(next));
      } catch {}
      setTimeout(dispatchUpdate, 10);
      return next;
    });
  }, []);

  /** Clear entire cart */
  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify([]));
    } catch {}
    setTimeout(dispatchUpdate, 10);
  }, []);

  /** Computed values */
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const subtotal = cart.reduce((sum, c) => {
    return sum + (parseFloat(c.unitPrice) || 0) * (c.quantity || 1);
  }, 0);

  return {
    cart,
    itemCount,
    subtotal,
    isLoaded,
    addItem,
    removeItem,
    updateQty,
    updateItem,
    clearCart,
  };
}
