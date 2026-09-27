'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { getMockReviewsByProductSlug, addMockReview } from '@/lib/mockData';

const REVIEW_THANK_YOU_MESSAGES = [
  {
    title: 'Salamat sa Review!',
    subtitle: 'Sobrang na-appreciate ng aming craft team ang iyong feedback.',
  },
  {
    title: 'Thank You so Much!',
    subtitle: 'Your review helps our handmade craft shop grow and inspire more people.',
  },
  {
    title: 'Maraming Salamat!',
    subtitle: 'Nakatutulong ang feedback mo para mas mapaganda pa namin ang aming handcrafted pieces.',
  },
];

function generateAnonymousReviewerName() {
  const prefixes = ['a', 'b', 'c', 'd', 'e', 'g', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z'];
  const suffixes = ['a', 'e', 'i', 'o', 'u', 'y', 'n', 'r', 's', 'z', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${p}*****${s}`;
}

export default function ProductReviews({ product }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeThankYou, setActiveThankYou] = useState(REVIEW_THANK_YOU_MESSAGES[0]);
  const [currentPage, setCurrentPage] = useState(1);

  const reviewsPerPage = 3;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch reviews on mount
  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const supabase = createClient();
        if (supabase && product?.id) {
          const { data, error } = await supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', product.id)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            if (isMounted) {
              setReviews(data);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      // Fallback to mock reviews
      if (isMounted) {
        const mock = getMockReviewsByProductSlug(product?.slug);
        setReviews(mock);
        setLoading(false);
      }
    }

    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.slug]);

  // Lock body scroll and auto-fill customer name when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      try {
        if (!customerName) {
          const guestRaw = localStorage.getItem('likha_guest_info');
          if (guestRaw) {
            const parsed = JSON.parse(guestRaw);
            if (parsed.name || parsed.facebookName) {
              setCustomerName(parsed.name || parsed.facebookName);
            }
          }
          if (!customerName) {
            const myOrdersRaw = localStorage.getItem('likha_my_orders');
            if (myOrdersRaw) {
              const myOrders = JSON.parse(myOrdersRaw);
              if (myOrders?.[0]?.customerName) {
                setCustomerName(myOrders[0].customerName);
              }
            }
          }
        }
      } catch {}
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Calculations
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please write your review comment.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const finalRating = rating || 5;
    let finalCustomerName = customerName.trim();
    if (!finalCustomerName) {
      try {
        const guestRaw = localStorage.getItem('likha_guest_info');
        if (guestRaw) {
          const parsed = JSON.parse(guestRaw);
          finalCustomerName = parsed.name || parsed.facebookName || '';
        }
        if (!finalCustomerName) {
          const myOrdersRaw = localStorage.getItem('likha_my_orders');
          if (myOrdersRaw) {
            const myOrders = JSON.parse(myOrdersRaw);
            if (myOrders?.[0]?.customerName) {
              finalCustomerName = myOrders[0].customerName;
            }
          }
        }
      } catch {}
    }
    if (!finalCustomerName) {
      finalCustomerName = generateAnonymousReviewerName();
    }
    const randomMsg = REVIEW_THANK_YOU_MESSAGES[Math.floor(Math.random() * REVIEW_THANK_YOU_MESSAGES.length)];
    setActiveThankYou(randomMsg);

    const newReviewData = {
      product_id: product?.id,
      productSlug: product?.slug,
      rating: finalRating,
      customer_name: finalCustomerName,
      comment: comment.trim(),
      is_verified_buyer: true,
      is_approved: true,
    };

    let submittedReview = null;

    try {
      const supabase = createClient();
      if (supabase && product?.id) {
        const { data, error } = await supabase
          .from('product_reviews')
          .insert([
            {
              product_id: product.id,
              rating: finalRating,
              customer_name: finalCustomerName,
              comment: comment.trim(),
              is_verified_buyer: true,
              is_approved: true,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          submittedReview = data;
        }
      }
    } catch {}

    if (!submittedReview) {
      submittedReview = addMockReview(newReviewData);
    }

    setReviews((prev) => [submittedReview, ...prev]);
    setCurrentPage(1);
    setSubmitting(false);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setIsModalOpen(false);
      setComment('');
      setCustomerName('');
      setRating(0);
    }, 2200);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="product-reviews-section">
      <div className="section-title-row" style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text)', margin: 0 }}>
          Customer Reviews
        </h3>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--color-text-muted)', fontSize: '13px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-light)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--color-primary)', marginRight: '8px' }}></i>
          Loading reviews...
        </div>
      ) : totalReviews === 0 ? (
        /* Friendly & Engaging Empty Reviews Card */
        <div className="empty-reviews-card">
          <div className="empty-reviews-badge">
            <i className="fa-solid fa-star-half-stroke"></i>
          </div>
          <h4 className="empty-reviews-title">No reviews yet</h4>
          <p className="empty-reviews-subtitle">
            Be the first to share your experience with this handmade creation!
          </p>

          <button
            type="button"
            className="btn btn-primary empty-reviews-cta ripple"
            onClick={() => {
              setRating(0);
              setIsModalOpen(true);
            }}
          >
            <i className="fa-solid fa-pen-nib"></i>
            <span>Write the First Review</span>
          </button>
        </div>
      ) : (
        <>
          {/* Header & Overall Summary Card for existing reviews */}
          <div className="reviews-summary-card">
            <div className="reviews-score-block">
              <span className="rating-score-num">{avgRating}</span>
              <div className="stars-info-col">
                <div className="stars-row-gold">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={`fa-solid fa-star ${star <= Math.round(parseFloat(avgRating || 5)) ? 'star-filled' : 'star-empty'}`}
                    />
                  ))}
                </div>
                <span className="reviews-subtitle-text">
                  Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary write-review-action-btn ripple"
              onClick={() => {
                setRating(0);
                setIsModalOpen(true);
              }}
            >
              <i className="fa-solid fa-pen-nib" style={{ fontSize: '11px' }}></i>
              <span>Write a Review</span>
            </button>
          </div>

          {/* Reviews List & Pagination */}
          <div className="reviews-list">
            {reviews
              .slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage)
              .map((rev) => (
                <div key={rev.id} className="review-item-card">
                  <div className="review-card-header">
                    <span className="review-author-name">{rev.customer_name}</span>
                    <span className="review-timestamp">{formatDate(rev.created_at)}</span>
                  </div>

                  {/* Star rating */}
                  <div className="review-stars-display">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <i
                        key={s}
                        className={`fa-solid fa-star ${s <= rev.rating ? 'star-filled' : 'star-empty'}`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="review-text-content">{rev.comment}</p>
                </div>
              ))}

            {/* Pagination Controls */}
            {Math.ceil(reviews.length / reviewsPerPage) > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 4px 0 4px',
                marginTop: '4px',
              }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-full)',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Prev</span>
                </button>

                {/* Dots indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {Array.from({ length: Math.ceil(reviews.length / reviewsPerPage) }, (_, idx) => {
                    const pageNum = idx + 1;
                    const isActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: isActive ? '16px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        aria-label={`Page ${pageNum}`}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(reviews.length / reviewsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(reviews.length / reviewsPerPage)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-full)',
                    opacity: currentPage === Math.ceil(reviews.length / reviewsPerPage) ? 0.4 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Next</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Write a Review Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)} style={{ padding: '16px' }}>
          <div
            className="modal review-modal"
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
                  <i className="fa-solid fa-pen-nib"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--color-text)' }}>
                  Write a Review
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsModalOpen(false)}
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

            {successMsg ? (
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
                  {activeThankYou?.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                  {activeThankYou?.subtitle}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="review-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Product badge */}
                <div style={{ background: 'var(--color-surface-warm, #FAF8F5)', padding: '9px 12px', borderRadius: '12px', border: '1px solid var(--color-border-light, #E2E8F0)', fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                  Reviewing: <strong style={{ color: 'var(--color-text)' }}>{product?.name}</strong>
                </div>

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

                {/* Customer Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '5px' }}>
                    Your Name <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--color-text-muted)' }}>(Optional)</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Maria (or leave blank for Anonymous)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      border: '1.5px solid var(--color-border-light, #E2E8F0)',
                      padding: '10px 12px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Review Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '5px' }}>
                    Your Review <span style={{ color: 'var(--color-primary, #EA580C)' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about the craft quality, flowers, or packaging..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--color-border-light, #E2E8F0)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      fontFamily: 'inherit',
                      resize: 'none',
                      boxSizing: 'border-box',
                      outline: 'none',
                      lineHeight: '1.45',
                    }}
                    required
                  />
                </div>

                {errorMsg && (
                  <p style={{ fontSize: '12px', color: 'var(--color-danger, #E11D48)', margin: 0 }}>
                    {errorMsg}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    style={{
                      borderRadius: '12px',
                      padding: '11px',
                      fontSize: '13px',
                      fontWeight: '700',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="btn ripple"
                    style={{
                      borderRadius: '12px',
                      padding: '11px',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      background: (!comment.trim() || submitting)
                        ? 'var(--color-border, #E2E8F0)'
                        : 'linear-gradient(135deg, #EA580C 0%, #D94A1E 100%)',
                      color: (!comment.trim() || submitting) ? 'var(--color-text-muted, #94A3B8)' : '#FFFFFF',
                      border: 'none',
                      cursor: (!comment.trim() || submitting) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: (!comment.trim() || submitting) ? 'none' : '0 4px 14px rgba(234, 88, 12, 0.25)',
                    }}
                  >
                    <i className={submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'}></i>
                    <span>{submitting ? 'Submitting...' : 'Post Review'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
