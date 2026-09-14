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
      className="store-announcement-bar"
      aria-label="Store announcement"
      style={{
        background: 'linear-gradient(90deg, #FFF7ED 0%, #FEF2F2 50%, #FFF7ED 100%)',
        borderBottom: '1px solid rgba(254, 215, 170, 0.65)',
        color: '#9A3412',
        fontSize: '12px',
        padding: isClosing ? '0 12px' : '8px 14px',
        maxHeight: isClosing ? '0px' : '120px',
        opacity: isClosing ? 0 : 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(234, 88, 12, 0.03)',
        transition: 'max-height 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, padding 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '6px 8px',
          flex: 1,
          maxWidth: '860px',
          margin: '0 auto',
          textAlign: 'center',
          lineHeight: 1.4,
          paddingRight: '4px',
        }}
      >
        {settings.announcementBadge && (
          <span
            style={{
              background: '#EA580C',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.22)',
            }}
          >
            {settings.announcementBadge}
          </span>
        )}

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
                textAlign: 'center',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '4px',
                fontSize: '12px',
                lineHeight: 1.4,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EA580C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9A3412')}
            >
              <span>{settings.announcementText}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px', marginLeft: '2px', color: '#EA580C' }}></i>
            </button>
          ) : (
            <Link
              href={settings.announcementLink}
              style={{
                color: '#9A3412',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '4px',
                fontSize: '12px',
                lineHeight: 1.4,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EA580C')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9A3412')}
            >
              <span>{settings.announcementText}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px', marginLeft: '2px', color: '#EA580C' }}></i>
            </Link>
          )
        ) : (
          <span style={{ fontWeight: '600', fontSize: '12px', color: '#9A3412' }}>
            {settings.announcementText}
          </span>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss Announcement"
        title="Dismiss announcement"
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 6px',
          color: '#C2410C',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          opacity: 0.65,
          transition: 'all 0.18s ease',
          marginLeft: '2px',
          flexShrink: 0,
          borderRadius: 'var(--radius-full)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.background = 'rgba(234, 88, 12, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.65';
          e.currentTarget.style.background = 'none';
        }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
    </aside>
  );
}

