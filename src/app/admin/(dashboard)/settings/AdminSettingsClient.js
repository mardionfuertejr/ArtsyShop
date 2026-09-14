'use client';

import { useState, useEffect } from 'react';

export default function AdminSettingsClient() {
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locSuccess, setLocSuccess] = useState(false);

  const [settings, setSettings] = useState({
    studioAddress: 'Poblacion, Barugo, Leyte (Near Town Plaza)',
    studioLat: 11.3039,
    studioLng: 124.7350,
    gcashName: 'M.... J.. F...',
    gcashNumber: '09949909686',
    deliveryFee: 45,
    deliveryFeeMode: 'auto',
    deliveryFeeNear: 20,
    deliveryFeeMid: 35,
    deliveryFeeFar: 45,
    rushFeeEnabled: true,
    rushFeeAmount: 50,
    announcementEnabled: true,
    announcementText: 'I-send ang resibo sa Messenger para masimulan agad ang pag-craft.',
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
          if (local) setSettings((prev) => ({ ...prev, ...JSON.parse(local) }));
        } catch {}
      }
    }
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToastMsg('Geolocation is not supported by your browser.');
      setTimeout(() => setToastMsg(''), 3000);
      return;
    }

    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSettings((prev) => ({
          ...prev,
          studioLat: latitude,
          studioLng: longitude,
        }));
        setDetectingLoc(false);
        setLocSuccess(true);
        setToastMsg('Store location synchronized! 📍');
        setTimeout(() => setToastMsg(''), 3000);
        setTimeout(() => setLocSuccess(false), 4000);
      },
      (err) => {
        setDetectingLoc(false);
        setToastMsg('Could not fetch location. Please allow location access.');
        setTimeout(() => setToastMsg(''), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    setToastMsg('Settings saved successfully!');
    setTimeout(() => setToastMsg(''), 2800);
  };

  const inputStyle = {
    width: '100%',
    height: '38px',
    background: '#F8FAFC',
    border: '1.5px solid #E2E8F0',
    borderRadius: '9px',
    padding: '0 12px',
    fontSize: '13px',
    color: '#0F172A',
    fontWeight: '600',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
  };

  return (
    <div style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toast Notification */}
      {toastMsg && (
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
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.02em' }}>
          Store Settings
        </h1>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            height: '38px',
            padding: '0 18px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-primary, #EA580C)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '800',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '12px' }}></i>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" style={{ fontSize: '12px' }}></i>
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
          
          {/* Card 1: Delivery & Order Rates (Left) */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              border: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#FFF5F2',
                    color: 'var(--color-primary, #EA580C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                  }}
                >
                  <i className="fa-solid fa-truck-fast"></i>
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    Delivery & Order Rates
                  </h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Store Pickup Address */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Store Pickup Address</label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={detectingLoc}
                      style={{
                        background: locSuccess ? '#ECFDF5' : '#FFF5F2',
                        border: locSuccess ? '1px solid #10B981' : '1px solid rgba(234, 88, 12, 0.25)',
                        color: locSuccess ? '#059669' : 'var(--color-primary, #EA580C)',
                        padding: '3px 9px',
                        borderRadius: '7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: detectingLoc ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                      title="Sync GPS location in background for distance calculations"
                    >
                      {detectingLoc ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '10px' }}></i>
                          <span>Detecting...</span>
                        </>
                      ) : locSuccess ? (
                        <>
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '10px' }}></i>
                          <span>Location Synced</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-location-crosshairs" style={{ fontSize: '10px' }}></i>
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    type="text"
                    style={inputStyle}
                    value={settings.studioAddress || ''}
                    onChange={(e) => handleChange('studioAddress', e.target.value)}
                    placeholder="e.g. Poblacion, Barugo, Leyte (Near Town Plaza)"
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary, #EA580C)';
                      e.target.style.background = '#FFFFFF';
                      e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.background = '#F8FAFC';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Delivery Calculation Mode & Rates */}
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '12px 14px',
                    borderRadius: '11px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <label style={{ ...labelStyle, marginBottom: 0, color: '#0F172A' }}>
                    Delivery Fee Calculation
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleChange('deliveryFeeMode', 'auto')}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: settings.deliveryFeeMode !== 'fixed' ? '800' : '600',
                        border: settings.deliveryFeeMode !== 'fixed' ? '1.5px solid var(--color-primary, #EA580C)' : '1px solid #CBD5E1',
                        background: settings.deliveryFeeMode !== 'fixed' ? '#FFFFFF' : 'transparent',
                        color: settings.deliveryFeeMode !== 'fixed' ? 'var(--color-primary, #EA580C)' : '#64748B',
                        boxShadow: settings.deliveryFeeMode !== 'fixed' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className="fa-solid fa-route"></i>
                      <span>Auto (Distance)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange('deliveryFeeMode', 'fixed')}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: settings.deliveryFeeMode === 'fixed' ? '800' : '600',
                        border: settings.deliveryFeeMode === 'fixed' ? '1.5px solid var(--color-primary, #EA580C)' : '1px solid #CBD5E1',
                        background: settings.deliveryFeeMode === 'fixed' ? '#FFFFFF' : 'transparent',
                        color: settings.deliveryFeeMode === 'fixed' ? 'var(--color-primary, #EA580C)' : '#64748B',
                        boxShadow: settings.deliveryFeeMode === 'fixed' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className="fa-solid fa-sliders"></i>
                      <span>Fixed Flat Rate</span>
                    </button>
                  </div>

                  {settings.deliveryFeeMode !== 'fixed' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '2px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748B', marginBottom: '3px' }}>
                          0–2 km (Poblacion)
                        </span>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94A3B8', fontWeight: '700' }}>₱</span>
                          <input
                            type="number"
                            style={{ ...inputStyle, height: '34px', paddingLeft: '20px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeNear !== undefined ? settings.deliveryFeeNear : 20}
                            onChange={(e) => handleChange('deliveryFeeNear', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748B', marginBottom: '3px' }}>
                          2–5 km (Barangays)
                        </span>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94A3B8', fontWeight: '700' }}>₱</span>
                          <input
                            type="number"
                            style={{ ...inputStyle, height: '34px', paddingLeft: '20px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeMid !== undefined ? settings.deliveryFeeMid : 35}
                            onChange={(e) => handleChange('deliveryFeeMid', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748B', marginBottom: '3px' }}>
                          5+ km (Outer/Max)
                        </span>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94A3B8', fontWeight: '700' }}>₱</span>
                          <input
                            type="number"
                            style={{ ...inputStyle, height: '34px', paddingLeft: '20px', fontSize: '12.5px' }}
                            value={settings.deliveryFeeFar !== undefined ? settings.deliveryFeeFar : 45}
                            onChange={(e) => handleChange('deliveryFeeFar', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '3px' }}>
                        Flat Delivery Rate
                      </span>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>₱</span>
                        <input
                          type="number"
                          style={{ ...inputStyle, paddingLeft: '24px' }}
                          value={settings.deliveryFee !== undefined ? settings.deliveryFee : 45}
                          onChange={(e) => handleChange('deliveryFee', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rush Order Fee Sub-Panel */}
            <div
              style={{
                background: '#F8FAFC',
                padding: '12px 14px',
                borderRadius: '11px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <i className="fa-solid fa-bolt" style={{ color: '#0EA5E9', fontSize: '13px' }}></i>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                    Rush Order Fee
                  </span>
                </div>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={settings.rushFeeEnabled !== false}
                    onChange={(e) => handleChange('rushFeeEnabled', e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary, #EA580C)' }}
                  />
                  <span>Enable Rush Fee</span>
                </label>
              </div>

              {settings.rushFeeEnabled !== false && (
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>₱</span>
                  <input
                    type="number"
                    style={{ ...inputStyle, height: '34px', paddingLeft: '22px', background: '#FFFFFF' }}
                    value={settings.rushFeeAmount !== undefined ? settings.rushFeeAmount : 50}
                    onChange={(e) => handleChange('rushFeeAmount', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Payment & Storefront Announcements (Right) */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              border: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                  }}
                >
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                    Payment & Store Broadcast
                  </h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* GCash Details */}
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '12px 14px',
                    borderRadius: '11px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <i className="fa-solid fa-wallet" style={{ color: '#2563EB', fontSize: '13px' }}></i>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>
                      GCash Payment Details
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '10.5px' }}>Account Name</label>
                      <input
                        type="text"
                        style={{ ...inputStyle, background: '#FFFFFF' }}
                        value={settings.gcashName || ''}
                        onChange={(e) => handleChange('gcashName', e.target.value)}
                        placeholder="e.g. M.... J.. F..."
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--color-primary, #EA580C)';
                          e.target.style.background = '#FFFFFF';
                          e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.background = '#FFFFFF';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ ...labelStyle, fontSize: '10.5px' }}>Mobile Number</label>
                      <input
                        type="text"
                        style={{ ...inputStyle, background: '#FFFFFF' }}
                        value={settings.gcashNumber || ''}
                        onChange={(e) => handleChange('gcashNumber', e.target.value)}
                        placeholder="e.g. 09949909686"
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--color-primary, #EA580C)';
                          e.target.style.background = '#FFFFFF';
                          e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.background = '#FFFFFF';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Announcement Banner */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Announcement Banner</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>
                      <input
                        type="checkbox"
                        checked={settings.announcementEnabled !== false}
                        onChange={(e) => handleChange('announcementEnabled', e.target.checked)}
                        style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary, #EA580C)' }}
                      />
                      <span>Enable Banner</span>
                    </label>
                  </div>

                  <textarea
                    style={{
                      ...inputStyle,
                      height: '56px',
                      padding: '8px 12px',
                      resize: 'none',
                      lineHeight: 1.4,
                    }}
                    value={settings.announcementText || ''}
                    onChange={(e) => handleChange('announcementText', e.target.value)}
                    placeholder="e.g. I-send ang resibo sa Messenger para masimulan agad ang pag-craft."
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary, #EA580C)';
                      e.target.style.background = '#FFFFFF';
                      e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.background = '#F8FAFC';
                      e.target.style.boxShadow = 'none';
                    }}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Announcement Banner Live Preview */}
            {settings.announcementEnabled !== false && settings.announcementText ? (
              <div
                style={{
                  background: '#FFF5F2',
                  border: '1px solid rgba(234, 88, 12, 0.2)',
                  color: '#9A3412',
                  fontSize: '11.5px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontWeight: '700' }}>📢 {settings.announcementText}</span>
              </div>
            ) : (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px dashed #E2E8F0',
                  color: '#94A3B8',
                  fontSize: '11.5px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                <span>Banner is currently disabled / hidden from storefront</span>
              </div>
            )}
          </div>

        </div>
      </form>
    </div>
  );
}
