'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/hooks/useCart';

const NAV_ITEMS = [
  { href: '/',        icon: 'fa-solid fa-house',         label: 'Home'   },
  { href: '/shop',    icon: 'fa-solid fa-bag-shopping',  label: 'Shop'   },
  { href: '/track',   icon: 'fa-solid fa-truck-fast',    label: 'Track'  },
  { href: '/cart',    icon: 'fa-solid fa-cart-shopping', label: 'Cart'   },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
    const handleBump = () => {
      setIsBumping(true);
      setTimeout(() => setIsBumping(false), 500);
    };
    window.addEventListener('likha_cart_updated', handleBump);
    return () => window.removeEventListener('likha_cart_updated', handleBump);
  }, []);

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);
        const isCart = item.href === '/cart';

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${isActive ? ' active' : ''} ${isCart && isBumping ? 'cart-bump' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">
              <i className={item.icon}></i>
              {isCart && itemCount > 0 && (
                <span className={`bottom-nav-badge ${isBumping ? 'badge-pop' : ''}`} key={itemCount}>
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
