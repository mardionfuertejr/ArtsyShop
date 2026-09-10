'use client';

import { useState, useEffect } from 'react';

/**
 * Global Flying Cart Animation Manager
 * Listens for `likha_fly_to_cart` custom events and animates a circular
 * product particle from the clicked button up to the upper-right cart icon.
 */
export default function GlobalFlyingCart() {
  const [flyingItems, setFlyingItems] = useState([]);

  useEffect(() => {
    const handleFlyToCart = (e) => {
      const { startX, startY, photo, customTargetX, customTargetY } = e.detail || {};
      if (startX === undefined || startY === undefined) return;

      // Locate the top-right cart button in the current viewport
      const cartEl =
        document.getElementById('cart-icon-btn') ||
        document.getElementById('detail-cart-btn') ||
        document.querySelector('.cart-btn-wrapper');

      let targetX = customTargetX;
      let targetY = customTargetY;

      if (targetX === undefined || targetY === undefined) {
        if (cartEl) {
          const rect = cartEl.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
        } else {
          // Fallback to upper right corner of viewport
          targetX = typeof window !== 'undefined' ? window.innerWidth - 36 : 300;
          targetY = 28;
        }
      }

      const particleId = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newParticle = {
        id: particleId,
        startX: `${startX}px`,
        startY: `${startY}px`,
        targetX: `${targetX}px`,
        targetY: `${targetY}px`,
        photo,
      };

      setFlyingItems((prev) => [...prev, newParticle]);

      // When the particle reaches the cart (650ms), bump cart icon and pop badge
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('likha_cart_updated'));
        } catch {}

        setFlyingItems((prev) => prev.filter((item) => item.id !== particleId));
      }, 650);
    };

    window.addEventListener('likha_fly_to_cart', handleFlyToCart);
    return () => window.removeEventListener('likha_fly_to_cart', handleFlyToCart);
  }, []);

  if (flyingItems.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
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
            <img src={item.photo} alt="Item flying to cart" />
          ) : (
            <i className="fa-solid fa-gift" style={{ color: '#FFFFFF', fontSize: '18px' }} />
          )}
        </div>
      ))}
    </div>
  );
}
