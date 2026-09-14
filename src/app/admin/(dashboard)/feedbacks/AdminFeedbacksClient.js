'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getMockFeedbacks,
  getAllMockReviews,
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
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [actionToast, setActionToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchInputRef = useRef(null);
  const ratingDropdownRef = useRef(null);

  // Close rating dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(e.target)) {
        setIsRatingOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Feedbacks and Reviews with real-time Supabase integration & fallback
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
            if (!fbRes.error && Array.isArray(fbRes.data)) {
              setFeedbacks(fbRes.data);
            } else {
              setFeedbacks(getMockFeedbacks());
            }

            if (!revRes.error && Array.isArray(revRes.data)) {
              setReviews(revRes.data);
            } else {
              setReviews(getAllMockReviews());
            }
            setLoading(false);
            return;
          }
        }
      } catch { }

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

  const showToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => {
      setActionToast('');
    }, 2800);
  };

  // Toggle Review Approval / Storefront Visibility
  const handleToggleApprove = async (review) => {
    const newStatus = review.is_approved === false ? true : false;
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('product_reviews').update({ is_approved: newStatus }).eq('id', review.id);
      }
    } catch { }

    toggleMockReviewApproval(review.id);
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, is_approved: newStatus } : r))
    );
    showToast(newStatus ? 'Review is now visible on storefront' : 'Review hidden from storefront');
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
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Reviews & Feedbacks
          </h1>
          <span
            style={{
              background: 'rgba(234, 88, 12, 0.1)',
              color: 'var(--color-primary, #EA580C)',
              fontSize: '12px',
              fontWeight: '800',
              padding: '2.5px 9px',
              borderRadius: '9999px',
            }}
          >
            {allItems.length} Total
          </span>
        </div>
      </div>

      {/* Concise KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Average Rating */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Average Rating
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', lineHeight: 1 }}>{avgRating}</span>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '700' }}>/ 5.0</span>
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fa-solid fa-star"></i>
          </div>
        </div>

        {/* Customer Feedbacks */}
        <div
          onClick={() => setActiveTab('feedbacks')}
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: activeTab === 'feedbacks' ? '2px solid var(--color-primary, #EA580C)' : '1px solid #F1F5F9',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Customer Feedbacks
            </p>
            <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-primary, #EA580C)', lineHeight: 1 }}>
              {feedbacks.length}
            </span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: '#FFF5F2',
              color: 'var(--color-primary, #EA580C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fa-regular fa-comments"></i>
          </div>
        </div>

        {/* Product Reviews */}
        <div
          onClick={() => setActiveTab('reviews')}
          style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            border: activeTab === 'reviews' ? '2px solid var(--color-primary, #EA580C)' : '1px solid #F1F5F9',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>
              Product Reviews
            </p>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#0EA5E9', lineHeight: 1 }}>
              {reviews.length}
            </span>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: '#EFF6FF',
              color: '#0EA5E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            <i className="fa-solid fa-award"></i>
          </div>
        </div>
      </div>

      {/* Tabs and Search / Filter Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Clean Filter Tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: '3.5px',
            borderRadius: '11px',
            gap: '3px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('feedbacks')}
            style={{
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'feedbacks' ? '800' : '600',
              background: activeTab === 'feedbacks' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'feedbacks' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: activeTab === 'feedbacks' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-regular fa-comments"></i>
            <span>Customer Feedbacks ({feedbacks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            style={{
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: activeTab === 'reviews' ? '800' : '600',
              background: activeTab === 'reviews' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'reviews' ? 'var(--color-primary, #EA580C)' : '#64748B',
              boxShadow: activeTab === 'reviews' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-regular fa-star"></i>
            <span>Product Reviews ({reviews.length})</span>
          </button>
        </div>

        {/* Integrated Search & Rating Dropdown with Smooth Chevron Transition */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#FFFFFF',
              border: isSearchFocused ? '1.5px solid var(--color-primary, #EA580C)' : '1.5px solid #E2E8F0',
              borderRadius: '11px',
              height: '38px',
              padding: '0 4px 0 12px',
              boxShadow: isSearchFocused ? '0 0 0 3px rgba(234, 88, 12, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
            }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                color: isSearchFocused ? 'var(--color-primary, #EA580C)' : '#94A3B8',
                fontSize: '12px',
                marginRight: '8px',
                transition: 'color 0.2s ease',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search keyword or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
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
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  marginRight: '4px',
                }}
                title="Clear search"
              >
                <i className="fa-solid fa-circle-xmark" />
              </button>
            )}

            {/* Dividing separator */}
            <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px' }} />

            {/* Custom Rating Dropdown Button with Smooth Animated Chevron */}
            <div ref={ratingDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsRatingOpen(!isRatingOpen)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: ratingFilter !== 'all' ? 'rgba(234, 88, 12, 0.1)' : 'transparent',
                  color: ratingFilter !== 'all' ? 'var(--color-primary, #EA580C)' : '#64748B',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                {ratingFilter !== 'all' && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-primary, #EA580C)',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span>{ratingFilter === 'all' ? 'All Ratings' : `${ratingFilter} Stars`}</span>
                <i
                  className="fa-solid fa-chevron-down"
                  style={{
                    fontSize: '9.5px',
                    color: isRatingOpen || ratingFilter !== 'all' ? 'var(--color-primary, #EA580C)' : '#94A3B8',
                    transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease',
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
                    borderRadius: '11px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E2E8F0',
                    padding: '4px',
                    zIndex: 60,
                    minWidth: '190px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    animation: 'adminModalScaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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
                          borderRadius: '7px',
                          border: 'none',
                          background: isSelected ? '#FFF5F2' : 'transparent',
                          color: isSelected ? 'var(--color-primary, #EA580C)' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? '800' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <i className="fa-solid fa-check" style={{ fontSize: '11px', color: 'var(--color-primary, #EA580C)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Reset Filters button if active */}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRatingFilter('all');
              }}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-rotate-left"></i> Reset
            </button>
          )}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '18%', padding: '13px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Date
                  </th>
                  <th style={{ width: '24%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Customer
                  </th>
                  <th style={{ width: '14%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', textAlign: 'center' }}>
                    Rating
                  </th>
                  <th style={{ width: '44%', padding: '13px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Feedback Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skel-fb-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ width: '90px', height: '13px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '130px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ width: '85%', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                    </tr>
                  ))
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '60px 20px' }}>
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
                  paginatedItems.map((fb, idx) => (
                    <tr
                      key={fb.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFD')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Date */}
                      <td style={{ padding: '13px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                          {formatDate(fb.created_at)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {formatRelative(fb.created_at)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px' }}>
                          {fb.customer_name || 'Anonymous'}
                        </span>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '13px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
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

                      {/* Message */}
                      <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, display: 'block' }}>
                          {fb.message}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── PRODUCT REVIEWS TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ width: '16%', padding: '13px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Date
                  </th>
                  <th style={{ width: '22%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Customer
                  </th>
                  <th style={{ width: '20%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Product
                  </th>
                  <th style={{ width: '12%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', textAlign: 'center' }}>
                    Rating
                  </th>
                  <th style={{ width: '22%', padding: '13px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                    Review Comment
                  </th>
                  <th style={{ width: '8%', padding: '13px 18px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', textAlign: 'center' }}>
                    Storefront
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skel-rev-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ width: '80px', height: '13px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '110px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '130px', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9', margin: '0 auto' }} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: '80%', height: '13px', borderRadius: '4px', background: '#F1F5F9' }} />
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ width: '50px', height: '22px', borderRadius: '999px', background: '#F1F5F9', margin: '0 auto' }} />
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
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFBFD')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Date */}
                        <td style={{ padding: '13px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                            {formatDate(rev.created_at)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            {formatRelative(rev.created_at)}
                          </span>
                        </td>

                        {/* Customer */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '13px' }}>
                            {rev.customer_name || 'Customer'}
                          </span>
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
                              }}
                            >
                              {productName}
                            </span>
                            {productSlug && (
                              <Link
                                href={`/shop/${productSlug}`}
                                target="_blank"
                                style={{ color: 'var(--color-primary, #EA580C)', fontSize: '11px' }}
                                title="View product in shop"
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* Rating */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
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
                          <span style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.45, display: 'block' }}>
                            {rev.comment}
                          </span>
                        </td>

                        {/* Storefront Visibility Toggle */}
                        <td style={{ padding: '13px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleApprove(rev)}
                            style={{
                              border: isLive ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                              background: isLive ? '#DCFCE7' : '#F1F5F9',
                              color: isLive ? '#166534' : '#64748B',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap',
                            }}
                            title={isLive ? 'Click to hide from store' : 'Click to show on store'}
                          >
                            <i className={isLive ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} style={{ fontSize: '10px' }}></i>
                            <span>{isLive ? 'Live' : 'Hidden'}</span>
                          </button>
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
