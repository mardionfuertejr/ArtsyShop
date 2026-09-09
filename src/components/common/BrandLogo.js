import React from 'react';
import Image from 'next/image';

export default function BrandLogo({ size = 'medium', className = '', dark = false }) {
  // Height sizing
  const dimensions = size === 'small'
    ? { height: 38, maxWidth: '150px' }
    : size === 'large'
    ? { height: 62, maxWidth: '240px' }
    : size === 'xl'
    ? { height: 72, maxWidth: '280px' }
    : { height: 48, maxWidth: '190px' };

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        userSelect: 'none',
        lineHeight: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo_m&m_transparent.png"
        alt="M&M Artsy"
        style={{
          height: `${dimensions.height}px`,
          width: 'auto',
          maxWidth: dimensions.maxWidth,
          objectFit: 'contain',
          display: 'block',
          filter: dark ? 'brightness(1.5) drop-shadow(0 0 2px rgba(255,255,255,0.2))' : 'none',
          transition: 'transform 0.2s ease',
        }}
      />
    </div>
  );
}
