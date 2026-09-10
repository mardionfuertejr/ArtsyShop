'use client';

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes idle / hidden trigger
const INITIAL_LOAD_MIN_MS = 650; // Smooth initial splash duration
const WAKEUP_LOAD_DURATION_MS = 750; // Quick smooth refresh on resume

export default function GlobalLoadingScreen() {
  const [showInitialSplash, setShowInitialSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showWakeupSplash, setShowWakeupSplash] = useState(false);
  const [wakeupFadingOut, setWakeupFadingOut] = useState(false);

  const lastActiveTimestamp = useRef(Date.now());
  const hiddenTimestamp = useRef(null);

  // 1. Initial Page Load Splash Screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setShowInitialSplash(false);
      }, 450); // Match CSS fade-out transition
    }, INITIAL_LOAD_MIN_MS);

    return () => clearTimeout(timer);
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
          // Trigger smooth wake-up loading screen
          setShowWakeupSplash(true);
          setWakeupFadingOut(false);

          setTimeout(() => {
            setWakeupFadingOut(true);
            setTimeout(() => {
              setShowWakeupSplash(false);
              setWakeupFadingOut(false);
            }, 400);
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
          <div className="app-loading-content">
            <div className="app-loading-logo-glow">
              <BrandLogo size="large" />
            </div>

            <div className="app-loading-text-container">
              <p className="app-loading-subtitle">Handmade & Custom Creations</p>
            </div>

            {/* Artisan Progress Shimmer Bar */}
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
        >
          <div className="app-loading-content">
            <div className="app-wakeup-icon-wrapper">
              <i className="fa-solid fa-sparkles" style={{ fontSize: '24px', color: 'var(--color-primary)' }} />
            </div>

            <h3 className="app-wakeup-title">Welcome back ✨</h3>
            <p className="app-loading-subtitle">Refreshing handcrafted details...</p>

            <div className="app-loading-progress-track" style={{ width: '130px' }}>
              <div className="app-loading-progress-fill" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
