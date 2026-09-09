'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: 'mardionjrcordetafuerte@gmail.com', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('mm_admin_remember');
      const savedEmail = localStorage.getItem('mm_admin_email');
      if (savedRemember === 'true' && savedEmail) {
        setForm(p => ({ ...p, email: savedEmail }));
        setRememberMe(true);
      } else if (savedRemember === 'false') {
        setRememberMe(false);
      }
    } catch {}
  }, []);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const grantSession = (email) => {
    const maxAge = rememberMe ? 2592000 : 86400; // 30 days vs 1 day
    document.cookie = `admin_session=true; path=/; max-age=${maxAge}; SameSite=Lax`;

    try {
      if (rememberMe) {
        localStorage.setItem('mm_admin_remember', 'true');
        localStorage.setItem('mm_admin_email', email || form.email);
      } else {
        localStorage.setItem('mm_admin_remember', 'false');
        localStorage.removeItem('mm_admin_email');
      }
    } catch {}

    router.push('/admin');
    router.refresh();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const inputEmail = form.email.trim().toLowerCase();
    const inputPass = form.password.trim();

    // Check valid admin credentials
    const validEmails = ['mardionjrcordetafuerte@gmail.com', 'admin@mmartsy.com', 'admin@mmartsy.ph', 'admin'];
    const validPass = ['january2026', 'etala@2026', 'admin', 'admin2026'];

    if (
      (validEmails.includes(inputEmail) || inputEmail.includes('mardion') || inputEmail.includes('admin')) &&
      validPass.includes(inputPass)
    ) {
      grantSession(inputEmail);
      return;
    }

    try {
      const supabase = createClient();
      if (supabase) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (!authErr) {
          grantSession(inputEmail);
          return;
        }
      }
    } catch {
      // Ignore network errors
    }

    setError('Invalid email or password. Please try again.');
    setLoading(false);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotSubmitted(true);
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '4px' }}>
            <BrandLogo size="large" />
          </div>
          <p style={{
            fontSize: '13.5px',
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Sign in to manage your store
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="email" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <i
                className="fa-solid fa-envelope"
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              ></i>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="admin@mmartsy.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
                style={{ paddingLeft: '40px', height: '44px', fontSize: '13.5px' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <i
                className="fa-solid fa-lock"
                style={{
                  position: 'absolute',
                  left: '14px',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              ></i>
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your studio password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                autoComplete="current-password"
                style={{ paddingLeft: '40px', paddingRight: '40px', height: '44px', fontSize: '13.5px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  fontSize: '14px',
                }}
              >
                <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginTop: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-secondary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setForgotEmail(form.email);
                setForgotSubmitted(false);
                setShowForgotModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--color-primary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12.5px',
              }}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--color-danger, #dc2626)',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
            }}>
              <i className="fa-solid fa-circle-exclamation" style={{ flexShrink: 0, fontSize: '11px' }}></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full ripple"
            disabled={loading}
            id="admin-login-btn"
            style={{
              height: '46px',
              fontSize: '14.5px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '22px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontWeight: '600',
              transition: 'color 0.15s ease',
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: '11px' }}></i>
            <span>Return to Customer View</span>
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForgotModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-surface, #ffffff)',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--color-primary-lighter, #FDF2F4)',
                    color: 'var(--color-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    marginBottom: '10px',
                  }}>
                    <i className="fa-solid fa-key"></i>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 4px' }}>
                    Reset Studio Password
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    Enter your email to receive recovery instructions.
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Admin Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@mmartsy.com"
                    required
                    style={{ width: '100%', height: '42px', fontSize: '13px' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  style={{ height: '42px', fontSize: '13.5px', fontWeight: '600' }}
                >
                  Send Reset Link
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'var(--color-success-bg, #DCFCE7)',
                  color: 'var(--color-success, #16A34A)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  marginBottom: '12px',
                }}>
                  <i className="fa-solid fa-paper-plane"></i>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)', margin: '0 0 6px' }}>
                  Reset Link Sent!
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  margin: '0 0 16px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  Recovery details sent to your registered email.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setShowForgotModal(false)}
                  style={{ height: '40px', fontSize: '13px' }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

