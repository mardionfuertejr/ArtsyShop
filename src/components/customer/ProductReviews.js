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
  const [rating, setRating] = useState(5);
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
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

    const finalCustomerName = customerName.trim() || generateAnonymousReviewerName();
    const randomMsg = REVIEW_THANK_YOU_MESSAGES[Math.floor(Math.random() * REVIEW_THANK_YOU_MESSAGES.length)];
    setActiveThankYou(randomMsg);

    const newReviewData = {
      product_id: product?.id,
      productSlug: product?.slug,
      rating,
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
              rating,
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
      setRating(5);
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

      {/* Header & Overall Summary Card */}
      <div className="reviews-summary-card">
        <div className="reviews-score-block">
          {totalReviews > 0 ? (
            <>
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
            </>
          ) : (
            <>
              <span className="rating-score-num" style={{ fontSize: '1.45rem', color: 'var(--color-text-muted)' }}>
                —
              </span>
              <div className="stars-info-col">
                <div className="stars-row-gold">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i key={star} className="fa-solid fa-star star-empty" />
                  ))}
                </div>
                <span className="reviews-subtitle-text">
                  No reviews yet
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary write-review-action-btn ripple"
          onClick={() => setIsModalOpen(true)}
        >
          <span>Write a Review</span>
        </button>
      </div>

      {/* Reviews List & Pagination */}
      <div className="reviews-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-reviews-box" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <p className="empty-reviews-title" style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text)', margin: '0 0 4px 0' }}>
              No customer reviews yet
            </p>
            <p className="empty-reviews-subtitle" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Be the first to share your experience with this creation.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Write a Review Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal review-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: '440px', borderRadius: '24px' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text)', margin: 0 }}>
                Write a Review
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="modal-body review-success-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                  {activeThankYou?.title}
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                  {activeThankYou?.subtitle}
                </p>
              </div>
            ) : (
              <div className="modal-body" style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit} className="review-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'var(--color-surface-warm, #FAF8F5)', padding: '10px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0 }}>
                      Product: <strong style={{ color: 'var(--color-text)' }}>{product?.name}</strong>
                    </p>
                  </div>

                  {/* Rating Reaction Cards Selection (Touch-friendly & prominent) */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '8px', display: 'block' }}>
                      How is your experience with this craft? <span style={{ color: 'var(--color-primary)' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { val: 5, emoji: '😍', label: 'Love it!' },
                        { val: 4, emoji: '😊', label: 'Good' },
                        { val: 3, emoji: '😐', label: 'Okay' },
                        { val: 2, emoji: '🙁', label: 'Needs Work' },
                      ].map((item) => {
                        const isSelected = rating === item.val;
                        return (
                          <button
                            type="button"
                            key={item.val}
                            onClick={() => setRating(item.val)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '10px 4px',
                              borderRadius: 'var(--radius-lg, 12px)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border-light, #E5E7EB)',
                              background: isSelected ? 'var(--color-primary-lighter, #FFF5EE)' : '#FFFFFF',
                              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              minHeight: '70px',
                            }}
                            aria-label={`${item.label} (${item.val} stars)`}
                          >
                            <span style={{ fontSize: '26px', lineHeight: 1, marginBottom: '6px', transform: isSelected ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s ease' }}>
                              {item.emoji}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: isSelected ? '700' : '600', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '6px', display: 'block' }}>
                      Your Name (Optional)
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Maria S. (Leave blank for anonymous)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--color-border)',
                        padding: '10px 14px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Review Textarea */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '6px', display: 'block' }}>
                      Your Feedback & Experience <span style={{ color: 'var(--color-danger, #E11D48)' }}>*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="Tell us about the craft quality, packaging, and experience..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
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

                  {errorMsg && (
                    <p style={{ fontSize: '12px', color: 'var(--color-danger, #E11D48)', margin: 0 }}>
                      {errorMsg}
                    </p>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsModalOpen(false)}
                      disabled={submitting}
                      style={{
                        minHeight: '44px',
                        fontSize: '13px',
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
                        minHeight: '44px',
                        fontSize: '13px',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-lg)',
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
