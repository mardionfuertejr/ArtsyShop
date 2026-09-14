'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandLogo from '@/components/common/BrandLogo';
import NotificationBell from '@/components/admin/NotificationBell';

const NAV_ITEMS = [
  { href: '/admin', icon: 'fa-solid fa-chart-pie', label: 'Dashboard' },
  { href: '/admin/orders', icon: 'fa-solid fa-box-archive', label: 'Orders' },
  { href: '/admin/products', icon: 'fa-solid fa-tags', label: 'Products' },
  { href: '/admin/materials', icon: 'fa-solid fa-boxes-stacked', label: 'Materials' },
  { href: '/admin/feedbacks', icon: 'fa-solid fa-comments', label: 'Reviews' },
  { href: '/admin/reports', icon: 'fa-solid fa-chart-line', label: 'Reports' },
  { href: '/admin/settings', icon: 'fa-solid fa-sliders', label: 'Settings' },
];

const BOTTOM_NAV_ITEMS = [
  { href: '/admin', icon: 'fa-solid fa-chart-pie', label: 'Dashboard' },
  { href: '/admin/orders', icon: 'fa-solid fa-box-archive', label: 'Orders' },
  { href: '/admin/products', icon: 'fa-solid fa-tags', label: 'Products' },
  { href: '/admin/materials', icon: 'fa-solid fa-boxes-stacked', label: 'Materials' },
  { href: '/admin/settings', icon: 'fa-solid fa-sliders', label: 'Settings' },
];

export default function AdminShellClient({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticPath, setOptimisticPath] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Clear optimistic state when route transition completes
  useEffect(() => {
    setOptimisticPath(null);
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const currentPath = optimisticPath || pathname;

  const isActive = (href) => {
    if (href === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(href);
  };

  const handleNavClick = (href) => {
    if (href === pathname) return;
    setOptimisticPath(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const handlePrefetch = (href) => {
    try {
      router.prefetch(href);
    } catch {}
  };

  return (
    <div className="admin-shell">
      {/* Top Route Transition Progress Bar */}
      {(isPending || optimisticPath) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #EA580C 0%, #F59E0B 50%, #EA580C 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1s infinite linear',
            zIndex: 9999,
            boxShadow: '0 0 8px rgba(234, 88, 12, 0.6)',
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-logo" style={{ padding: '16px 20px', minHeight: '70px' }}>
          <Link
            href="/admin"
            prefetch={true}
            onClick={() => handleNavClick('/admin')}
            onMouseEnter={() => handlePrefetch('/admin')}
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            <BrandLogo size="large" />
          </Link>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                onMouseEnter={() => handlePrefetch(item.href)}
                onTouchStart={() => handlePrefetch(item.href)}
                className={`sidebar-link${active ? ' active' : ''}`}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="sidebar-link-icon">
                  <i className={item.icon}></i>
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="sidebar-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--color-danger)' }}
            >
              <span className="sidebar-link-icon">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside className={`admin-mobile-drawer${drawerOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        <div className="admin-drawer-header">
          <BrandLogo size="medium" />
          <button
            type="button"
            className="admin-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="admin-drawer-user">
          <i className="fa-solid fa-circle-user" style={{ fontSize: '20px', color: 'var(--color-primary)' }}></i>
          <span className="admin-drawer-email">{user?.email || 'admin@mmartsy.com'}</span>
        </div>

        <nav className="admin-drawer-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  setDrawerOpen(false);
                  handleNavClick(item.href);
                }}
                onMouseEnter={() => handlePrefetch(item.href)}
                onTouchStart={() => handlePrefetch(item.href)}
                className={`admin-drawer-link${active ? ' active' : ''}`}
              >
                <span className="admin-drawer-icon">
                  <i className={item.icon}></i>
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-drawer-footer">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="admin-drawer-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--color-danger)' }}
            >
              <span className="admin-drawer-icon">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar" style={{ borderBottom: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="admin-mobile-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>

          {/* Brand/Title */}
          <div className="admin-topbar-brand">
            <span className="admin-topbar-tag">Admin Workspace</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm admin-view-store-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: '#FAF6F0',
                color: 'var(--color-primary, #b45309)',
                fontWeight: '700',
                fontSize: '12px',
                borderRadius: '8px',
                padding: '6px 12px',
                boxShadow: 'none',
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '11px' }}></i>
              <span className="admin-view-store-text">View Shop</span>
            </Link>

            <NotificationBell />
          </div>
        </header>

        {/* Dynamic Admin Page Content */}
        <div key={pathname} className="admin-content">
          {children}
        </div>

        {/* Mobile Admin Bottom Navigation */}
        <nav className="admin-mobile-bottom-nav" aria-label="Mobile quick actions">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                onMouseEnter={() => handlePrefetch(item.href)}
                onTouchStart={() => handlePrefetch(item.href)}
                className={`admin-bottom-tab${active ? ' active' : ''}`}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className="admin-bottom-tab"
            onClick={() => setDrawerOpen(true)}
          >
            <i className="fa-solid fa-ellipsis"></i>
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
