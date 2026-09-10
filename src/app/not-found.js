import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      background: 'var(--color-bg, #FAF6F0)',
      textAlign: 'center',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: '#ffffff',
        padding: '40px 28px',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <BrandLogo size="small" />

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#DC2626',
          fontSize: '28px',
          marginTop: '8px',
        }}>
          <i className="fa-solid fa-bag-shopping"></i>
        </div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: '800',
          color: 'var(--color-text, #1E293B)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Product or Page Not Found
        </h1>

        <p style={{
          fontSize: '13.5px',
          color: '#64748b',
          lineHeight: 1.5,
          margin: 0,
        }}>
          Ang item o page na ito ay maaaring naalis na o wala pa sa catalog. Maaari kang mag-browse sa collection o pumunta sa home page.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          marginTop: '12px',
        }}>
          <Link
            href="/shop"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--color-primary, #b45309)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '14px',
              padding: '12px 20px',
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)',
            }}
          >
            <i className="fa-solid fa-store"></i>
            <span>Browse Collection</span>
          </Link>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#f1f5f9',
              color: '#334155',
              fontWeight: '700',
              fontSize: '13.5px',
              padding: '10px 18px',
              borderRadius: '12px',
              textDecoration: 'none',
            }}
          >
            <i className="fa-solid fa-house"></i>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
