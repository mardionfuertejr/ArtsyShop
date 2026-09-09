'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addMockFeedback } from '@/lib/mockData';

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

export default function FloatingFeedbackMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePakilig, setActivePakilig] = useState(PAKILIG_MESSAGES[0]);

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

  // Don't show floating feedback menu on admin, login, cart, checkout, and product detail routes (distraction-free checkout & action bar visibility)
  if (
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname === '/cart' ||
    pathname.startsWith('/checkout') ||
    (pathname.startsWith('/shop/') && pathname.split('/').length > 2)
  ) {
    return null;
  }

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
      customer_name: `Anonymous #${randomId}`,
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
    setTimeout(() => {
      setSuccess(false);
      setIsOpen(false);
      setMessage('');
      setRating(5);
    }, 2400);
  };

  // Detect pages with sticky bottom CTA (e.g., Cart, Checkout, Product Detail)
  const isStickyCtaPage =
    pathname === '/cart' ||
    pathname === '/checkout' ||
    (pathname && pathname.startsWith('/shop/') && pathname.split('/').filter(Boolean).length >= 2);

  return (
    <>
      {/* Direct Floating Feedback Trigger Button */}
      <div
        className={`speed-dial-container ${isStickyCtaPage ? 'with-sticky-cta' : ''}`}
        style={isOpen ? { opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s ease' } : { transition: 'opacity 0.2s ease' }}
        aria-label="Customer Feedback"
      >
        <button
          type="button"
          className="speed-dial-main-btn ripple"
          onClick={() => setIsOpen(true)}
          aria-label="Send Feedback"
          title="Leave Feedback / Suggestion"
        >
          <i className="fa-solid fa-comment-dots" />
        </button>
      </div>

      {/* ── CLEAN DIRECT FEEDBACK MODAL (Teleported to document.body) ── */}
      {isOpen && mounted && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setIsOpen(false)}>
          <div className="modal feedback-modal" onClick={(e) => e.stopPropagation()} role="dialog" style={{ maxWidth: '420px', borderRadius: '24px' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-comment-dots" style={{ color: 'var(--color-primary)', fontSize: '18px' }}></i>
                <h3 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
                  Share Your Feedback
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-surface-warm, #FAF8F5)',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {success ? (
              <div className="modal-body" style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--color-success)', marginBottom: '8px' }}>
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                  {activePakilig?.title || 'Ayieee, Salamat!'}
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                  {activePakilig?.subtitle || 'Your feedback made our crafters day extra blooming!'}
                </p>
              </div>
            ) : (
              <div className="modal-body" style={{ padding: '20px' }}>
                <form onSubmit={handleFeedbackSubmit} className="feedback-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Rating Reaction Selection */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '8px', display: 'block' }}>
                      How is your experience with us? <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      width: '100%',
                    }}>
                      {[
                        { score: 5, emoji: '😍', text: 'Love it!' },
                        { score: 4, emoji: '😊', text: 'Good' },
                        { score: 3, emoji: '😐', text: 'Okay' },
                        { score: 2, emoji: '🙁', text: 'Needs Work' },
                      ].map((item) => {
                        const isSelected = rating === item.score;
                        return (
                          <button
                            type="button"
                            key={item.score}
                            className={`reaction-rate-btn${isSelected ? ' selected' : ''}`}
                            onClick={() => setRating(item.score)}
                          >
                            <span style={{ fontSize: '1.6rem', lineHeight: 1, marginBottom: '4px' }}>
                              {item.emoji}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              whiteSpace: 'nowrap',
                            }}>
                              {item.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '6px', display: 'block' }}>
                      Your Suggestions or Message <span style={{ color: 'var(--color-danger, #E11D48)' }}>*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="Share your thoughts, suggestions, or bouquet craft ideas..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--color-border)',
                        padding: '12px 14px',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        fontFamily: 'var(--font-body)',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                      required
                    />
                  </div>

                  {/* Anonymous Privacy Notice (One line without icons) */}
                  <p style={{
                    textAlign: 'center',
                    fontSize: '11.5px',
                    color: 'var(--color-text-muted)',
                    margin: '2px 0 0 0',
                    lineHeight: 1.3,
                  }}>
                    Your feedback is 100% anonymous and secure.
                  </p>

                  {/* Footer Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px', marginTop: '2px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsOpen(false)}
                      disabled={submitting}
                      style={{
                        minHeight: '46px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary ripple"
                      disabled={submitting}
                      style={{
                        minHeight: '46px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      {submitting ? 'Sending...' : 'Send Feedback'}
                    </button>
                  </div>

                  {/* Direct Messenger Support Banner */}
                  <div style={{
                    marginTop: '6px',
                    padding: '10px 12px',
                    background: 'rgba(8, 102, 255, 0.06)',
                    border: '1px solid rgba(8, 102, 255, 0.15)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                  }}>
                    <a
                      href={`https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent("Hi M&M's Artsy! I'd like to ask a question / get help with my order.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0866FF',
                        fontSize: '12px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '15px' }}></i>
                      <span>Need instant help? Chat on Messenger</span>
                    </a>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
