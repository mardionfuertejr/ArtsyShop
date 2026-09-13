'use client';

import { useState, useRef, useCallback } from 'react';

export default function PhotoCarousel({ photos = [], alt = 'Product photo' }) {
  const [current, setCurrent] = useState(0);
  const startX = useRef(null);
  const trackRef = useRef(null);

  const goTo = useCallback((idx) => {
    if (!photos || photos.length === 0) return;
    const len = photos.length;
    // Circular navigation so arrow is always clickable and responsive
    const nextIdx = (idx % len + len) % len;
    setCurrent(nextIdx);
  }, [photos]);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 30) {
      goTo(dx < 0 ? current + 1 : current - 1);
    }
    startX.current = null;
  };

  if (!photos.length) {
    return (
      <div className="photo-carousel">
        <div className="product-card-image-placeholder" style={{ borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
          <i className="fa-regular fa-image" style={{ fontSize: '2.5rem', color: 'var(--color-text-muted)' }}></i>
        </div>
      </div>
    );
  }

  return (
    <div
      className="photo-carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Product photos"
    >
      <div
        ref={trackRef}
        className="photo-carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {photos.map((photo, i) => (
          <div key={i} className="photo-carousel-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url || photo}
              alt={`${alt} ${i + 1}`}
              draggable={false}
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="photo-carousel-arrow prev"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(current - 1);
            }}
            aria-label="Previous photo"
            style={{ touchAction: 'manipulation' }}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button
            type="button"
            className="photo-carousel-arrow next"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(current + 1);
            }}
            aria-label="Next photo"
            style={{ touchAction: 'manipulation' }}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <div className="photo-carousel-dots" role="tablist" aria-label="Photo navigation">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`photo-carousel-dot${i === current ? ' active' : ''}`}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={i === current}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
