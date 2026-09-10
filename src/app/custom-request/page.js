'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/customer/BottomNav';
import BrandLogo from '@/components/common/BrandLogo';
import { createClient } from '@/lib/supabase/client';
import { generateCustomRequestReference } from '@/lib/engine/reference';

import HeaderSearchBar from '@/components/customer/HeaderSearchBar';
import CartIconBtn from '@/components/customer/CartIconBtn';
import SiteFooter from '@/components/common/SiteFooter';
import PremiumDatePicker from '@/components/common/PremiumDatePicker';

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

          {/* Desktop Navigation */}
          <nav className="top-bar-nav">
            <Link href="/" className="top-bar-link">Home</Link>
            <Link href="/shop" className="top-bar-link">Collection</Link>
            <Link href="/custom-request" className="top-bar-link active">Custom Orders</Link>
            <Link href="/track" className="top-bar-link">Track Order</Link>
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeaderSearchBar />
            <CartIconBtn />
          </div>
        </header>

        <main className="page-content page-enter">
          <div style={{ maxWidth: '560px', margin: '0 auto', width: '100%', padding: 'var(--space-6) var(--space-4)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
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

          <SiteFooter />
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <BrandLogo size="small" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="top-bar-nav">
          <Link href="/" className="top-bar-link">Home</Link>
          <Link href="/shop" className="top-bar-link">Collection</Link>
          <Link href="/custom-request" className="top-bar-link active">Custom Orders</Link>
          <Link href="/track" className="top-bar-link">Track Order</Link>
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeaderSearchBar />
          <CartIconBtn />
        </div>
      </header>

      <main className="page-content page-enter" style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
        <div className="section" style={{ paddingTop: 'var(--space-2)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h1 className="section-title" style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--color-text)' }}>
              Custom Handmade Order
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Tell us what you have in mind! We create bespoke crochet bouquets, fuzzy wire art, bloom boxes, and floral lamps tailored to your design and budget.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="custom-name">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="custom-name"
                name="name"
                className="input"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="custom-phone">Contact Number / FB Name *</label>
              <input
                id="custom-phone"
                name="phone"
                className="input"
                type="text"
                placeholder="e.g. 0917 123 4567 or FB Account"
                value={formData.phone}
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
              <PremiumDatePicker
                id="custom-date"
                name="preferredDate"
                label="Date Needed"
                value={formData.preferredDate}
                onChange={(val) => setFormData((prev) => ({ ...prev, preferredDate: val }))}
                minDate={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="custom-notes">Special Note</label>
              <input
                id="custom-notes"
                name="notes"
                className="input"
                type="text"
                placeholder="Special instructions or notes (optional)..."
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
        <SiteFooter />
      </main>

      <BottomNav />
    </div>
  );
}
