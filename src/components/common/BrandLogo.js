'use client';

import React from 'react';

export default function BrandLogo({ size = 'medium', className = '', dark = false }) {
  // Height sizing
  const dimensions = size === 'small'
    ? { height: 30, width: 95 }
    : (size === 'splash' || size === 'hero')
    ? { height: 84, width: 266 }
    : size === 'xl'
    ? { height: 72, width: 228 }
    : size === 'large'
    ? { height: 56, width: 177 }
    : { height: 42, width: 133 };

  const textColor = dark ? '#FFFFFF' : '#1F1B18';

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        textDecoration: 'none',
        userSelect: 'none',
        lineHeight: 0,
        height: `${dimensions.height}px`,
        width: 'auto',
        aspectRatio: '380 / 120',
        transition: 'transform 0.2s ease',
      }}
      title="M&M Artsy"
      aria-label="M&M Artsy Logo"
    >
      <svg
        viewBox="0 0 380 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          overflow: 'visible',
          filter: dark ? 'drop-shadow(0 0 10px rgba(245, 172, 0, 0.25))' : 'none',
        }}
      >
        <defs>
          {/* Gold Gradients for 3D Ribbon Monogram */}
          <linearGradient id="goldPillar1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE57A" />
            <stop offset="35%" stopColor="#F5B20D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="goldPillar2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#C26100" />
          </linearGradient>

          <linearGradient id="goldDiagAscent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>

          <linearGradient id="goldDiagDescent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          <linearGradient id="foldShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(146, 64, 14, 0.55)" />
            <stop offset="100%" stopColor="rgba(146, 64, 14, 0)" />
          </linearGradient>

          <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#92400E" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* ── TWO DISTINCT SPACED LETTERS: M & M ── */}
        <g id="two-m-monogram" filter="url(#logoShadow)">
          {/* ════ FIRST LETTER M (Left) ════ */}
          {/* M1 Left Vertical Pillar */}
          <rect x="14" y="16" width="14" height="88" rx="2" fill="url(#goldPillar1)" />
          {/* M1 Diagonal Down-Right */}
          <polygon points="14,16 28,16 64,104 50,104" fill="url(#goldDiagDescent)" />
          {/* M1 Diagonal Up-Right */}
          <polygon points="50,104 64,104 96,16 82,16" fill="url(#goldDiagAscent)" />
          {/* M1 Bottom Fold Corner Shadow */}
          <polygon points="46,88 50,104 64,104 56,88" fill="url(#foldShadowGrad)" />
          {/* M1 Right Vertical Pillar */}
          <rect x="82" y="16" width="14" height="88" rx="2" fill="url(#goldPillar2)" />

          {/* ════ SECOND LETTER M (Right, Interlocking) ════ */}
          {/* M2 Left Vertical Pillar */}
          <rect x="74" y="16" width="14" height="88" rx="2" fill="url(#goldPillar1)" opacity="0.96" />
          {/* M2 Diagonal Down-Right */}
          <polygon points="74,16 88,16 124,104 110,104" fill="url(#goldDiagDescent)" />
          {/* M2 Diagonal Up-Right */}
          <polygon points="110,104 124,104 156,16 142,16" fill="url(#goldDiagAscent)" />
          {/* M2 Bottom Fold Corner Shadow */}
          <polygon points="106,88 110,104 124,104 116,88" fill="url(#foldShadowGrad)" />
          {/* M2 Right Vertical Pillar */}
          <rect x="142" y="16" width="14" height="88" rx="2" fill="url(#goldPillar1)" />
        </g>

        {/* ── ARTSY CALLIGRAPHY SCRIPT (Closer, cohesive spacing) ── */}
        <text
          x="176"
          y="82"
          textAnchor="start"
          fill={textColor}
          style={{
            fontFamily: "'Alex Brush', 'Great Vibes', 'Dancing Script', cursive",
            fontSize: '84px',
            fontWeight: '500',
            letterSpacing: '0.01em',
          }}
        >
          Artsy
        </text>
      </svg>
    </div>
  );
}
