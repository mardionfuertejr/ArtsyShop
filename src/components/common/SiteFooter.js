'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { addMockFeedback } from '@/lib/mockData';
import {
  CUSTOM_ORDER_MESSENGER_URL,
  CUSTOM_ORDER_TEMPLATE,
} from '@/lib/constants/customPrompts';
import { openExternalSafe, openMessengerDirect } from '@/lib/utils/browserNav';

const PAKILIG_MESSAGES = [
  {
    title: 'Ayieee, Thank You!',
    subtitle: 'Sana crush ka rin ng crush mo today! You made our day extra blooming.',
  },
  {
    title: 'Kinilig Kami!',
    subtitle: 'Salamat sa pag-share! Dasal namin masarap ang ulam mo today and everyday.',
  },
  {
    title: 'Hala Siya, Ang Sweet!',
    subtitle: 'Thank you sa effort mag-type! Sana kasing ganda/gwapo ng flowers ang future mo.',
  },
  {
    title: 'Green Flag Ka Talaga!',
    subtitle: 'Nag-browse na nga, nag-iwan pa ng thoughtful feedback. Sana all sweet tulad mo!',
  },
  {
    title: 'You Made Our Day!',
    subtitle: 'Sobrang na-appreciate ng crafters namin ang suporta mo. Deserve mo mag-milktea today!',
  },
  {
    title: 'Salamat, Ganda / Pogi!',
    subtitle: 'May libreng virtual bouquet ka from M&M Artsy today. Ingat palagi!',
  },
  {
    title: 'Kinilig ang Ribbons Namin!',
    subtitle: 'Ang bait mo naman po! Sana walang traffic sa lahat ng lakad mo this week.',
  },
  {
    title: 'Claim Mo Na \'To!',
    subtitle: 'May parating na good news sa\'yo this week dahil sa kabaitan mo. Salamat nang marami!',
  },
  {
    title: 'Hulog Ka Ng Langit!',
    subtitle: 'Thank you so much! Dahil sa feedback mo, plus 100 points ka sa langit today.',
  },
  {
    title: 'Main Character Energy!',
    subtitle: 'Salamat sa feedback! Siguradong blooming at glowing ka today.',
  },
  {
    title: 'Ang Cute Mo Naman!',
    subtitle: 'Napangiti mo ang buong M&M Artsy crafting team! Have a blessed day ahead.',
  },
  {
    title: 'Thank You, Bossing!',
    subtitle: 'Ang bilis ng kamay mag-feedback! Sana laging puno ang wallet at puso mo.',
  },
];

export default function SiteFooter({ className = '', style = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePakilig, setActivePakilig] = useState(PAKILIG_MESSAGES[0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPakilig = PAKILIG_MESSAGES[Math.floor(Math.random() * PAKILIG_MESSAGES.length)];
    setActivePakilig(randomPakilig);

    const feedbackPayload = {
      rating,
      topic: 'Customer Feedback',
      message: message.trim(),
      customer_name: `Customer #${randomId}`,
    };

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('feedbacks').insert([feedbackPayload]);
      }
    } catch {}

    addMockFeedback(feedbackPayload);

    setSubmitting(false);
    setSuccess(true);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'success',
              title: 'Feedback Sent! 💌',
              message: randomPakilig?.title || 'Salamat sa iyong review!',
              duration: 3500,
            },
          })
        );
      } catch {}
    }
    setTimeout(() => {
      setSuccess(false);
      setIsOpen(false);
      setMessage('');
      setRating(5);
    }, 2400);
  };

  return (
    <>
      <footer
        className={`site-footer ${className}`}
        style={{
          marginTop: '24px',
          width: '100%',
          maxWidth: '720px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: 'calc(var(--bottom-nav-height, 72px) + var(--safe-area-bottom, 0px) + 20px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
          ...style,
        }}
      >


        {/* ── FOOTER QUICK LINKS & METAS ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          {/* Action Pills */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '12px',
              color: 'var(--color-text-secondary, #64748B)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              style={{
                background: 'var(--color-surface, #FFFFFF)',
                border: '1px solid var(--color-border-light, #E2E8F0)',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'var(--color-text-secondary, #64748B)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary, #EA580C)';
                e.currentTarget.style.color = 'var(--color-primary, #EA580C)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light, #E2E8F0)';
                e.currentTarget.style.color = 'var(--color-text-secondary, #64748B)';
              }}
            >
              <i className="fa-regular fa-comment-dots" style={{ color: 'var(--color-primary, #EA580C)' }}></i>
              <span>Feedback & Ideas</span>
            </button>

            <a
              href={CUSTOM_ORDER_MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openMessengerDirect(CUSTOM_ORDER_TEMPLATE);
              }}
              style={{
                background: 'var(--color-surface, #FFFFFF)',
                border: '1px solid var(--color-border-light, #E2E8F0)',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'var(--color-text-secondary, #64748B)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary, #EA580C)';
                e.currentTarget.style.color = 'var(--color-primary, #EA580C)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light, #E2E8F0)';
                e.currentTarget.style.color = 'var(--color-text-secondary, #64748B)';
              }}
            >
              <i className="fa-solid fa-paintbrush" style={{ color: '#F59E0B' }}></i>
              <span>Custom Order Form</span>
            </a>
          </div>

          {/* Copyright & Tagline */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted, #94A3B8)',
              letterSpacing: '0.01em',
              lineHeight: '1.5',
            }}
          >
            &copy; {new Date().getFullYear()} M&M Artsy • Handcrafted with love in Barugo 🌸
          </div>
        </div>
      </footer>

      {/* ── FEEDBACK MODAL (Teleported to document.body) ── */}
      {isOpen && mounted && typeof document !== 'undefined' && document.body && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setIsOpen(false)} style={{ padding: '16px' }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '400px', borderRadius: '24px', padding: '24px 20px', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--color-primary-lighter, #FFF5F2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary, #EA580C)',
                    fontSize: '14px',
                  }}
                >
                  <i className="fa-solid fa-heart"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--color-text)' }}>
                    Share Your Feedback
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Help M&M Artsy grow & bloom
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }} className="fade-in">
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--color-primary-lighter, #FFF5F2)',
                    color: 'var(--color-primary, #EA580C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    margin: '0 auto 14px',
                    animation: 'bounceIn 0.5s ease',
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: 'var(--color-primary, #EA580C)' }}>
                  {activePakilig.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  {activePakilig.subtitle}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                {/* Rating selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                    How was your experience browsing?
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{
                          background: star <= rating ? '#FEF3C7' : 'var(--color-surface-warm, #F8FAFC)',
                          border: star <= rating ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border-light, #E2E8F0)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          color: star <= rating ? '#D97706' : 'var(--color-text-muted)',
                          transition: 'all 0.15s ease',
                          flex: 1,
                          justifyContent: 'center',
                        }}
                      >
                        <i className={`fa-${star <= rating ? 'solid' : 'regular'} fa-star`}></i>
                        <span>{star}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Input */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                    Any suggestions, ideas, or message for our crafters?
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Sana po magka-custom crochet sunflower keychain, ang cute ng site!"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--color-border-light, #E2E8F0)',
                      background: 'var(--color-surface, #FFFFFF)',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      resize: 'none',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary, #EA580C)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border-light, #E2E8F0)';
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="btn btn-primary btn-full ripple"
                  style={{
                    borderRadius: '12px',
                    padding: '11px',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <i className={submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'}></i>
                  <span>{submitting ? 'Sending...' : 'Send Feedback'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
