'use client';

import { useState } from 'react';
import { resolveProductPhoto, getSmartFallbackImage } from '@/lib/utils/productImage';

export default function ProductImage({
  src,
  product,
  alt = 'Handcrafted Item',
  className = '',
  style = {},
  fallbackCategory = '',
  iconSize = '1rem',
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveProductPhoto(src || product, fallbackCategory);

  if (hasError || !resolvedSrc) {
    const fallbackUrl = getSmartFallbackImage(fallbackCategory, alt);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
        style={{
          objectFit: 'cover',
          ...style,
        }}
        onError={(e) => {
          // If secondary fallback fails, swap to stylized craft icon placeholder
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={{
        objectFit: 'cover',
        ...style,
      }}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
