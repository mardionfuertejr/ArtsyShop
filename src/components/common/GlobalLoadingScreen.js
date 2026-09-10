'use client';

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes idle / hidden trigger
const INITIAL_LOAD_MIN_MS = 650; // Smooth initial splash duration
const WAKEUP_LOAD_DURATION_MS = 750; // Quick smooth refresh on resume

const STUDIO_TAGLINES = [
  {
    tagline: 'Stories shaped in every piece.',
    category: 'Handcrafted Bouquets & Resin Keepsakes',
  },
  {
    tagline: 'Crafted with care, given with love.',
    category: 'Floral Arrangements & Custom Creations',
  },
  {
    tagline: 'Turning precious memories into art.',
    category: 'Everlasting Bouquets & Personalized Gifts',
  },
  {
    tagline: 'Artisan blooms & bespoke keepsakes.',
    category: 'M&M Artsy Studio · Barugo, Leyte',
  },
];

export default function GlobalLoadingScreen() {
  const [showInitialSplash, setShowInitialSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showWakeupSplash, setShowWakeupSplash] = useState(false);
  const [wakeupFadingOut, setWakeupFadingOut] = useState(false);

  // Rotate tagline
  const [taglineIndex, setTaglineIndex] = useState(0);

  const lastActiveTimestamp = useRef(Date.now());
  const hiddenTimestamp = useRef(null);

  // Initialize random tagline on mount
  useEffect(() => {
    setTaglineIndex(Math.floor(Math.random() * STUDIO_TAGLINES.length));
  }, []);

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
          // Rotate to next tagline on wake-up
          setTaglineIndex((prev) => (prev + 1) % STUDIO_TAGLINES.length);
          setShowWakeupSplash(true);
          setWakeupFadingOut(false);

          setTimeout(() => {
            setWakeupFadingOut(true);
            setTimeout(() => {
              setShowWakeupSplash(false);
              setWakeupFadingOut(false);
            }, 420);
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

  const currentStory = STUDIO_TAGLINES[taglineIndex] || STUDIO_TAGLINES[0];

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
              <BrandLogo size="large" />
            </div>

            {/* Dynamic Handcrafted Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{currentStory.tagline}</h2>
              <p className="app-loading-subtitle">{currentStory.category}</p>
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
            <div className="app-loading-logo-glow" style={{ marginBottom: '10px' }}>
              <BrandLogo size="medium" />
            </div>

            {/* Rotating Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{currentStory.tagline}</h2>
              <p className="app-loading-subtitle">{currentStory.category}</p>
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
