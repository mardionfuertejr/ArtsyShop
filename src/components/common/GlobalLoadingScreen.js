'use client';

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes idle / hidden trigger
const INITIAL_LOAD_MIN_MS = 1400; // Comfortable duration to view logo and read brand story
const WAKEUP_LOAD_DURATION_MS = 800; // Snappy duration on wake-up resume

const BRAND_TAGLINE = 'Turning sweet thoughts into timeless gifts.';
const BRAND_SUBTITLE = 'HANDMADE BOUQUETS & PRODUCTS';

export default function GlobalLoadingScreen() {
  const [showInitialSplash, setShowInitialSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showWakeupSplash, setShowWakeupSplash] = useState(false);
  const [wakeupFadingOut, setWakeupFadingOut] = useState(false);

  const lastActiveTimestamp = useRef(Date.now());
  const hiddenTimestamp = useRef(null);

  // 1. Initial Page Load Splash Screen (Once per Session)
  useEffect(() => {
    try {
      const alreadyShown = sessionStorage.getItem('mm_artsy_splash_shown');
      if (!alreadyShown) {
        setShowInitialSplash(true);
        const timer = setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setShowInitialSplash(false);
            try {
              sessionStorage.setItem('mm_artsy_splash_shown', '1');
            } catch {}
          }, 500); // Match CSS fade-out transition
        }, INITIAL_LOAD_MIN_MS);

        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback for strict browser privacy modes
      setShowInitialSplash(false);
    }
  }, []);

  // 2. Inactivity & Wake-up Detection
  useEffect(() => {
    const updateActiveTime = () => {
      lastActiveTimestamp.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimestamp.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const now = Date.now();
        const wasHiddenLong = hiddenTimestamp.current && (now - hiddenTimestamp.current > INACTIVITY_TIMEOUT_MS);
        const wasIdleLong = (now - lastActiveTimestamp.current > INACTIVITY_TIMEOUT_MS);

        if (wasHiddenLong || wasIdleLong) {
          setShowWakeupSplash(true);
          setWakeupFadingOut(false);

          setTimeout(() => {
            setWakeupFadingOut(true);
            setTimeout(() => {
              setShowWakeupSplash(false);
              setWakeupFadingOut(false);
            }, 500);
          }, WAKEUP_LOAD_DURATION_MS);
        }

        // Reset timestamps
        hiddenTimestamp.current = null;
        lastActiveTimestamp.current = now;
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, updateActiveTime, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActiveTime));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!showInitialSplash && !showWakeupSplash) return null;

  return (
    <>
      {/* ── Initial App Loading Splash ── */}
      {showInitialSplash && (
        <div
          className={`app-loading-screen ${isFadingOut ? 'app-loading-fade-out' : ''}`}
          role="status"
          aria-live="polite"
          aria-label="Loading M&M Artsy"
        >
          <div className="app-loading-backdrop-glow" />

          <div className="app-loading-content">
            {/* Logo Emblem */}
            <div className="app-loading-logo-glow">
              <BrandLogo size="splash" />
            </div>

            {/* Constant Handcrafted Brand Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{BRAND_TAGLINE}</h2>
              <p className="app-loading-subtitle">{BRAND_SUBTITLE}</p>
            </div>

            {/* Luxury Hairline Progress Flow */}
            <div className="app-loading-progress-track">
              <div className="app-loading-progress-fill" />
            </div>
          </div>
        </div>
      )}

      {/* ── Inactivity / Wake-up Screen ── */}
      {showWakeupSplash && (
        <div
          className={`app-loading-screen app-wakeup-screen ${wakeupFadingOut ? 'app-loading-fade-out' : ''}`}
          role="status"
          aria-live="polite"
          aria-label="Refreshing M&M Artsy"
        >
          <div className="app-loading-backdrop-glow" />

          <div className="app-loading-content">
            {/* Logo Emblem */}
            <div className="app-loading-logo-glow">
              <BrandLogo size="large" />
            </div>

            {/* Constant Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{BRAND_TAGLINE}</h2>
              <p className="app-loading-subtitle">{BRAND_SUBTITLE}</p>
            </div>

            {/* Luxury Hairline Progress Flow */}
            <div className="app-loading-progress-track" style={{ width: '120px' }}>
              <div className="app-loading-progress-fill" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
