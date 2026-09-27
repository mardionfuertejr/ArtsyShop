'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MOCK_CUSTOM_REQUESTS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatRelative, formatDate } from '@/lib/utils/formatDate';
import { openMessengerDirect } from '@/lib/utils/browserNav';

export default function AdminCustomRequestsClient() {
  const [requests, setRequests] = useState(MOCK_CUSTOM_REQUESTS);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [requestToDelete, setRequestToDelete] = useState(null);

  const searchInputRef = useRef(null);
  const filterRef = useRef(null);

  // Sync requests from Supabase & localStorage
  const fetchRequests = useCallback(async () => {
    let combined = [...MOCK_CUSTOM_REQUESTS];
    try {
      const local = JSON.parse(localStorage.getItem('likha_custom_requests') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        const localRefs = new Set(local.map(r => r.reference_code));
        combined = [...local, ...combined.filter(r => !localRefs.has(r.reference_code))];
      }
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.from('custom_requests').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const dbRefs = new Set(data.map(r => r.reference_code));
          combined = [...data, ...combined.filter(r => !dbRefs.has(r.reference_code))];
        }
      }
    } catch {}

    setRequests(combined);
    setHasLoadedOnce(true);
  }, []);

  useEffect(() => {
    fetchRequests();
    let supabase = null;
    let channel = null;
    try {
      supabase = createClient();
      if (supabase) {
        channel = supabase.channel('admin-custom-requests-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_requests' }, () => {
            fetchRequests();
          })
          .subscribe();
      }
    } catch {}

    return () => {
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  // Quote Modal State
  const [quotingRequest, setQuotingRequest] = useState(null);
  const [quotePrice, setQuotePrice] = useState(350);
  const [quoteDays, setQuoteDays] = useState(3);
  const [quoteNotes, setQuoteNotes] = useState('');

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Lock body scroll and listen for ESC key when modal is open
  useEffect(() => {
    if (requestToDelete || quotingRequest || previewPhoto) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setRequestToDelete(null);
          setQuotingRequest(null);
          setPreviewPhoto(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [requestToDelete, quotingRequest, previewPhoto]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // Close action menu and status filter on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
      if (!e.target.closest('.action-menu-dropdown-container')) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const statuses = [
    { key: 'all', label: 'All Requests', count: requests.length },
    { key: 'pending', label: 'Pending Quote', count: requests.filter(r => r.status === 'pending').length },
    { key: 'quoted', label: 'Quoted', count: requests.filter(r => r.status === 'quoted').length },
  ];

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const sortedFilteredRequests = [...filteredRequests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const totalRequests = sortedFilteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalRequests / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRequests = sortedFilteredRequests.slice(startIndex, startIndex + pageSize);

  const handleOpenQuote = (req) => {
    setQuotingRequest(req);
    setQuotePrice(req.quoted_price || req.budget || 350);
    setQuoteDays(3);
    setQuoteNotes(`Hi ${req.customer_name}! 🌸\nWe reviewed your custom request #${req.reference_code}.\n💰 Quoted Price: ₱${req.quoted_price || req.budget || 350}\n⏳ Production Time: 3 days\n📝 Notes: Ready to craft your handmade piece!`);
  };

  const handleSaveQuote = async (e, sendToMessenger = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quotingRequest) return;

    const parsedPrice = parseFloat(quotePrice) || 0;
    const reqId = quotingRequest.id;
    const refCode = quotingRequest.reference_code;

    // 1. Update State
    setRequests(prev =>
      prev.map(r =>
        (r.id === reqId || r.reference_code === refCode)
          ? { ...r, status: 'quoted', quoted_price: parsedPrice }
          : r
      )
    );

    // 2. Update LocalStorage
    try {
      const local = JSON.parse(localStorage.getItem('likha_custom_requests') || '[]');
      const updated = local.map(r =>
        (r.id === reqId || r.reference_code === refCode)
          ? { ...r, status: 'quoted', quoted_price: parsedPrice }
          : r
      );
      localStorage.setItem('likha_custom_requests', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}

    // 3. Update Supabase
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase
          .from('custom_requests')
          .update({
            status: 'quoted',
            quoted_price: parsedPrice,
          })
          .or(`id.eq.${reqId},reference_code.eq.${refCode}`);
      }
    } catch {}

    if (sendToMessenger) {
      const msg = `Hi ${quotingRequest.customer_name}! 🌸\nHere is your official quotation for Custom Request #${refCode}:\n\n💰 Quoted Price: ₱${parsedPrice.toLocaleString()}\n⏳ Production Time: ${quoteDays} days\n📝 Description: ${quotingRequest.description || 'Custom Handmade Craft'}\n\n🔍 Track & Confirm Your Order: https://mmartsyshop.com/track?ref=${encodeURIComponent(refCode)}`;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
      } catch {}
      openMessengerDirect(msg);
      showToast(`Quotation sent to Messenger for ${refCode}! 💬`);
    } else {
      showToast(`Quotation of ₱${parsedPrice} saved for ${refCode}! 💌`);
    }

    setQuotingRequest(null);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;
    const reqId = requestToDelete.id;
    const refCode = requestToDelete.reference_code;

    setRequests(prev => prev.filter(r => r.id !== reqId && r.reference_code !== refCode));

    try {
      const local = JSON.parse(localStorage.getItem('likha_custom_requests') || '[]');
      const updated = local.filter(r => r.id !== reqId && r.reference_code !== refCode);
      localStorage.setItem('likha_custom_requests', JSON.stringify(updated));
    } catch {}

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('custom_requests').delete().or(`id.eq.${reqId},reference_code.eq.${refCode}`);
      }
    } catch {}

    showToast(`Deleted request ${refCode}`);
    setRequestToDelete(null);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1160px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header: Title + Unified Search & Status Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            Custom Requests
          </h1>
          <span style={{
            background: 'rgba(180, 83, 9, 0.1)',
            color: 'var(--color-primary, #b45309)',
            fontSize: '12px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}>
            {filteredRequests.length} {filteredRequests.length === 1 ? 'Request' : 'Requests'}
          </span>
        </div>

        {/* Right Controls: Integrated Search & Status Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              border: isFocused ? '1.5px solid var(--color-primary, #b45309)' : '1px solid #e2e8f0',
              borderRadius: '10px',
              height: '38px',
              padding: '0 4px 0 12px',
              width: '300px',
              maxWidth: '100%',
              boxSizing: 'border-box',
              boxShadow: isFocused ? '0 0 0 3px rgba(180, 83, 9, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', fontSize: '12px', marginRight: '8px', flexShrink: 0 }}></i>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0f172a',
                width: '100%',
                padding: 0,
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                  searchInputRef.current?.focus();
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px',
                  marginRight: '4px',
                }}
              >
                ✕
              </button>
            )}

            <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px 0 2px', flexShrink: 0 }}></div>

            {/* Status Filter Dropdown Toggle Button */}
            <div style={{ position: 'relative' }} ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: statusFilter !== 'all' ? 'rgba(180, 83, 9, 0.12)' : 'transparent',
                  color: statusFilter !== 'all' ? 'var(--color-primary, #b45309)' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {statusFilter !== 'all' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary, #b45309)', display: 'inline-block', flexShrink: 0 }}></span>
                )}
                <span>{statusFilter === 'all' ? 'Status' : statuses.find(s => s.key === statusFilter)?.label || statusFilter}</span>
                <i
                  className="fa-solid fa-chevron-down"
                  style={{
                    fontSize: '9.5px',
                    color: statusFilter !== 'all' ? 'var(--color-primary, #b45309)' : '#94a3b8',
                    transition: 'transform 0.2s ease',
                    transform: isFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Status Filter Dropdown Menu */}
              {isFilterOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #f1f5f9',
                    padding: '4px',
                    zIndex: 50,
                    minWidth: '190px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {statuses.map((tab) => {
                    const isSelected = statusFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setStatusFilter(tab.key);
                          setCurrentPage(1);
                          setIsFilterOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? '#FAF6F0' : 'transparent',
                          color: isSelected ? 'var(--color-primary, #b45309)' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? '700' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>{tab.label}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            background: isSelected ? 'rgba(180, 83, 9, 0.15)' : '#f1f5f9',
                            color: isSelected ? 'var(--color-primary, #b45309)' : '#64748b',
                          }}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table Card */}
      <div className="data-table-wrapper" style={{ background: '#ffffff', borderRadius: '12px', overflow: 'visible', margin: 0, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              <th style={{ width: '20%', padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Ref & Date</th>
              <th style={{ width: '20%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Customer</th>
              <th style={{ width: '28%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Request Details & Photo</th>
              <th style={{ width: '14%', padding: '13px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Budget / Quote</th>
              <th style={{ width: '12%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Status</th>
              <th style={{ width: '6%', padding: '13px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', borderBottom: '1.5px solid #E2E8F0' }}>Action</th>
            </tr>
          </thead>
          <tbody key={`${statusFilter}-${searchQuery}-${currentPage}`} className="table-fade-enter">
            {!hasLoadedOnce ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={`skeleton-req-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '13px 18px', verticalAlign: 'middle' }}>
                    <div style={{ width: '95px', height: '14px', borderRadius: '4px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite ease-in-out', marginBottom: '5px' }} />
                    <div style={{ width: '60px', height: '11px', borderRadius: '3px', background: '#F8FAFC' }} />
                  </td>
                  <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                    <div style={{ width: '120px', height: '13px', borderRadius: '4px', background: '#F1F5F9', marginBottom: '4px' }} />
                    <div style={{ width: '85px', height: '11px', borderRadius: '3px', background: '#F8FAFC' }} />
                  </td>
                  <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                    <div style={{ width: '80%', height: '13px', borderRadius: '4px', background: '#F1F5F9', marginBottom: '5px' }} />
                    <div style={{ width: '45%', height: '11px', borderRadius: '3px', background: '#F8FAFC' }} />
                  </td>
                  <td style={{ padding: '13px 16px', verticalAlign: 'middle' }}>
                    <div style={{ width: '70px', height: '14px', borderRadius: '4px', background: '#F1F5F9', marginBottom: '4px' }} />
                    <div style={{ width: '50px', height: '10px', borderRadius: '3px', background: '#F8FAFC' }} />
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ width: '80px', height: '22px', borderRadius: '999px', background: '#F1F5F9', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F8FAFC', margin: '0 auto' }} />
                  </td>
                </tr>
              ))
            ) : paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell" style={{ textAlign: 'center', padding: '120px 20px', border: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#f8fafc', color: '#94a3b8', marginBottom: '14px', fontSize: '22px' }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ opacity: 0.8 }}></i>
                  </div>
                  <p style={{ margin: 0, fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>No custom requests found</p>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or status filter.' : 'Customer custom quote requests will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRequests.map((req, idx) => {
                const rowKey = `${req.id}-${idx}`;
                const isNearBottom = paginatedRequests.length <= 3 ? idx >= 1 : idx >= paginatedRequests.length - 2;
                const isQuoted = req.status === 'quoted';

                return (
                  <tr key={rowKey} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.12s ease' }}>
                    <td style={{ padding: '13px 18px', verticalAlign: 'top', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        {req.reference_code}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatRelative(req.created_at)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'top', maxWidth: '180px' }}>
                      <p
                        style={{
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 2px',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={req.customer_name}
                      >
                        {req.customer_name}
                      </p>
                      <p
                        style={{
                          fontSize: '11.5px',
                          color: '#64748b',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={req.customer_phone}
                      >
                        {req.customer_phone}
                      </p>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                      <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.4, margin: '0 0 6px' }}>
                        {req.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          Qty: {req.quantity} pc(s)
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                          Target: {formatDate(req.preferred_date)}
                        </span>
                        {req.reference_image && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(req.reference_image)}
                            style={{
                              border: 'none',
                              background: '#FAF6F0',
                              color: 'var(--color-primary, #b45309)',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="fa-solid fa-image" style={{ fontSize: '10px' }}></i>
                            <span>View Photo</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', verticalAlign: 'top' }}>
                      {isQuoted ? (
                        <div>
                          <span style={{ fontWeight: '800', color: 'var(--color-primary, #b45309)', fontSize: '13.5px', display: 'block' }}>
                            {formatCurrency(req.quoted_price)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Budget: {formatCurrency(req.budget)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', display: 'block' }}>
                            {req.budget ? formatCurrency(req.budget) : 'Flexible'}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                            Customer budget
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                      {isQuoted ? (
                        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', boxSizing: 'border-box', textAlign: 'center', background: '#E0E7FF', color: '#3730A3' }}>
                          QUOTED
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', padding: '0 8px', height: '24px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', boxSizing: 'border-box', textAlign: 'center', background: '#FEF3C7', color: '#92400E' }}>
                          PENDING
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div className="action-menu-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === rowKey ? null : rowKey);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeMenuId === rowKey ? '#f1f5f9' : 'transparent',
                            color: activeMenuId === rowKey ? '#0f172a' : '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (activeMenuId !== rowKey) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#0f172a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeMenuId !== rowKey) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                          title="Actions"
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                        {/* Dropdown Menu with Icons and Divider */}
                        {activeMenuId === rowKey && (
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
                              minWidth: '160px',
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
                                handleOpenQuote(req);
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
                              <i className="fa-solid fa-calculator" style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                              <span>{req.status === 'pending' ? 'Set Quote' : 'Edit Quote'}</span>
                            </button>

                            <a
                              href={`https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent(`Hi ${req.customer_name}! Regarding your custom request ${req.reference_code} (${req.description}):`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
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
                                color: '#0866FF',
                                fontSize: '12px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                boxSizing: 'border-box',
                                transition: 'background 0.1s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-brands fa-facebook-messenger" style={{ fontSize: '12px', color: '#0866FF', width: '14px' }}></i>
                              <span>Chat on Messenger</span>
                            </a>

                            {req.reference_image && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPreviewPhoto(req.reference_image);
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
                                <i className="fa-regular fa-image" style={{ fontSize: '12px', color: '#64748b', width: '14px' }}></i>
                                <span>View Photo</span>
                              </button>
                            )}

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '2px 0' }}></div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setRequestToDelete(req);
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

        {/* Pagination Controls (only if more than 10 requests) */}
        {totalRequests > 10 && (
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
                Showing <strong style={{ color: '#0f172a', fontWeight: '700' }}>{startIndex + 1}–{Math.min(startIndex + pageSize, totalRequests)}</strong> of <strong style={{ color: '#0f172a', fontWeight: '700' }}>{totalRequests}</strong> requests
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

      {/* Quote Submission Modal */}
      {quotingRequest && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setQuotingRequest(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Quote Custom Order
              </h3>
              <button
                type="button"
                onClick={() => setQuotingRequest(null)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuote} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#FAF6F0', padding: '10px 14px', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#64748b' }}>Customer: <strong style={{ color: '#0f172a' }}>{quotingRequest.customer_name}</strong></p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Ref: <code style={{ color: 'var(--color-primary, #b45309)', fontWeight: '700' }}>{quotingRequest.reference_code}</code></p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Quoted Price (₱) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '15px', fontWeight: '800', color: '#b45309', boxSizing: 'border-box' }}
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Estimated Production Time (Days) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#f8fafc', fontSize: '12.5px', boxSizing: 'border-box' }}
                  value={quoteDays}
                  onChange={(e) => setQuoteDays(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setQuotingRequest(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: '8px', padding: '0 14px', height: '36px', fontSize: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: '8px', padding: '0 16px', height: '36px', fontSize: '12px', fontWeight: '700', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A' }}
                >
                  Save Quote
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveQuote(e, true)}
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: '8px',
                    padding: '0 16px',
                    height: '36px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0084FF 0%, #0062E0 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fa-brands fa-facebook-messenger"></i>
                  <span>Send Quote via Messenger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              padding: '16px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Reference Photo</h3>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewPhoto} alt="Reference Photo" style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '10px' }} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div
          className="modal-backdrop-animate"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            animation: 'adminModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => setRequestToDelete(null)}
        >
          <div
            className="modal-dialog-animate"
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              animation: 'adminModalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
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
              Delete Request?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to remove custom request <strong style={{ color: '#0f172a' }}>{requestToDelete.reference_code}</strong>?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
