'use client';

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes idle / hidden trigger
const INITIAL_LOAD_MIN_MS = 750; // Smooth initial splash duration
const WAKEUP_LOAD_DURATION_MS = 850; // Quick smooth refresh on resume

const CRAFT_STORIES = [
  {
    tagline: 'Stories shaped in every piece.',
    note: 'Bespoke Bouquets, Crochet & Keepsakes',
    badge: 'Artisan Crafted'
  },
  {
    tagline: 'Crafting moments, stitch by stitch.',
    note: 'Handmade with Passion & Dedication',
    badge: '100% Handcrafted'
  },
  {
    tagline: 'Where heartfelt memories become art.',
    note: 'Personalized Gifts & Floral Artistry',
    badge: 'Made Just For You'
  },
  {
    tagline: 'Every petal and pour tells a story.',
    note: 'Everlasting Botanicals & Resin Decor',
    badge: 'Handmade in Barugo, Leyte'
  },
  {
    tagline: 'Treasured creations that last forever.',
    note: 'Timeless Crochet & Custom Creations',
    badge: 'Bespoke Artisan Studio'
  }
];

export default function GlobalLoadingScreen() {
  const [showInitialSplash, setShowInitialSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showWakeupSplash, setShowWakeupSplash] = useState(false);
  const [wakeupFadingOut, setWakeupFadingOut] = useState(false);

  // Pick an artisan story that rotates
  const [storyIndex, setStoryIndex] = useState(0);

  const lastActiveTimestamp = useRef(Date.now());
  const hiddenTimestamp = useRef(null);

  // Initialize random story on mount
  useEffect(() => {
    setStoryIndex(Math.floor(Math.random() * CRAFT_STORIES.length));
  }, []);

  // 1. Initial Page Load Splash Screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setShowInitialSplash(false);
      }, 480); // Match CSS fade-out transition
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
          // Rotate to next craft story on wake-up
          setStoryIndex((prev) => (prev + 1) % CRAFT_STORIES.length);
          setShowWakeupSplash(true);
          setWakeupFadingOut(false);

          setTimeout(() => {
            setWakeupFadingOut(true);
            setTimeout(() => {
              setShowWakeupSplash(false);
              setWakeupFadingOut(false);
            }, 450);
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

  const currentStory = CRAFT_STORIES[storyIndex] || CRAFT_STORIES[0];

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

            {/* Artisan Badge */}
            <div className="app-loading-badge">
              <span className="app-loading-badge-dot" />
              <span>{currentStory.badge}</span>
            </div>

            {/* Dynamic Handcrafted Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{currentStory.tagline}</h2>
              <p className="app-loading-subtitle">{currentStory.note}</p>
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
            {/* Delicate Sparkle Emblem */}
            <div className="app-wakeup-icon-wrapper">
              <i className="fa-solid fa-sparkles" style={{ fontSize: '20px', color: 'var(--color-primary)' }} />
            </div>

            {/* Artisan Badge */}
            <div className="app-loading-badge">
              <span className="app-loading-badge-dot" />
              <span>{currentStory.badge}</span>
            </div>

            {/* Rotating Story */}
            <div className="app-loading-text-container">
              <h2 className="app-loading-tagline">{currentStory.tagline}</h2>
              <p className="app-loading-subtitle">{currentStory.note}</p>
            </div>

            {/* Luxury Hairline Progress Flow */}
            <div className="app-loading-progress-track" style={{ width: '130px' }}>
              <div className="app-loading-progress-fill" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
