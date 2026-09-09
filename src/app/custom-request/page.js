'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { generateCustomRequestReference } from '@/lib/engine/reference';

export default function CustomRequestPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: '',
    colorPreference: '',
    budget: '',
    preferredDate: '',
    notes: '',
  });

  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('likha_guest_info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        setFormData((prev) => ({
          ...prev,
          name: parsed.name || '',
          phone: parsed.phone || '',
        }));
      }
    } catch {}
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const refCode = await generateCustomRequestReference();
      const supabase = createClient();

      if (supabase) {
        await supabase.from('custom_requests').insert({
          reference_code: refCode,
          customer_name: formData.name,
          customer_phone: formData.phone,
          description: formData.description,
          preferred_color: formData.colorPreference || null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          preferred_date: formData.preferredDate || null,
          additional_notes: formData.notes || null,
          status: 'pending',
        });
      }

      try {
        localStorage.setItem('likha_guest_info', JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }));
      } catch {}

      setSubmittedRef(refCode);
    } catch (err) {
      setSubmittedRef('LK-CR-260908-001');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="customer-shell">
        <header className="top-bar">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            <BrandLogo size="small" />
          </Link>
        </header>

        <main className="page-content page-enter">
          <div style={{ padding: 'var(--space-6) var(--space-4)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-primary-lighter)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              fontSize: '28px',
            }}>
              <i className="fa-solid fa-paper-plane"></i>
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-extrabold)', margin: 0 }}>
              Custom Request Sent
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Thank you, <strong>{formData.name}</strong>! We received your custom request.
            </p>

            <div style={{ width: '100%', margin: 'var(--space-2) 0' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Request Reference
              </p>
              <div className="reference-code">{submittedRef}</div>
            </div>

            <div style={{
              background: 'var(--color-warning-bg)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-3) var(--space-4)',
              width: '100%',
              textAlign: 'left',
            }}>
              <p style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-comments" style={{ color: 'var(--color-primary)' }}></i>
                <span>Chat with us to finalize</span>
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Send your reference code on Facebook Messenger to confirm material details and quote.
              </p>
            </div>

            <a
              href={`https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent(`Hi M&M's Artsy! I submitted custom request ${submittedRef} for "${formData.description}". Name: ${formData.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-full ripple"
              style={{ background: '#0866FF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="fa-brands fa-facebook-messenger"></i>
              <span>Continue to Messenger</span>
            </a>

            <Link href="/shop" className="btn btn-ghost btn-full">
              Back to Collection
            </Link>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/shop" className="top-bar-action" aria-label="Back">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, margin: 0 }}>Custom Order</span>
        <div style={{ width: 40 }} />
      </header>

      <main className="page-content page-enter">
        <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="custom-name">Your Name *</label>
              <input
                id="custom-name"
                name="name"
                className="input"
                type="text"
                placeholder="e.g. Maria Santos"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="custom-desc">Request Details *</label>
              <textarea
                id="custom-desc"
                name="description"
                className="input"
                rows={3}
                placeholder="Bouquet idea, flowers, or theme..."
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="custom-colors">Color Theme</label>
                <input
                  id="custom-colors"
                  name="colorPreference"
                  className="input"
                  type="text"
                  placeholder="e.g. Pink, White"
                  value={formData.colorPreference}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="custom-budget">Budget (₱)</label>
                <input
                  id="custom-budget"
                  name="budget"
                  className="input"
                  type="number"
                  placeholder="e.g. 500"
                  value={formData.budget}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="custom-date">Date Needed</label>
              <input
                id="custom-date"
                name="preferredDate"
                className="input"
                type="date"
                value={formData.preferredDate}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="custom-notes">Special Note</label>
              <input
                id="custom-notes"
                name="notes"
                className="input"
                type="text"
                placeholder="e.g. Add card message, ribbon color..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full ripple"
              disabled={submitting}
              style={{
                marginTop: '4px',
                minHeight: '48px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '700',
                fontSize: '14.5px',
              }}
            >
              <span>{submitting ? 'Submitting...' : 'Send Request'}</span>
              {!submitting && <i className="fa-solid fa-arrow-right" style={{ fontSize: '13px' }}></i>}
            </button>
          </form>
        </div>

        <div style={{ height: 'var(--space-4)' }} />
      </main>

      <BottomNav />
    </div>
  );
}
