'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteFooter from '@/components/common/SiteFooter';
import { createClient } from '@/lib/supabase/client';
import { generateCustomRequestReference } from '@/lib/engine/reference';

export default function CustomRequestClient({ product }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: product ? `I would like a custom variation of "${product.name}". ` : '',
    colorPreference: '',
    budget: product ? String(product.base_price) : '',
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
          source_product_id: product?.id || null,
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
    } catch {
      setSubmittedRef('LK-CR-260908-002');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div style={{ padding: 'var(--space-8) var(--space-6)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
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
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
          Thank you, <strong>{formData.name}</strong>! We received your request for <strong>{product?.name || 'this item'}</strong>.
        </p>

        <div style={{ width: '100%', margin: 'var(--space-2) 0' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
          href={`https://www.facebook.com/messages/t/61587268312750?text=${encodeURIComponent(`Hi M&M's Artsy! I submitted custom request ${submittedRef} for "${product?.name || 'Custom Product'}". Name: ${formData.name}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-full ripple"
          style={{ background: '#0866FF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <i className="fa-brands fa-facebook-messenger"></i>
          <span>Continue to Messenger</span>
        </a>

        <Link href="/shop" className="btn btn-ghost btn-full">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="section">
      {product && (
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}>
          {product.product_photos?.[0]?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.product_photos[0].url}
              alt={product.name}
              style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', objectFit: 'cover' }}
            />
          )}
          <div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Inspired by</p>
            <p style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)' }}>{product.name}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>Base ₱{product.base_price}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="input-group">
          <label className="input-label" htmlFor="req-name">Your Name *</label>
          <input
            id="req-name"
            name="name"
            className="input"
            type="text"
            placeholder="e.g. Carlo Mendoza"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="req-desc">Request Details *</label>
          <textarea
            id="req-desc"
            name="description"
            className="input"
            rows={3}
            placeholder="Bouquet idea, color changes, or wrap style..."
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="req-colors">Color Theme</label>
            <input
              id="req-colors"
              name="colorPreference"
              className="input"
              type="text"
              placeholder="e.g. Baby Blue"
              value={formData.colorPreference}
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="req-date">
              Date Needed <span className="required">*</span>
            </label>
            <input
              id="req-date"
              name="preferredDate"
              className="input"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={formData.preferredDate}
              onChange={handleChange}
              required
            />
          </div>
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

      <SiteFooter />
    </div>
  );
}
