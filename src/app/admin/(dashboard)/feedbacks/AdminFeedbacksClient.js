'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getMockFeedbacks,
  deleteMockFeedback,
  getAllMockReviews,
  deleteMockReview,
  toggleMockReviewApproval,
} from '@/lib/mockData';
import { formatRelative, formatDate } from '@/lib/utils/formatDate';

export default function AdminFeedbacksClient() {
  const [activeTab, setActiveTab] = useState('feedbacks'); // 'feedbacks' | 'reviews'
  const [feedbacks, setFeedbacks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'feedback' | 'review', item: obj }

  // Lock body scroll and listen for ESC key when modal is open
  useEffect(() => {
    if (itemToDelete) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setItemToDelete(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [itemToDelete]);

  // Load Feedbacks and Reviews
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        if (supabase) {
          const [fbRes, revRes] = await Promise.all([
            supabase.from('feedbacks').select('*').order('created_at', { ascending: false }),
            supabase.from('product_reviews').select('*, products(name, slug)').order('created_at', { ascending: false }),
          ]);

          if (isMounted) {
            if (!fbRes.error && fbRes.data) {
              setFeedbacks(fbRes.data);
            } else {
              setFeedbacks(getMockFeedbacks());
            }

            if (!revRes.error && revRes.data) {
              setReviews(revRes.data);
            } else {
              setReviews(getAllMockReviews());
            }
            setLoading(false);
            return;
          }
        }
      } catch {}

      if (isMounted) {
        setFeedbacks(getMockFeedbacks());
        setReviews(getAllMockReviews());
        setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, ratingFilter, pageSize]);

  // Close action menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.action-menu-dropdown-container')) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess('');
    }, 2500);
  };

  // Delete Feedback
  const handleConfirmDeleteFeedback = async (id) => {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('feedbacks').delete().eq('id', id);
      }
    } catch {}

    deleteMockFeedback(id);
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    showToast('Feedback removed successfully');
    setItemToDelete(null);
  };

  // Delete Review
  const handleConfirmDeleteReview = async (id) => {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('product_reviews').delete().eq('id', id);
      }
    } catch {}

    deleteMockReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    showToast('Product review deleted');
    setItemToDelete(null);
  };

  // Toggle Review Approval / Visibility
  const handleToggleApprove = async (review) => {
    const newStatus = review.is_approved === false ? true : false;
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('product_reviews').update({ is_approved: newStatus }).eq('id', review.id);
      }
    } catch {}

    toggleMockReviewApproval(review.id);
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, is_approved: newStatus } : r))
    );
    showToast(newStatus ? 'Review approved & live on storefront' : 'Review hidden from storefront');
  };

  // Calculations
  const allItems = [...feedbacks, ...reviews];
  const avgRating =
    allItems.length > 0
      ? (allItems.reduce((acc, curr) => acc + (curr.rating || 5), 0) / allItems.length).toFixed(1)
      : '5.0';

  // Filtered lists
  const filteredFeedbacks = feedbacks.filter((item) => {
    const matchesSearch =
      (item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || String(item.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const filteredReviews = reviews.filter((item) => {
    const matchesSearch =
      (item.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.productSlug || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = ratingFilter === 'all' || String(item.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  // Current active list pagination
  const currentList = activeTab === 'feedbacks' ? filteredFeedbacks : filteredReviews;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedItems = currentList.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ width: '100%', maxWidth: '1160px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="admin-toast" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            Reviews
          </h1>
          <span style={{
            background: 'rgba(180, 83, 9, 0.1)',
            color: 'var(--color-primary, #b45309)',
            fontSize: '12px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}>
            {allItems.length} Total
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '4px' }}>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <p className="stat-card-label" style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Average Rating</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <p className="stat-card-value" style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>{avgRating}</p>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>/ 5.0</span>
          </div>
          <p className="stat-card-sub" style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>Across all customer reviews</p>
        </div>

        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <p className="stat-card-label" style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Customer Feedbacks</p>
          <p className="stat-card-value" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary, #b45309)', margin: '0 0 2px' }}>{feedbacks.length}</p>
          <p className="stat-card-sub" style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>General suggestions & notes</p>
        </div>

        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <p className="stat-card-label" style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Product Reviews</p>
          <p className="stat-card-value" style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', margin: '0 0 2px' }}>{reviews.length}</p>
          <p className="stat-card-sub" style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>Store item ratings</p>
        </div>
      </div>

      {/* Main Tabs and Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {/* Category Tab Switcher */}
        <div className="admin-filter-tabs" style={{ margin: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'feedbacks' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedbacks')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: activeTab === 'feedbacks' ? '700' : '500',
              background: activeTab === 'feedbacks' ? 'var(--color-primary, #b45309)' : '#ffffff',
              color: activeTab === 'feedbacks' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Customer Feedbacks ({feedbacks.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
            style={{
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: activeTab === 'reviews' ? '700' : '500',
              background: activeTab === 'reviews' ? 'var(--color-primary, #b45309)' : '#ffffff',
              color: activeTab === 'reviews' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Product Reviews ({reviews.length})
          </button>
        </div>

        {/* Filter & Search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              height: '38px',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <div style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            height: '38px',
            padding: '0 12px',
            width: '240px',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', fontSize: '12px', marginRight: '8px' }}></i>
            <input
              type="text"
              placeholder="Search keyword or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#0f172a',
                width: '100%',
                padding: 0,
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {activeTab === 'feedbacks' ? (
          /* ── FEEDBACKS TABLE ── */
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ width: '18%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Date</th>
                <th style={{ width: '22%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Customer</th>
                <th style={{ width: '14%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Rating</th>
                <th style={{ width: '40%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Message / Suggestion</th>
                <th style={{ width: '6%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
              </tr>
            </thead>
            <tbody key={`feedbacks-${searchTerm}-${ratingFilter}-${currentPage}`} className="table-fade-enter">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                      <i className="fa-regular fa-comments" style={{ opacity: 0.8 }}></i>
                    </div>
                    <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>No feedbacks found</p>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                      {searchTerm || ratingFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Customer feedback submissions will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((fb, idx) => {
                  const isNearBottom = paginatedItems.length <= 3 ? idx >= 1 : idx >= paginatedItems.length - 2;

                  return (
                    <tr key={fb.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.12s ease' }}>
                      <td style={{ padding: '13px 18px', verticalAlign: 'top', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', display: 'block' }}>
                          {formatDate(fb.created_at)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {formatRelative(fb.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        <p style={{ fontWeight: '700', color: '#0f172a', margin: '0 0 2px', fontSize: '13px' }}>
                          {fb.customer_name || 'Anonymous'}
                        </p>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>
                          {fb.topic || 'General Feedback'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F59E0B' }}>
                          {[...Array(fb.rating || 5)].map((_, i) => (
                            <i key={i} className="fa-solid fa-star" style={{ fontSize: '11px' }}></i>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, margin: 0 }}>
                          {fb.message}
                        </p>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === fb.id ? null : fb.id);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: activeMenuId === fb.id ? '#f1f5f9' : 'transparent',
                              color: activeMenuId === fb.id ? '#0f172a' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '14px',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (activeMenuId !== fb.id) {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.color = '#0f172a';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeMenuId !== fb.id) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#64748b';
                              }
                            }}
                            title="Actions"
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === fb.id && (
                            <div
                              style={{
                                position: 'absolute',
                                ...(isNearBottom
                                  ? { bottom: 'calc(100% + 4px)', transformOrigin: 'bottom right' }
                                  : { top: 'calc(100% + 4px)', transformOrigin: 'top right' }),
                                right: 0,
                                background: '#ffffff',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                                border: '1px solid #f1f5f9',
                                padding: '4px',
                                zIndex: 50,
                                minWidth: '140px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setItemToDelete({ type: 'feedback', item: fb });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <i className="fa-regular fa-trash-can" style={{ fontSize: '12px', color: '#dc2626', width: '14px' }}></i>
                                <span>Delete Feedback</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* ── PRODUCT REVIEWS TABLE ── */
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                <th style={{ width: '16%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Date</th>
                <th style={{ width: '18%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Customer</th>
                <th style={{ width: '12%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Rating</th>
                <th style={{ width: '36%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Product & Review</th>
                <th style={{ width: '12%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
                <th style={{ width: '6%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
              </tr>
            </thead>
            <tbody key={`reviews-${searchTerm}-${ratingFilter}-${currentPage}`} className="table-fade-enter">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                      <i className="fa-regular fa-star" style={{ opacity: 0.8 }}></i>
                    </div>
                    <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>No product reviews found</p>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                      {searchTerm || ratingFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Verified product reviews will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((rev, idx) => {
                  const isNearBottom = paginatedItems.length <= 3 ? idx >= 1 : idx >= paginatedItems.length - 2;
                  const isLive = rev.is_approved !== false;
                  const productSlug = rev.products?.slug || rev.productSlug;

                  return (
                    <tr key={rev.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.12s ease' }}>
                      <td style={{ padding: '13px 18px', verticalAlign: 'top', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', display: 'block' }}>
                          {formatDate(rev.created_at)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {formatRelative(rev.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        <p style={{ fontWeight: '700', color: '#0f172a', margin: '0 0 2px', fontSize: '13px' }}>
                          {rev.customer_name || 'Anonymous Buyer'}
                        </p>
                        {rev.is_verified_buyer && (
                          <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: '800', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                            VERIFIED BUYER
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F59E0B' }}>
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <i key={i} className="fa-solid fa-star" style={{ fontSize: '11px' }}></i>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                        {(rev.products?.name || rev.productSlug) && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--color-primary, #b45309)',
                            background: '#FAF6F0',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            marginBottom: '4px',
                          }}>
                            {rev.products?.name || rev.productSlug.replace(/-/g, ' ')}
                          </span>
                        )}
                        <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, margin: 0 }}>
                          {rev.comment}
                        </p>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleApprove(rev)}
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            fontSize: '11px',
                            padding: '0 8px',
                            height: '24px',
                            borderRadius: '9999px',
                            fontWeight: '800',
                            letterSpacing: '0.04em',
                            width: '96px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            background: isLive ? '#DCFCE7' : '#F1F5F9',
                            color: isLive ? '#166534' : '#64748b',
                          }}
                          title="Click to toggle visibility"
                        >
                          {isLive ? 'LIVE' : 'HIDDEN'}
                        </button>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === rev.id ? null : rev.id);
                            }}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: activeMenuId === rev.id ? '#f1f5f9' : 'transparent',
                              color: activeMenuId === rev.id ? '#0f172a' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '14px',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (activeMenuId !== rev.id) {
                                e.currentTarget.style.background = '#f1f5f9';
                                e.currentTarget.style.color = '#0f172a';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (activeMenuId !== rev.id) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#64748b';
                              }
                            }}
                            title="Actions"
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === rev.id && (
                            <div
                              style={{
                                position: 'absolute',
                                ...(isNearBottom
                                  ? { bottom: 'calc(100% + 4px)', transformOrigin: 'bottom right' }
                                  : { top: 'calc(100% + 4px)', transformOrigin: 'top right' }),
                                right: 0,
                                background: '#ffffff',
                                borderRadius: '10px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                                border: '1px solid #f1f5f9',
                                padding: '4px',
                                zIndex: 50,
                                minWidth: '150px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleToggleApprove(rev);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#334155',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <i className={isLive ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                                <span>{isLive ? 'Hide Review' : 'Approve Review'}</span>
                              </button>

                              {productSlug && (
                                <Link
                                  href={`/shop/${productSlug}`}
                                  target="_blank"
                                  onClick={() => setActiveMenuId(null)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#334155',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    textDecoration: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'background 0.1s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '11px', color: '#64748b', width: '14px' }}></i>
                                  <span>View Product</span>
                                </Link>
                              )}

                              <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }}></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setItemToDelete({ type: 'review', item: rev });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#dc2626',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <i className="fa-regular fa-trash-can" style={{ fontSize: '12px', color: '#dc2626', width: '14px' }}></i>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Controls (only if more than 10 items) */}
        {totalItems > 10 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid #E2E8F0',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            {/* Entries Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong style={{ color: '#0f172a', fontWeight: '700' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong style={{ color: '#0f172a', fontWeight: '700' }}>{totalItems}</strong> {activeTab === 'feedbacks' ? 'feedbacks' : 'reviews'}
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#334155',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '9px' }}></i>
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - safeCurrentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} style={{ padding: '0 3px', color: '#94a3b8', fontSize: '11px' }}>…</span>;
                  }
                  return null;
                }

                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? '800' : '600',
                      borderRadius: '6px',
                      border: isActive ? '1px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
                      background: isActive ? 'var(--color-primary, #b45309)' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safeCurrentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '9px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setItemToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              margin: '0 auto 14px',
            }}>
              <i className="fa-regular fa-trash-can"></i>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Delete {itemToDelete.type === 'feedback' ? 'Feedback' : 'Review'}?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to permanently remove this entry? This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  background: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (itemToDelete.type === 'feedback') {
                    handleConfirmDeleteFeedback(itemToDelete.item.id);
                  } else {
                    handleConfirmDeleteReview(itemToDelete.item.id);
                  }
                }}
                style={{
                  height: '38px',
                  boxSizing: 'border-box',
                  padding: '0 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  margin: 0,
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
