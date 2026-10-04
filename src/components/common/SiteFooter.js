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
  const [rating, setRating] = useState(0);
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
    const randomPakilig = PAKILIG_MESSAGES[Math.floor(Math.random() * PAKILIG_MESSAGES.length)];
    setActivePakilig(randomPakilig);

    const feedbackPayload = {
      rating: rating || 5,
      topic: 'Customer Feedback',
      message: message.trim(),
      customer_name: 'Anonymous Customer',
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
      setRating(0);
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


        {/* ── FOOTER QUICK LINKS & ACTIONS (Balanced Side-by-Side) ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '380px',
            margin: '0 auto',
          }}
        >
          {/* Action Row - Perfectly balanced 2-pill group */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              style={{
                background: 'var(--color-surface, #FFFFFF)',
                border: '1.5px solid var(--color-border-light, #E2E8F0)',
                padding: '8px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--color-text-secondary, #475569)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                whiteSpace: 'nowrap',
                minHeight: '38px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary, #EA580C)';
                e.currentTarget.style.color = 'var(--color-primary, #EA580C)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light, #E2E8F0)';
                e.currentTarget.style.color = 'var(--color-text-secondary, #475569)';
              }}
            >
              <i className="fa-regular fa-comment-dots" style={{ color: 'var(--color-primary, #EA580C)', fontSize: '13px' }}></i>
              <span>Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => openMessengerDirect(CUSTOM_ORDER_TEMPLATE)}
              style={{
                background: 'linear-gradient(135deg, #0084FF 0%, #0062E0 100%)',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.22)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                whiteSpace: 'nowrap',
                minHeight: '38px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '13px' }}></i>
              <span>Custom Order</span>
            </button>
          </div>

          {/* Copyright & Tagline */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted, #94A3B8)',
              letterSpacing: '0.01em',
              lineHeight: '1.4',
            }}
          >
            &copy; {new Date().getFullYear()} M&M Artsy • Handcrafted in Barugo, Leyte 🌸
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
            style={{
              maxWidth: '400px',
              borderRadius: '24px',
              padding: '24px 20px',
              textAlign: 'left',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'var(--color-primary-lighter, #FFF5F2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary, #EA580C)',
                    fontSize: '16px',
                  }}
                >
                  <i className="fa-solid fa-heart"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-text)' }}>
                  Share Your Feedback
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsOpen(false)}
                aria-label="Close modal"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-surface-warm, #F1F5F9)',
                  border: 'none',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary, #64748B)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#E2E8F0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-warm, #F1F5F9)')}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }} className="fade-in">
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-primary-lighter, #FFF5F2)',
                    color: 'var(--color-primary, #EA580C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    margin: '0 auto 16px',
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '800', color: 'var(--color-primary, #EA580C)' }}>
                  {activePakilig.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                  {activePakilig.subtitle}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 5-Star Clean Interactive Rating */}
                <div
                  style={{
                    background: 'var(--color-surface-warm, #F8FAFC)',
                    border: '1px solid var(--color-border-light, #E2E8F0)',
                    borderRadius: '16px',
                    padding: '14px 12px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text-secondary, #64748B)', marginBottom: '8px' }}>
                    How was your experience?
                  </span>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          fontSize: '32px',
                          lineHeight: 1,
                          color: rating > 0 && star <= rating ? '#F59E0B' : '#CBD5E1',
                          transform: rating > 0 && star <= rating ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.15s ease, color 0.15s ease',
                          outline: 'none',
                        }}
                        aria-label={`Rate ${star} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>


                {/* Feedback Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '6px' }}>
                    Your Message or Suggestions
                  </label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you loved or how we can improve..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1.5px solid var(--color-border-light, #E2E8F0)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      resize: 'none',
                      boxSizing: 'border-box',
                      outline: 'none',
                      lineHeight: '1.45',
                      transition: 'border-color 0.15s ease',
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
                  className="btn ripple"
                  style={{
                    borderRadius: '14px',
                    padding: '13px',
                    fontWeight: '700',
                    fontSize: '14px',
                    background: (!message.trim() || submitting)
                      ? 'var(--color-border, #E2E8F0)'
                      : 'linear-gradient(135deg, #EA580C 0%, #D94A1E 100%)',
                    color: (!message.trim() || submitting) ? 'var(--color-text-muted, #94A3B8)' : '#FFFFFF',
                    border: 'none',
                    cursor: (!message.trim() || submitting) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: (!message.trim() || submitting) ? 'none' : '0 4px 14px rgba(234, 88, 12, 0.28)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className={submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'}></i>
                  <span>{submitting ? 'Sending...' : 'Send Feedback'}</span>
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
