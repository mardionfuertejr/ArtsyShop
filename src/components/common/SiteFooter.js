import Link from 'next/link';

export default function SiteFooter({ className = '', style = {} }) {
  return (
    <footer
      className={`site-footer ${className}`}
      style={{
        marginTop: 'auto',
        width: '100%',
        borderTop: '1px solid var(--color-border-light, #E2E8F0)',
        padding: '24px 16px 20px',
        textAlign: 'center',
        ...style,
      }}
    >
      <p
        style={{
          fontSize: '12px',
          color: 'var(--color-text-muted, #64748B)',
          letterSpacing: '0.02em',
          margin: 0,
        }}
      >
        &copy; {new Date().getFullYear()} M&M Artsy. All Rights Reserved.
      </p>
    </footer>
  );
}
