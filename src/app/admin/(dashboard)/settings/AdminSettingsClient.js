'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminSettingsClient() {
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [settings, setSettings] = useState({
    studioName: 'M&M Artsy',
    tagline: 'Handcrafted Everlasting Fuzzy Bouquets & Resin Keepsakes',
    messengerLink: 'https://www.facebook.com/messages/t/61587268312750',
    contactNumber: '0917 890 1234',
    gcashName: 'M&M ARTSY STUDIO',
    gcashNumber: '0917 890 1234',
    deliveryFee: 45,
    deliveryFeeMode: 'auto',
    deliveryFeeNear: 20,
    deliveryFeeMid: 35,
    deliveryFeeFar: 45,
    studioAddress: 'Poblacion, Barugo, Leyte (Near Town Plaza)',
    autoConfirm: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      } catch {
        try {
          const local = localStorage.getItem('mm_studio_settings');
          if (local) setSettings(JSON.parse(local));
        } catch {}
      }
    }
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mm_studio_settings', JSON.stringify(settings));
      }
    } catch {}

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {}

    setSaving(false);
    setToastMsg('Studio settings saved successfully! ✨');
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast">
          <i className="fa-solid fa-circle-check"></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '18px' }}>
        <h1 className="admin-page-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>Studio Settings</h1>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
          {/* Business Profile */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-store" style={{ color: 'var(--color-primary)' }}></i>
              <span>Studio & Brand Profile</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  Studio / Brand Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.studioName}
                  onChange={(e) => handleChange('studioName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  Brand Tagline
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  Facebook Messenger Direct Link
                </label>
                <input
                  type="url"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.messengerLink}
                  onChange={(e) => handleChange('messengerLink', e.target.value)}
                  placeholder="https://m.me/..."
                  required
                />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Connected Page ID: <code>61587268312750</code>
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  Studio Contact Mobile
                </label>
                <input
                  type="tel"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.contactNumber}
                  onChange={(e) => handleChange('contactNumber', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment & Fulfillment */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-wallet" style={{ color: 'var(--color-primary)' }}></i>
              <span>Payment & Fulfillment Config</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  GCash Account Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.gcashName}
                  onChange={(e) => handleChange('gcashName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  GCash Mobile Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.gcashNumber}
                  onChange={(e) => handleChange('gcashNumber', e.target.value)}
                  required
                />
              </div>

              <div style={{ background: 'var(--color-surface-warm, #FAF8F5)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text)' }}>
                  🛵 Delivery Fee Calculation Method
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('deliveryFeeMode', 'auto')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      border: settings.deliveryFeeMode !== 'fixed' ? '2px solid var(--color-primary)' : '1px solid var(--color-border-light)',
                      background: settings.deliveryFeeMode !== 'fixed' ? 'var(--color-primary-lighter)' : '#FFFFFF',
                      color: settings.deliveryFeeMode !== 'fixed' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className="fa-solid fa-route"></i>
                    <span>Auto (Distance-based)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('deliveryFeeMode', 'fixed')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      border: settings.deliveryFeeMode === 'fixed' ? '2px solid var(--color-primary)' : '1px solid var(--color-border-light)',
                      background: settings.deliveryFeeMode === 'fixed' ? 'var(--color-primary-lighter)' : '#FFFFFF',
                      color: settings.deliveryFeeMode === 'fixed' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className="fa-solid fa-sliders"></i>
                    <span>Fixed / Manual Fee</span>
                  </button>
                </div>

                {settings.deliveryFeeMode !== 'fixed' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '0 0 4px' }}>
                      Auto-computes using GPS map pin from Studio in Barugo Proper:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          0–2 km (Poblacion)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-text-muted)' }}>₱</span>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '22px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeNear !== undefined ? settings.deliveryFeeNear : 20}
                            onChange={(e) => handleChange('deliveryFeeNear', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          2–5 km (Barangays)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-text-muted)' }}>₱</span>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '22px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeMid !== undefined ? settings.deliveryFeeMid : 35}
                            onChange={(e) => handleChange('deliveryFeeMid', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          5+ km (Carigara/Max)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-text-muted)' }}>₱</span>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '22px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeFar !== undefined ? settings.deliveryFeeFar : 45}
                            onChange={(e) => handleChange('deliveryFeeFar', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                      Flat Delivery Rate for All Deliveries (₱)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100%' }}
                      value={settings.deliveryFee !== undefined ? settings.deliveryFee : 45}
                      onChange={(e) => handleChange('deliveryFee', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                  In-Studio Pickup Address
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={settings.studioAddress}
                  onChange={(e) => handleChange('studioAddress', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                <span>Save Studio Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
