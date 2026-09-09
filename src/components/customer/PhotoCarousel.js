'use client';

import { useState, useRef, useCallback } from 'react';

export default function PhotoCarousel({ photos = [], alt = 'Product photo' }) {
  const [current, setCurrent] = useState(0);
  const startX = useRef(null);
  const trackRef = useRef(null);

  const goTo = useCallback((idx) => {
    setCurrent(Math.max(0, Math.min(idx, photos.length - 1)));
  }, [photos.length]);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) {
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
              e.stopPropagation();
              goTo(current - 1);
            }}
            disabled={current === 0}
            aria-label="Previous photo"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button
            type="button"
            className="photo-carousel-arrow next"
            onClick={(e) => {
              e.stopPropagation();
              goTo(current + 1);
            }}
            disabled={current === photos.length - 1}
            aria-label="Next photo"
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
