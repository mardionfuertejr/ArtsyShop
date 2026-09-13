'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Trigger a toast notification from anywhere in the app:
 * window.dispatchEvent(new CustomEvent('likha_toast', { detail: { title, message, photo, type, actionLabel, actionUrl } }))
 */
export function triggerToast({
  title = 'Added to Cart! ✨',
  message = '',
  photo = null,
  type = 'cart', // 'cart' | 'success' | 'info' | 'error'
  actionLabel = 'View Cart',
  actionUrl = '/cart',
  duration = 3200,
}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('likha_toast', {
        detail: { title, message, photo, type, actionLabel, actionUrl, duration },
      })
    );
  }
}

export function clearToast() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('likha_clear_toast'));
  }
}

export default function GlobalToast() {
  const [toast, setToast] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const timerRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-dismiss cart toasts on checkout or confirmation screens
  useEffect(() => {
    if (pathname?.startsWith('/checkout') || pathname?.startsWith('/confirmation')) {
      setIsVisible(false);
      setIsLeaving(false);
      setToast(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [pathname]);

  useEffect(() => {
    const handleToast = (e) => {
      const data = e.detail;
      if (!data) return;

      // Don't show cart toasts on checkout/confirmation pages
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if ((path.startsWith('/checkout') || path.startsWith('/confirmation')) && data.type === 'cart') {
          return;
        }
      }

      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      setIsLeaving(false);
      setToast(data);
      setIsVisible(true);

      const dur = data.duration || 3200;
      timerRef.current = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsVisible(false);
          setIsLeaving(false);
          setToast(null);
        }, 280);
      }, dur);
    };

    const handleClear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsVisible(false);
      setIsLeaving(false);
      setToast(null);
    };

    window.addEventListener('likha_toast', handleToast);
    window.addEventListener('likha_clear_toast', handleClear);
    return () => {
      window.removeEventListener('likha_toast', handleToast);
      window.removeEventListener('likha_clear_toast', handleClear);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast || !isVisible) return null;

  const isCart = toast.type === 'cart';

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      setToast(null);
    }, 250);
  };

  return (
    <div
      className={`likha-global-toast-container ${isLeaving ? 'toast-leave' : 'toast-enter'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="likha-toast-card">
        {/* Glow Accent Rim */}
        <div className="likha-toast-glow" />

        <div className="likha-toast-content">
          {/* Left Visual: Photo or Icon */}
          <div className="likha-toast-media">
            {toast.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={toast.photo}
                alt={toast.message || 'Product'}
                className="likha-toast-img"
              />
            ) : (
              <div className={`likha-toast-icon-box ${toast.type || 'cart'}`}>
                {toast.type === 'error' ? (
                  <i className="fa-solid fa-triangle-exclamation" />
                ) : toast.type === 'info' ? (
                  <i className="fa-solid fa-circle-info" />
                ) : isCart ? (
                  <i className="fa-solid fa-bag-shopping" />
                ) : (
                  <i className="fa-solid fa-circle-check" />
                )}
              </div>
            )}
            {isCart && (
              <span className="likha-toast-mini-badge">
                <i className="fa-solid fa-check" />
              </span>
            )}
          </div>

          {/* Text Info */}
          <div className="likha-toast-text-wrap">
            <div className="likha-toast-header">
              <span className="likha-toast-title">{toast.title}</span>
              {toast.quantity && toast.quantity > 1 && (
                <span className="likha-toast-qty-tag">+{toast.quantity}</span>
              )}
            </div>
            {toast.message && (
              <p className="likha-toast-desc" title={toast.message}>
                {toast.message}
              </p>
            )}
          </div>

          {/* Action CTA Button */}
          {toast.actionLabel && toast.actionUrl && (
            <Link
              href={toast.actionUrl}
              onClick={() => setIsVisible(false)}
              className="likha-toast-action-btn"
            >
              <span>{toast.actionLabel}</span>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: '10px' }} />
            </Link>
          )}

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            className="likha-toast-close-btn"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Dynamic Progress Timer Bar */}
        <div
          className="likha-toast-progress-bar"
          style={{ animationDuration: `${toast.duration || 3200}ms` }}
        />
      </div>
    </div>
  );
}
