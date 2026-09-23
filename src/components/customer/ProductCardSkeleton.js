'use client';

export default function ProductCardSkeleton() {
  return (
    <div
      className="product-card"
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        border: '1px solid var(--color-border-light, #E2E8F0)',
        background: 'var(--color-surface, #FFFFFF)',
        borderRadius: 'var(--radius-lg, 14px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image Skeleton with Shimmer */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.2s infinite ease-in-out',
        }}
      />

      {/* Body Skeleton */}
      <div className="product-card-body" style={{ padding: '10px 12px 12px' }}>
        {/* Title placeholder */}
        <div
          style={{
            width: '85%',
            height: '14px',
            borderRadius: '4px',
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s infinite ease-in-out',
            marginBottom: '8px',
          }}
        />

        {/* Price & Action Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <div
            style={{
              width: '50px',
              height: '14px',
              borderRadius: '4px',
              background: '#F1F5F9',
            }}
          />
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#F1F5F9',
            }}
          />
        </div>
      </div>
    </div>
  );
}
