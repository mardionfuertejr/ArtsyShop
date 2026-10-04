'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ArtsyFunZoneModal from './ArtsyFunZoneModal';

import { getActiveVoucherTiers } from '@/lib/engine/voucherEngine';

export default function GameFloatingBadge() {
  const pathname = usePathname() || '';
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [maxDiscount, setMaxDiscount] = useState(50);

  useEffect(() => {
    const checkSettings = () => {
      try {
        const tiers = getActiveVoucherTiers();
        if (tiers?.DIAMOND?.discount) {
          setMaxDiscount(tiers.DIAMOND.discount);
        }
        const raw = localStorage.getItem('mm_studio_settings');
        if (raw) {
          const s = JSON.parse(raw);
          if (s.gameDiscountsEnabled !== undefined) {
            setEnabled(Boolean(s.gameDiscountsEnabled));
          }
        }
      } catch {}
    };

    checkSettings();
    window.addEventListener('likha_settings_updated', checkSettings);
    return () => window.removeEventListener('likha_settings_updated', checkSettings);
  }, []);

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

  // Only display the floating arcade launcher on Home ('/') and Shop ('/shop') pages when enabled
  const isAllowedPage = enabled && (pathname === '/' || pathname.startsWith('/shop'));

  return (
    <>
      {isAllowedPage && (
        <div className="game-floating-badge">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Play Games & Win Vouchers"
            className="arcade-launcher-btn"
          >
            <span className="arcade-mini-tag">₱{maxDiscount} OFF</span>
            <span className="arcade-icon-box">
              <i className="fa-solid fa-gamepad"></i>
            </span>
            <div className="arcade-text-box">
              <span className="arcade-title">
                Artsy Arcade
              </span>
              <span className="arcade-subtitle">
                Win up to ₱{maxDiscount} OFF ✨
              </span>
            </div>
          </button>
        </div>
      )}

      <ArtsyFunZoneModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

