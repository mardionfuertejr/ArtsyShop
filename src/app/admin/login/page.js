'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { triggerAdminSecurityCode } from '@/lib/utils/pushNotification';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setEmail(savedEmail);
        setRememberMe(true);
      } else if (savedRemember === 'false') {
        setRememberMe(false);
      }
    } catch {}
  }, []);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [dispatchedCode, setDispatchedCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        try {
          if (rememberMe) {
            localStorage.setItem('mm_admin_remember', 'true');
            localStorage.setItem('mm_admin_email', email.trim());
          } else {
            localStorage.setItem('mm_admin_remember', 'false');
            localStorage.removeItem('mm_admin_email');
          }
        } catch {}

        router.push('/admin');
        router.refresh();
        return;
      }

      setError(data.message || 'Invalid email or password. Please try again.');
    } catch {
      setError('Network error during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setForgotEmail(email || localStorage.getItem('mm_admin_email') || '');
    setForgotStep('email');
    setForgotCode('');
    setDispatchedCode('');
    setForgotNewPass('');
    setForgotError('');
    setForgotSuccess('');
    setShowForgotModal(true);
  };

  const handleRequestDeviceCode = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your admin email.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_code',
          email: forgotEmail.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDispatchedCode(data.code);
        setForgotStep('verify');
        // Trigger device push notification
        triggerAdminSecurityCode({ code: data.code, email: forgotEmail.trim() });
      } else {
        setForgotError(data.message || 'Unable to send security code.');
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (!forgotCode.trim() || !forgotNewPass.trim()) {
      setForgotError('Please enter the 6-digit code and new password.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset',
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPass.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForgotSuccess('Password updated! Logging in...');
        setTimeout(() => {
          router.push('/admin');
          router.refresh();
        }, 800);
      } else {
        setForgotError(data.message || 'Invalid verification code.');
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
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
                  zIndex: 2,
                }}
              ></i>
              <input
                id="email"
                name="email"
                className="input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                style={{
                  paddingLeft: '40px',
                  height: '44px',
                  fontSize: '13.5px',
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? 'not-allowed' : 'text',
                  position: 'relative',
                  zIndex: 1,
                }}
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
                  zIndex: 2,
                }}
              ></i>
              <input
                id="password"
                name="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                style={{
                  paddingLeft: '40px',
                  paddingRight: '40px',
                  height: '44px',
                  fontSize: '13.5px',
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? 'not-allowed' : 'text',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
              <button
                type="button"
                tabIndex="-1"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  padding: '4px 6px',
                  fontSize: '14px',
                  zIndex: 2,
                }}
              >
                <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginTop: '2px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              color: 'var(--color-text-secondary)',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={loading}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: 'var(--color-primary)',
                  width: '15px',
                  height: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={handleOpenForgot}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--color-primary)',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
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

      {/* Device Push Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="modal-backdrop"
          onClick={() => !forgotLoading && setShowForgotModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
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
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              disabled={forgotLoading}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
                fontSize: '13px',
              }}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(180, 83, 9, 0.1)',
                  color: 'var(--color-primary, #b45309)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginBottom: '8px',
                }}
              >
                <i className={forgotStep === 'email' ? 'fa-solid fa-mobile-screen' : 'fa-solid fa-shield-halved'}></i>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                {forgotStep === 'email' ? 'Reset Password' : 'Device Verification'}
              </h3>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '14px',
                  textAlign: 'center',
                }}
              >
                {forgotError}
              </div>
            )}

            {/* Success Message */}
            {forgotSuccess && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '14px',
                  textAlign: 'center',
                }}
              >
                {forgotSuccess}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 'email' && (
              <form onSubmit={handleRequestDeviceCode}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    Admin Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    style={{ width: '100%', height: '40px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary btn-full"
                  style={{
                    height: '40px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {forgotLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" style={{ fontSize: '11.5px' }}></i>
                      <span>Send Code to Device</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter Code & New Password */}
            {forgotStep === 'verify' && (
              <form onSubmit={handleVerifyAndReset}>
                {/* Instant Quick Insert Pill */}
                {dispatchedCode && (
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#92400E', fontWeight: '600' }}>
                      Code: <strong style={{ letterSpacing: '1px', fontFamily: 'monospace', fontSize: '14px' }}>{dispatchedCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setForgotCode(dispatchedCode)}
                      style={{
                        background: '#EA580C',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Autofill
                    </button>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    style={{
                      width: '100%',
                      height: '40px',
                      fontSize: '16px',
                      fontWeight: '700',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    placeholder="Enter new password"
                    required
                    style={{ width: '100%', height: '40px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary btn-full"
                  style={{
                    height: '40px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  {forgotLoading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>Reset & Sign In</span>
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleRequestDeviceCode}
                    disabled={forgotLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary, #b45309)',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

