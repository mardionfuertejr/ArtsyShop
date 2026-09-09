'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';

export default function CartIconBtn({ className = '', id = 'cart-icon-btn' }) {
  const { itemCount } = useCart();
  const [isBumping, setIsBumping] = useState(false);
  const [prevCount, setPrevCount] = useState(itemCount);

  // Trigger bounce / bump animation when items increase or cart event fires
  useEffect(() => {
    if (itemCount > prevCount) {
      setIsBumping(true);
      const timer = setTimeout(() => setIsBumping(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(itemCount);
  }, [itemCount, prevCount]);

  useEffect(() => {
    const handleCartEvent = () => {
      setIsBumping(true);
      setTimeout(() => setIsBumping(false), 600);
    };

    window.addEventListener('likha_cart_updated', handleCartEvent);
    return () => window.removeEventListener('likha_cart_updated', handleCartEvent);
  }, []);

  return (
    <Link
      href="/cart"
      className={`cart-btn-wrapper ${isBumping ? 'cart-bump' : ''} ${className}`}
      aria-label={`View shopping cart with ${itemCount} items`}
      id={id}
    >
      <div className="cart-btn-icon-box">
        <i className="fa-solid fa-cart-shopping cart-icon-svg" />
        {itemCount > 0 && (
          <span className={`cart-badge-pill ${isBumping ? 'badge-pop' : ''}`} key={itemCount}>
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
    </Link>
  );
}
