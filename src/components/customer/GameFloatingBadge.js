'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import ArtsyFunZoneModal from './ArtsyFunZoneModal';

export default function GameFloatingBadge() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Show ONLY on customer browsing/shopping pages (Home, Shop, and Product Details)
  // Hide on checkout, cart, tracking, custom requests, confirmation, and admin
  const isAllowedPage =
    pathname === '/' ||
    pathname === '/shop' ||
    (pathname?.startsWith('/shop/') && !pathname?.startsWith('/shop/custom'));

  if (!isAllowedPage) {
    return null;
  }

  return (
    <>
      <div className="game-floating-badge">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Play Games & Win Vouchers"
          className="arcade-launcher-btn"
        >
          <span className="arcade-mini-tag">₱30 OFF</span>
          <span className="arcade-icon-box">
            <i className="fa-solid fa-gamepad"></i>
          </span>
          <div className="arcade-text-box">
            <span className="arcade-title">
              Artsy Arcade
            </span>
            <span className="arcade-subtitle">
              Win up to ₱30 OFF ✨
            </span>
          </div>
        </button>
      </div>

      <ArtsyFunZoneModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

