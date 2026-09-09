'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MOCK_ORDERS, MOCK_MATERIALS, getMockFeedbacks } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';

// Build initial synchronous notifications to prevent initial blank state
function buildNotificationList(ordersList = MOCK_ORDERS, materialsList = MOCK_MATERIALS, feedbacksList = getMockFeedbacks()) {
  const notifs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. ORDERS
  ordersList.forEach((ord) => {
    const isActive = ord.status !== 'completed' && ord.status !== 'cancelled';

    // 1-Day Before / Target Date Alert
    if (isActive && ord.preferred_date) {
      const target = new Date(ord.preferred_date);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        notifs.unshift({
          id: `due-tomorrow-${ord.id || ord.reference_code}`,
          icon: 'fa-solid fa-hourglass-half',
          color: '#D97706',
          bgColor: '#FEF3C7',
          title: `Due Tomorrow: ${ord.reference_code}`,
          subtitle: `${ord.customer_name} • Needed tomorrow`,
          href: `/admin/orders/${ord.id || ord.reference_code}`,
          time: ord.created_at,
        });
      } else if (diffDays === 0) {
        notifs.unshift({
          id: `due-today-${ord.id || ord.reference_code}`,
          icon: 'fa-solid fa-clock',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          title: `Due Today: ${ord.reference_code}`,
          subtitle: `${ord.customer_name} • Needed today`,
          href: `/admin/orders/${ord.id || ord.reference_code}`,
          time: ord.created_at,
        });
      }
    }

    if (ord.status === 'confirmed' || ord.status === 'pending' || ord.status === 'for_confirmation') {
      notifs.push({
        id: `ord-${ord.id || ord.reference_code}`,
        icon: 'fa-solid fa-cart-shopping',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        title: `New Order: ${ord.reference_code}`,
        subtitle: `${ord.customer_name} • ${formatCurrency(ord.total_amount)}`,
        href: `/admin/orders/${ord.id || ord.reference_code}`,
        time: ord.created_at,
      });
    }
  });

  // 2. FEEDBACKS & REVIEWS
  feedbacksList.slice(0, 2).forEach((fb) => {
    notifs.push({
      id: `fb-${fb.id}`,
      icon: 'fa-solid fa-star',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      title: `New Feedback (${fb.rating ? `${fb.rating}★` : 'Review'})`,
      subtitle: fb.message ? `"${fb.message.slice(0, 36)}..."` : 'Customer review received',
      href: '/admin/feedbacks',
      time: fb.created_at,
    });
  });

  // 3. LOW STOCKS
  materialsList.forEach((mat) => {
    const current = parseFloat(mat.current_stock) || 0;
    const minimum = parseFloat(mat.minimum_stock) || 0;

    if (current <= minimum) {
      notifs.push({
        id: `mat-${mat.id}`,
        icon: 'fa-solid fa-triangle-exclamation',
        color: current <= 0 ? '#DC2626' : '#EA580C',
        bgColor: current <= 0 ? '#FEE2E2' : '#FFEDD5',
        title: `Low Stock: ${mat.name}`,
        subtitle: `${current} ${mat.unit} remaining (Threshold: ${minimum})`,
        href: '/admin/materials',
        time: new Date().toISOString(),
      });
    }
  });

  return notifs;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(buildNotificationList);
  const [readIds, setReadIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const ref = useRef(null);

  // Load saved read and dismissed states from localStorage
  useEffect(() => {
    try {
      const savedRead = JSON.parse(localStorage.getItem('likha_notifs_read') || '[]');
      const savedDismissed = JSON.parse(localStorage.getItem('likha_notifs_dismissed') || '[]');
      if (Array.isArray(savedRead)) setReadIds(new Set(savedRead));
      if (Array.isArray(savedDismissed)) setDismissedIds(new Set(savedDismissed));
    } catch {}
  }, []);

  // Compute live notifications: New Orders, Due Dates, Feedbacks, Low Stocks
  const loadNotifications = useCallback(async () => {
    try {
      // 1. ORDERS
      let ordersList = [...MOCK_ORDERS];
      try {
        const localPlaced = JSON.parse(localStorage.getItem('likha_admin_orders') || '[]');
        if (Array.isArray(localPlaced) && localPlaced.length > 0) {
          const localRefs = new Set(localPlaced.map((o) => o.reference_code));
          ordersList = [...localPlaced, ...ordersList.filter((o) => !localRefs.has(o.reference_code))];
        }
      } catch {}

      try {
        const supabase = createClient();
        if (supabase) {
          const { data: dbOrders } = await supabase
            .from('orders')
            .select('id, reference_code, customer_name, status, total_amount, preferred_date, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
          if (dbOrders && dbOrders.length > 0) {
            const dbRefs = new Set(dbOrders.map((o) => o.reference_code));
            ordersList = [...dbOrders, ...ordersList.filter((o) => !dbRefs.has(o.reference_code))];
          }
        }
      } catch {}

      // 2. FEEDBACKS
      let feedbacksList = getMockFeedbacks();
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: dbFeedbacks } = await supabase
            .from('feedbacks')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          if (dbFeedbacks && dbFeedbacks.length > 0) {
            feedbacksList = dbFeedbacks;
          }
        }
      } catch {}

      // 3. MATERIALS
      let materialsList = [...MOCK_MATERIALS];
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: dbMaterials } = await supabase.from('materials').select('*');
          if (dbMaterials && dbMaterials.length > 0) {
            materialsList = dbMaterials;
          }
        }
      } catch {}

      const freshNotifs = buildNotificationList(ordersList, materialsList, feedbacksList);
      setNotifications(freshNotifs);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleSync = () => loadNotifications();
    window.addEventListener('storage', handleSync);
    window.addEventListener('likha_order_placed', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('likha_order_placed', handleSync);
    };
  }, [loadNotifications]);

  // Lock body scroll and listen for escape key when open
  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter active notifications
  const activeNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const unreadCount = activeNotifications.filter((n) => !readIds.has(n.id)).length;

  // Mark single item as read
  const handleMarkAsRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    try {
      localStorage.setItem('likha_notifs_read', JSON.stringify(Array.from(updated)));
    } catch {}
  };

  // Mark all as read (clears badge counter without deleting items)
  const handleMarkAllRead = () => {
    const updated = new Set(readIds);
    activeNotifications.forEach((n) => updated.add(n.id));
    setReadIds(updated);
    try {
      localStorage.setItem('likha_notifs_read', JSON.stringify(Array.from(updated)));
    } catch {}
  };

  // Dismiss / Delete single item
  const handleDismissItem = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    try {
      localStorage.setItem('likha_notifs_dismissed', JSON.stringify(Array.from(updated)));
    } catch {}
  };

  // Clear all (dismiss all items)
  const handleClearAll = () => {
    const updated = new Set(dismissedIds);
    notifications.forEach((n) => updated.add(n.id));
    setDismissedIds(updated);
    try {
      localStorage.setItem('likha_notifs_dismissed', JSON.stringify(Array.from(updated)));
    } catch {}
  };

  // Reset / Restore all dismissed notifications
  const handleResetDismissed = () => {
    setDismissedIds(new Set());
    try {
      localStorage.removeItem('likha_notifs_dismissed');
    } catch {}
    loadNotifications();
  };

  return (
    <>
      {/* Blurred & Locked Background Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 998,
            animation: 'fadeIn 0.15s ease-out forwards',
          }}
          aria-hidden="true"
        />
      )}

      <div ref={ref} style={{ position: 'relative', zIndex: open ? 999 : 'auto' }}>
        {/* Bell Button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="admin-notif-btn"
          aria-label="Notifications"
          style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: open ? 'var(--color-primary, #b45309)' : '#FAF6F0',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            zIndex: open ? 1001 : 'auto',
          }}
        >
          <i
            className="fa-solid fa-bell"
            style={{
              fontSize: '15px',
              color: open ? '#FFFFFF' : 'var(--color-primary, #b45309)',
              transition: 'color 0.15s ease',
            }}
          ></i>

          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                minWidth: '17px',
                height: '17px',
                borderRadius: '9999px',
                background: '#DC2626',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Popover Dropdown */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '360px',
              maxWidth: 'calc(100vw - 20px)',
              background: '#FFFFFF',
              borderRadius: '14px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.22), 0 3px 10px rgba(0,0,0,0.1)',
              zIndex: 1002,
              overflow: 'hidden',
              animation: 'scaleIn 0.15s ease-out forwards',
            }}
          >
          {/* Header */}
          <div
            style={{
              padding: '12px 14px',
              background: '#FAF6F0',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '800', fontSize: '13.5px', color: '#0F172A' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    fontWeight: '800',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary, #b45309)',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}

              {activeNotifications.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetDismissed}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary, #b45309)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Restore notifications"
                >
                  Restore alerts
                </button>
              )}
            </div>
          </div>

          {/* List Area - Standard default height */}
          <div className="custom-slim-scrollbar" style={{ height: '240px', overflowY: 'auto' }}>
            {activeNotifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '20px 16px',
                textAlign: 'center',
                color: '#64748B',
                boxSizing: 'border-box',
              }}>
                <i className="fa-solid fa-bell-slash" style={{ fontSize: '24px', color: '#CBD5E1', marginBottom: '8px', display: 'block' }}></i>
                <p style={{ fontWeight: '700', fontSize: '13.5px', color: '#0F172A', margin: '0 0 3px' }}>
                  No active notifications
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 12px' }}>
                  You are all caught up!
                </p>
                <button
                  type="button"
                  onClick={handleResetDismissed}
                  style={{
                    background: '#FAF6F0',
                    border: '1px solid #E2D9CD',
                    color: 'var(--color-primary, #b45309)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <i className="fa-solid fa-rotate-left" style={{ fontSize: '10.5px' }}></i>
                  Restore notifications
                </button>
              </div>
            ) : (
              <div>
                {activeNotifications.map((item, idx) => {
                  const isRead = readIds.has(item.id);
                  const isLast = idx === activeNotifications.length - 1;
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
                        background: isRead ? '#FFFFFF' : 'rgba(180, 83, 9, 0.02)',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF6F0')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isRead ? '#FFFFFF' : 'rgba(180, 83, 9, 0.02)')}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          handleMarkAsRead(item.id);
                          setOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          textDecoration: 'none',
                          color: '#0F172A',
                          paddingRight: '32px',
                        }}
                      >
                        {/* Side Icon Badge */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: item.bgColor,
                            color: item.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          <i className={item.icon}></i>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Row 1: Title (left) & Timestamp (right) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                              <p
                                style={{
                                  fontWeight: isRead ? '600' : '700',
                                  fontSize: '12.5px',
                                  margin: 0,
                                  color: isRead ? '#475569' : '#0F172A',
                                  lineHeight: 1.3,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.title}
                              </p>
                              {!isRead && (
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary, #b45309)',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>

                            {item.time && (
                              <span style={{ fontSize: '10.5px', color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: '500' }}>
                                {formatRelative(item.time)}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Subtitle / Details */}
                          <p
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              margin: 0,
                              lineHeight: 1.25,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </Link>

                      {/* Dismiss / Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDismissItem(e, item.id)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'transparent',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FEE2E2';
                          e.currentTarget.style.color = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94A3B8';
                        }}
                        title="Delete notification"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </>
);
}
