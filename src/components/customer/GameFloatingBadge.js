'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ArtsyFunZoneModal from './ArtsyFunZoneModal';

export default function GameFloatingBadge() {
  const pathname = usePathname() || '';
  const [isOpen, setIsOpen] = useState(false);

  // Listen for global custom trigger events to launch games from anywhere
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('likha_open_games', handleOpen);
    window.addEventListener('open_arcade', handleOpen);
    return () => {
      window.removeEventListener('likha_open_games', handleOpen);
      window.removeEventListener('open_arcade', handleOpen);
    };
  }, []);

  // Exclude strictly on cart, checkout, confirmation, preview, login, and admin to maintain distraction-free workflows
  const isExcluded =
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/confirmation') ||
    pathname.startsWith('/preview') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login');

  if (isExcluded) {
    return null;
  }

  return (
    <>
      <div className="game-floating-badge">
        <button
          type="button"
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

