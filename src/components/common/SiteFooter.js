'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { addMockFeedback } from '@/lib/mockData';
import {
  FUN_CUSTOM_PROMPTS,
  getRandomCustomPrompt,
  getPromptMessengerUrl,
  CUSTOM_ORDER_MESSENGER_URL,
} from '@/lib/constants/customPrompts';

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
  const [prompt, setPrompt] = useState(FUN_CUSTOM_PROMPTS[0]);

  // Form State
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePakilig, setActivePakilig] = useState(PAKILIG_MESSAGES[0]);

  useEffect(() => {
    setMounted(true);
    setPrompt(getRandomCustomPrompt());
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
          marginTop: '14px',
          width: '100%',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: 'calc(var(--bottom-nav-height, 72px) + var(--safe-area-bottom, 0px) + 12px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          textAlign: 'center',
          ...style,
        }}
      >
        {/* ── SEAMLESS MINIMAL CUSTOM ORDER ROW (Zero Bulk, No Giant Box) ── */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            fontSize: '11.5px',
            color: 'var(--color-text-secondary, #64748B)',
            lineHeight: '1.4',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--color-primary, #EA580C)', fontSize: '10px' }}></i>
            <span>May sariling custom peg?</span>
          </span>

          <a
            href={getPromptMessengerUrl(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-primary, #EA580C)',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'opacity 0.15s ease',
            }}
          >
            <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '11px' }}></i>
            <span>Chat sa Messenger</span>
            <i className="fa-solid fa-arrow-right" style={{ fontSize: '9px' }}></i>
          </a>
        </div>

        {/* ── MINIMAL INLINE FOOTNOTE: FEEDBACK & COPYRIGHT ── */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '10.5px',
            color: 'var(--color-text-muted, #94A3B8)',
            letterSpacing: '0.01em',
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '10.5px',
              fontWeight: '600',
              color: 'var(--color-text-muted, #94A3B8)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              outline: 'none',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary, #EA580C)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted, #94A3B8)')}
          >
            <i className="fa-regular fa-comment-dots" style={{ fontSize: '10px' }}></i>
            <span>Feedback</span>
          </button>

          <span>•</span>

          <a
            href={CUSTOM_ORDER_MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-text-muted, #94A3B8)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              fontWeight: '500',
            }}
          >
            Custom Order
          </a>

          <span>•</span>

          <span>&copy; {new Date().getFullYear()} M&M Artsy</span>
        </div>
      </footer>

      {/* ── FEEDBACK MODAL (Teleported to document.body) ── */}
      {isOpen && mounted && createPortal(
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
