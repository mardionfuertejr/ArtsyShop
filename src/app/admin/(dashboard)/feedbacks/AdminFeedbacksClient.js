'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getMockFeedbacks,
  getAllMockReviews,
  toggleMockReviewApproval,
  toggleMockFeedbackVisibility,
} from '@/lib/mockData';
import { formatRelative, formatDate } from '@/lib/utils/formatDate';

export default function AdminFeedbacksClient() {
  const [activeTab, setActiveTab] = useState('feedbacks'); // 'feedbacks' | 'reviews'
  const [feedbacks, setFeedbacks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [actionToast, setActionToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchInputRef = useRef(null);
  const ratingDropdownRef = useRef(null);
  const typeDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(e.target)) {
        setIsRatingOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Feedbacks and Reviews with real-time Supabase integration & localStorage fallback
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
            if (!fbRes.error && Array.isArray(fbRes.data) && fbRes.data.length > 0) {
              setFeedbacks(fbRes.data);
              try { localStorage.setItem('likha_admin_feedbacks', JSON.stringify(fbRes.data)); } catch {}
            } else {
              const saved = typeof window !== 'undefined' ? localStorage.getItem('likha_admin_feedbacks') : null;
              setFeedbacks(saved ? JSON.parse(saved) : getMockFeedbacks());
            }

            if (!revRes.error && Array.isArray(revRes.data) && revRes.data.length > 0) {
              setReviews(revRes.data);
              try { localStorage.setItem('likha_admin_reviews', JSON.stringify(revRes.data)); } catch {}
            } else {
              const saved = typeof window !== 'undefined' ? localStorage.getItem('likha_admin_reviews') : null;
              setReviews(saved ? JSON.parse(saved) : getAllMockReviews());
            }
            setLoading(false);
            return;
          }
        }
      } catch { }

      if (isMounted) {
        const savedFb = typeof window !== 'undefined' ? localStorage.getItem('likha_admin_feedbacks') : null;
        const savedRev = typeof window !== 'undefined' ? localStorage.getItem('likha_admin_reviews') : null;
        setFeedbacks(savedFb ? JSON.parse(savedFb) : getMockFeedbacks());
        setReviews(savedRev ? JSON.parse(savedRev) : getAllMockReviews());
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

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast('');
    }, 2800);
  };

  // Toggle Review Approval / Storefront Visibility
  const handleToggleApprove = async (review, forceLive) => {
    const currentLive = review.is_approved !== false;
    const newLive = forceLive !== undefined ? forceLive : !currentLive;

    // Optimistic UI update immediately
    setReviews((prev) => {
      const updated = prev.map((r) => {
        const isMatch = (r.id && review.id && String(r.id) === String(review.id)) ||
                        (r === review) ||
                        (r.created_at === review.created_at && r.comment === review.comment);
        return isMatch ? { ...r, is_approved: newLive } : r;
      });
      try { localStorage.setItem('likha_admin_reviews', JSON.stringify(updated)); } catch {}
      return updated;
    });

    showToast(newLive ? 'Review is now visible on storefront' : 'Review hidden from storefront');

    try {
      const supabase = createClient();
      if (supabase && review.id) {
        await supabase.from('product_reviews').update({ is_approved: newLive }).eq('id', review.id);
      }
    } catch { }

    toggleMockReviewApproval(review.id, newLive);
  };

  // Toggle Feedback Storefront Visibility (Hide / Unhide)
  const handleToggleFeedbackVisibility = async (feedback, forceHidden) => {
    const currentHidden = Boolean(feedback.is_hidden);
    const newHidden = forceHidden !== undefined ? forceHidden : !currentHidden;

    // Optimistic UI update immediately
    setFeedbacks((prev) => {
      const updated = prev.map((f) => {
        const isMatch = (f.id && feedback.id && String(f.id) === String(feedback.id)) ||
                        (f === feedback) ||
                        (f.created_at === feedback.created_at && f.message === feedback.message);
        return isMatch ? { ...f, is_hidden: newHidden } : f;
      });
      try { localStorage.setItem('likha_admin_feedbacks', JSON.stringify(updated)); } catch {}
      return updated;
    });

    showToast(newHidden ? 'Feedback hidden from storefront' : 'Feedback is now visible on storefront');

    try {
      const supabase = createClient();
      if (supabase && feedback.id) {
        await supabase.from('feedbacks').update({ is_hidden: newHidden }).eq('id', feedback.id);
      }
    } catch {}

    toggleMockFeedbackVisibility(feedback.id, newHidden);
  };

  // Calculations
  const allItems = [...feedbacks, ...reviews];
  const avgRating =
    allItems.length > 0
      ? (allItems.reduce((acc, curr) => acc + (curr.rating || 5), 0) / allItems.length).toFixed(1)
      : '5.0';

  // Filtered lists
  const filteredFeedbacks = feedbacks.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.customer_name || '').toLowerCase().includes(q) ||
      (item.message || '').toLowerCase().includes(q);
    const matchesRating = ratingFilter === 'all' || String(item.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const filteredReviews = reviews.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.customer_name || '').toLowerCase().includes(q) ||
      (item.comment || '').toLowerCase().includes(q) ||
      (item.productSlug || '').toLowerCase().includes(q) ||
      (item.products?.name || '').toLowerCase().includes(q);
    const matchesRating = ratingFilter === 'all' || String(item.rating) === ratingFilter;
    return matchesSearch && matchesRating;
  });

  // Active list & pagination
  const currentList = activeTab === 'feedbacks' ? filteredFeedbacks : filteredReviews;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedItems = currentList.slice(startIndex, startIndex + pageSize);

  const isFiltered = searchTerm.trim() !== '' || ratingFilter !== 'all';

  const ratingOptions = [
    { key: 'all', label: 'All Ratings' },
    { key: '5', label: '5 Stars (⭐⭐⭐⭐⭐)' },
    { key: '4', label: '4 Stars (⭐⭐⭐⭐)' },
    { key: '3', label: '3 Stars (⭐⭐⭐)' },
    { key: '2', label: '2 Stars (⭐⭐)' },
    { key: '1', label: '1 Star (⭐)' },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {actionToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'adminModalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ color: '#10B981', fontSize: '14px' }}></i>
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header Row: Title & Stats on Left, Single-Pill Unified Search & Filter on Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        {/* Left: Title + Total Count + Average Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Reviews & Feedbacks
          </h1>
          <span
            style={{
              background: 'rgba(234, 88, 12, 0.1)',
              color: 'var(--color-primary, #EA580C)',
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            {allItems.length} Total
          </span>
          <span
            style={{
              background: '#FEF3C7',
              color: '#D97706',
              fontSize: '12px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-star" style={{ fontSize: '10px' }}></i>
            {avgRating} Avg
          </span>
        </div>

        {/* Right: Single-Pill Search & Integrated Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FFFFFF',
              border: isSearchFocused ? '1.5px solid var(--color-primary, #EA580C)' : '1px solid #E2E8F0',
              borderRadius: '10px',
              height: '38px',
              padding: '0 4px 0 12px',
              maxWidth: '100%',
              boxSizing: 'border-box',
              boxShadow: isSearchFocused ? '0 0 0 3px rgba(234, 88, 12, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                color: isSearchFocused ? 'var(--color-primary, #EA580C)' : '#94A3B8',
                fontSize: '12px',
                marginRight: '8px',
                flexShrink: 0,
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search feedback, review..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
                width: '180px',
                padding: 0,
              }}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px',
                  marginRight: '2px',
                }}
              >
                ✕
              </button>
            )}

            <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px 0 2px', flexShrink: 0 }}></div>

            {/* Type Dropdown inside pill */}
            <div ref={typeDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsTypeOpen(!isTypeOpen)}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '7px',
                  border: 'none',
                  background: 'transparent',
                  color: '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <i
                  className={activeTab === 'feedbacks' ? 'fa-solid fa-comments' : 'fa-solid fa-star'}
                  style={{
                    fontSize: '11px',
                    color: activeTab === 'feedbacks' ? 'var(--color-primary, #EA580C)' : '#0284C7',
                  }}
                />
                <span>{activeTab === 'feedbacks' ? 'Feedbacks' : 'Reviews'}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: activeTab === 'feedbacks' ? '#FFF5F2' : '#EFF6FF',
                    color: activeTab === 'feedbacks' ? 'var(--color-primary, #EA580C)' : '#0284C7',
                  }}
                >
                  {activeTab === 'feedbacks' ? feedbacks.length : reviews.length}
                </span>
                <i
                  className="fa-solid fa-chevron-down"
                  style={{
                    fontSize: '9px',
                    color: '#94A3B8',
                    transition: 'transform 0.2s ease',
                    transform: isTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Type Dropdown Card */}
              {isTypeOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #F1F5F9',
                    padding: '4px',
                    zIndex: 60,
                    minWidth: '190px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('feedbacks');
                      setIsTypeOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTab === 'feedbacks' ? '#FFF5F2' : 'transparent',
                      color: activeTab === 'feedbacks' ? 'var(--color-primary, #EA580C)' : '#334155',
                      fontSize: '12px',
                      fontWeight: activeTab === 'feedbacks' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-comments" style={{ color: 'var(--color-primary, #EA580C)', fontSize: '11px' }} />
                      <span>Customer Feedbacks</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        background: activeTab === 'feedbacks' ? 'var(--color-primary, #EA580C)' : '#F1F5F9',
                        color: activeTab === 'feedbacks' ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {feedbacks.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('reviews');
                      setIsTypeOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTab === 'reviews' ? '#EFF6FF' : 'transparent',
                      color: activeTab === 'reviews' ? '#0284C7' : '#334155',
                      fontSize: '12px',
                      fontWeight: activeTab === 'reviews' ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-star" style={{ color: '#0284C7', fontSize: '11px' }} />
                      <span>Product Reviews</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '1px 5px',
                        borderRadius: '999px',
                        background: activeTab === 'reviews' ? '#0284C7' : '#F1F5F9',
                        color: activeTab === 'reviews' ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {reviews.length}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px', flexShrink: 0 }}></div>

            {/* Rating Dropdown inside pill */}
            <div ref={ratingDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsRatingOpen(!isRatingOpen)}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '7px',
                  border: 'none',
                  background: ratingFilter !== 'all' ? 'rgba(234, 88, 12, 0.12)' : 'transparent',
                  color: ratingFilter !== 'all' ? 'var(--color-primary, #EA580C)' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-star" style={{ fontSize: '10.5px', color: '#F59E0B' }}></i>
                <span>{ratingFilter === 'all' ? 'Rating' : `${ratingFilter}★`}</span>
                <i
                  className="fa-solid fa-chevron-down"
                  style={{
                    fontSize: '9px',
                    color: ratingFilter !== 'all' ? 'var(--color-primary, #EA580C)' : '#94A3B8',
                    transition: 'transform 0.2s ease',
                    transform: isRatingOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Floating Rating Menu */}
              {isRatingOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #F1F5F9',
                    padding: '4px',
                    zIndex: 60,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {ratingOptions.map((opt) => {
                    const isSelected = ratingFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setRatingFilter(opt.key);
                          setIsRatingOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? '#FFF5F2' : 'transparent',
                          color: isSelected ? 'var(--color-primary, #EA580C)' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? '700' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <i className="fa-solid fa-check" style={{ color: 'var(--color-primary, #EA580C)', fontSize: '11px' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #F1F5F9',
          overflow: 'hidden',
        }}
      >
        {activeTab === 'feedbacks' ? (
          /* ── FEEDBACKS TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '14%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Date
                  </th>
                  <th style={{ width: '22%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Customer
                  </th>
                  <th style={{ width: '13%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Rating
                  </th>
                  <th style={{ width: '33%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Feedback Message
                  </th>
                  <th style={{ width: '18%', padding: '13px 24px 13px 12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', textAlign: 'center' }}>
                    Visibility
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skel-fb-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '90px', height: '13px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '130px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '85%', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 24px 14px 12px', textAlign: 'center' }}>
                        <div style={{ width: '90px', height: '24px', borderRadius: '999px', background: '#F1F5F9', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ))
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFF5F2', color: 'var(--color-primary, #EA580C)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '10px' }}>
                        <i className="fa-regular fa-comments"></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '14.5px', color: '#0F172A' }}>No feedbacks found</p>
                      <p style={{ margin: '4px 0 14px', fontSize: '12.5px', color: '#64748B' }}>
                        {isFiltered ? 'No entries match your search or filter.' : 'Customer feedbacks will appear here.'}
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setRatingFilter('all');
                          }}
                          style={{
                            padding: '7px 14px',
                            background: 'var(--color-primary, #EA580C)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((fb, idx) => {
                    const isVisible = !fb.is_hidden;

                    return (
                      <tr
                        key={fb.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.12s ease',
                          opacity: isVisible ? 1 : 0.65,
                          background: isVisible ? 'transparent' : '#FAFAFA',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isVisible ? '#FAFBFD' : '#F5F5F5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isVisible ? 'transparent' : '#FAFAFA')}
                      >
                        {/* Date */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                            {formatDate(fb.created_at)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {formatRelative(fb.created_at)}
                          </span>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #FFF5F2 0%, #FED7AA 100%)',
                              color: 'var(--color-primary, #EA580C)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '800',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.15)',
                            }}>
                              {(fb.customer_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px', display: 'block', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fb.customer_name || 'Anonymous Customer'}
                              </span>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                color: (!fb.customer_name || fb.customer_name === 'Anonymous Customer' || fb.customer_name?.startsWith('Customer #')) ? '#64748B' : '#16A34A',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '2px',
                              }}>
                                <i className={(!fb.customer_name || fb.customer_name === 'Anonymous Customer' || fb.customer_name?.startsWith('Customer #')) ? 'fa-solid fa-user-shield' : 'fa-solid fa-circle-check'} style={{ fontSize: '9px' }}></i>
                                {(!fb.customer_name || fb.customer_name === 'Anonymous Customer') ? 'Anonymous' : fb.customer_name?.startsWith('Customer #') ? 'Guest' : 'Customer'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'inline-flex', gap: '2px', color: '#F59E0B', fontSize: '11px' }}>
                              {[...Array(fb.rating || 5)].map((_, i) => (
                                <i key={i} className="fa-solid fa-star" />
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                              {fb.rating || 5}.0
                            </span>
                          </div>
                        </td>

                        {/* Feedback Message */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, display: 'block', wordBreak: 'break-word', fontWeight: '500' }}>
                            {fb.message}
                          </span>
                        </td>

                        {/* Visibility Option (Show / Hide) */}
                        <td style={{ padding: '13px 24px 13px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#F1F5F9',
                              padding: '3px',
                              borderRadius: '9999px',
                              border: '1px solid #E2E8F0',
                              gap: '2px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFeedbackVisibility(fb, false);
                              }}
                              style={{
                                border: 'none',
                                padding: '4px 11px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                background: isVisible ? '#10B981' : 'transparent',
                                color: isVisible ? '#FFFFFF' : '#64748B',
                                boxShadow: isVisible ? '0 1px 3px rgba(16, 185, 129, 0.35)' : 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Show on storefront"
                            >
                              <i className="fa-solid fa-eye" style={{ fontSize: '9.5px' }} />
                              <span>Show</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFeedbackVisibility(fb, true);
                              }}
                              style={{
                                border: 'none',
                                padding: '4px 11px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                background: !isVisible ? '#475569' : 'transparent',
                                color: !isVisible ? '#FFFFFF' : '#64748B',
                                boxShadow: !isVisible ? '0 1px 3px rgba(71, 85, 105, 0.35)' : 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Hide from storefront"
                            >
                              <i className="fa-solid fa-eye-slash" style={{ fontSize: '9.5px' }} />
                              <span>Hide</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── PRODUCT REVIEWS TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '13%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Date
                  </th>
                  <th style={{ width: '18%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Customer
                  </th>
                  <th style={{ width: '17%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Product
                  </th>
                  <th style={{ width: '12%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Rating
                  </th>
                  <th style={{ width: '22%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Review Comment
                  </th>
                  <th style={{ width: '18%', padding: '13px 24px 13px 12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', textAlign: 'center' }}>
                    Visibility
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skel-rev-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '80px', height: '13px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '110px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '130px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '80%', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 24px 14px 12px', textAlign: 'center' }}>
                        <div style={{ width: '90px', height: '24px', borderRadius: '999px', background: '#F1F5F9', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ))
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#0EA5E9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '10px' }}>
                        <i className="fa-regular fa-star"></i>
                      </div>
                      <p style={{ margin: 0, fontWeight: '800', fontSize: '14.5px', color: '#0F172A' }}>No product reviews found</p>
                      <p style={{ margin: '4px 0 14px', fontSize: '12.5px', color: '#64748B' }}>
                        {isFiltered ? 'No entries match your search or filter.' : 'Verified product reviews will appear here.'}
                      </p>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setRatingFilter('all');
                          }}
                          style={{
                            padding: '7px 14px',
                            background: 'var(--color-primary, #EA580C)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((rev, idx) => {
                    const isLive = rev.is_approved !== false;
                    const productSlug = rev.products?.slug || rev.productSlug;
                    const productName = rev.products?.name || (productSlug ? productSlug.replace(/-/g, ' ') : 'Handmade Product');

                    return (
                      <tr
                        key={rev.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.12s ease',
                          opacity: isLive ? 1 : 0.65,
                          background: isLive ? 'transparent' : '#FAFAFA',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isLive ? '#FAFBFD' : '#F5F5F5')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isLive ? 'transparent' : '#FAFAFA')}
                      >
                        {/* Date */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                            {formatDate(rev.created_at)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {formatRelative(rev.created_at)}
                          </span>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #EFF6FF 0%, #BFDBFE 100%)',
                              color: '#0284C7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '800',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.15)',
                            }}>
                              {(rev.customer_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px', display: 'block', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rev.customer_name || 'Customer'}
                              </span>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                color: '#16A34A',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '2px',
                              }}>
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '9px' }}></i>
                                Verified Review
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Product */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: '700',
                                color: '#0F172A',
                                textTransform: 'capitalize',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {productName}
                            </span>
                            {productSlug && (
                              <Link
                                href={`/shop/${productSlug}`}
                                target="_blank"
                                style={{ color: 'var(--color-primary, #EA580C)', fontSize: '11px', flexShrink: 0 }}
                                title="View product in shop"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'inline-flex', gap: '2px', color: '#F59E0B', fontSize: '11px' }}>
                              {[...Array(rev.rating || 5)].map((_, i) => (
                                <i key={i} className="fa-solid fa-star" />
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                              {rev.rating || 5}.0
                            </span>
                          </div>
                        </td>

                        {/* Review Comment */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, display: 'block', wordBreak: 'break-word', fontWeight: '500' }}>
                            {rev.comment}
                          </span>
                        </td>

                        {/* Visibility Option (Show / Hide) */}
                        <td style={{ padding: '13px 24px 13px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#F1F5F9',
                              padding: '3px',
                              borderRadius: '9999px',
                              border: '1px solid #E2E8F0',
                              gap: '2px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleApprove(rev, true);
                              }}
                              style={{
                                border: 'none',
                                padding: '4px 11px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                background: isLive ? '#10B981' : 'transparent',
                                color: isLive ? '#FFFFFF' : '#64748B',
                                boxShadow: isLive ? '0 1px 3px rgba(16, 185, 129, 0.35)' : 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Show on storefront"
                            >
                              <i className="fa-solid fa-eye" style={{ fontSize: '9.5px' }} />
                              <span>Show</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleApprove(rev, false);
                              }}
                              style={{
                                border: 'none',
                                padding: '4px 11px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                background: !isLive ? '#475569' : 'transparent',
                                color: !isLive ? '#FFFFFF' : '#64748B',
                                boxShadow: !isLive ? '0 1px 3px rgba(71, 85, 105, 0.35)' : 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Hide from storefront"
                            >
                              <i className="fa-solid fa-eye-slash" style={{ fontSize: '9.5px' }} />
                              <span>Hide</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalItems > 10 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid #E2E8F0',
              background: '#FFFFFF',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Entries Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>
                Showing <strong style={{ color: '#0F172A', fontWeight: '800' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong style={{ color: '#0F172A', fontWeight: '800' }}>{totalItems}</strong> entries
              </span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#334155',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
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
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: safeCurrentPage === 1 ? '#F8FAFC' : '#FFFFFF',
                  color: safeCurrentPage === 1 ? '#CBD5E1' : '#334155',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <i className="fa-solid fa-chevron-left" style={{ fontSize: '10px' }}></i>
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '30px',
                      height: '30px',
                      padding: '0 6px',
                      fontSize: '12px',
                      fontWeight: isActive ? '800' : '600',
                      borderRadius: '8px',
                      border: isActive ? '1px solid var(--color-primary, #EA580C)' : '1px solid #E2E8F0',
                      background: isActive ? 'var(--color-primary, #EA580C)' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#334155',
                      cursor: 'pointer',
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
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: safeCurrentPage === totalPages ? '#F8FAFC' : '#FFFFFF',
                  color: safeCurrentPage === totalPages ? '#CBD5E1' : '#334155',
                  cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Next</span>
                <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
