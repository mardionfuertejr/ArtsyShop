'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { openMessengerDirect } from '@/lib/utils/browserNav';

export default function StoreAnnouncementBar({ initialSettings = null }) {
  const [settings, setSettings] = useState(initialSettings || {
    announcementEnabled: true,
    announcementText: 'I-send ang resibo sa Messenger para masimulan agad ang pag-craft.',
    announcementBadge: 'Notice',
    announcementLink: '',
  });
  const [dismissed, setDismissed] = useState(true); // Default to true to prevent initial flash on reload
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Fetch latest settings from API or local storage
    async function fetchSettings() {
      let activeSettings = settings;

      try {
        const local = localStorage.getItem('mm_studio_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed.announcementEnabled !== 'undefined') {
            activeSettings = { ...activeSettings, ...parsed };
            setSettings(activeSettings);
          }
        }

        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && data.settings && typeof data.settings.announcementEnabled !== 'undefined') {
            activeSettings = { ...activeSettings, ...data.settings };
            setSettings(activeSettings);
          }
        }
      } catch {}

      // Check persistent dismissal in localStorage
      try {
        const dismissedText = localStorage.getItem('mm_dismissed_announcement');
        const currentText = (activeSettings.announcementText || '').trim();
        // If user already dismissed THIS exact announcement, keep it dismissed
        if (dismissedText && dismissedText === currentText) {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      } catch {
        setDismissed(false);
      }
    }

    fetchSettings();

    window.addEventListener('likha_settings_updated', fetchSettings);
    window.addEventListener('storage', fetchSettings);

    return () => {
      window.removeEventListener('likha_settings_updated', fetchSettings);
      window.removeEventListener('storage', fetchSettings);
    };
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setDismissed(true);
      try {
        const currentText = (settings.announcementText || '').trim();
        localStorage.setItem('mm_dismissed_announcement', currentText);
      } catch {}
    }, 250);
  };

  if (!mounted || !settings.announcementEnabled || dismissed || !settings.announcementText?.trim()) {
    return null;
  }

  const isExternalMessenger = settings.announcementLink && (settings.announcementLink.includes('m.me') || settings.announcementLink.includes('facebook.com'));

  return (
    <aside
        className="store-announcement-bar no-print"
        aria-label="Store announcement"
        style={{
          background: 'linear-gradient(90deg, #FFFBEB 0%, #FFFDF7 50%, #FFFBEB 100%)',
          borderBottom: '1px solid rgba(217, 119, 6, 0.12)',
          color: '#92400E',
          padding: isClosing ? '0 12px' : '7.5px 12px',
          maxHeight: isClosing ? '0px' : '46px',
          opacity: isClosing ? 0 : 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          position: 'relative',
          zIndex: 40,
          boxSizing: 'border-box',
          width: '100%',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Left Fixed News Badge */}
        {settings.announcementBadge && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
              color: '#FFFFFF',
              fontSize: '9.5px',
              fontWeight: '800',
              padding: '3px 9px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.22)',
              zIndex: 2,
            }}
          >
            <i className="fa-solid fa-bullhorn" style={{ fontSize: '8.5px' }}></i>
            <span>{settings.announcementBadge}</span>
          </div>
        )}

        {/* Continuous Infinite News Crawl Track */}
        <div
          className="news-ticker-container"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
          }}
        >
          <div className="news-ticker-track">
            {/* Repeated items to achieve 100% seamless infinite crawl loop */}
            {[0, 1, 2, 3].map((copyIdx) => (
              <span key={copyIdx} className="news-ticker-item">
                {settings.announcementLink ? (
                  isExternalMessenger ? (
                    <button
                      type="button"
                      onClick={() => openMessengerDirect()}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#9A3412',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '11.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <span>{settings.announcementText}</span>
                    </button>
                  ) : (
                    <Link
                      href={settings.announcementLink}
                      style={{
                        color: '#9A3412',
                        fontWeight: '600',
                        textDecoration: 'none',
                        fontSize: '11.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <span>{settings.announcementText}</span>
                    </Link>
                  )
                ) : (
                  <span>{settings.announcementText}</span>
                )}
                <span style={{ color: '#EA580C', opacity: 0.75, fontSize: '10px' }}>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right Fixed Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Isara ang notice"
          title="Isara ang notice"
          style={{
            background: 'rgba(234, 88, 12, 0.08)',
            border: 'none',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            color: '#C2410C',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            flexShrink: 0,
            zIndex: 2,
            transition: 'background-color 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(234, 88, 12, 0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(234, 88, 12, 0.08)';
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </aside>
  );
}

