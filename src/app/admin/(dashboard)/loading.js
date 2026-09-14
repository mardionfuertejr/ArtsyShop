export default function AdminLoading() {
  return (
    <div style={{ padding: '4px 0', animation: 'fadeIn 0.15s ease-out' }}>
      {/* Top skeleton header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '180px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.2s infinite ease-in-out',
            }}
          />
          <div
            style={{
              width: '70px',
              height: '24px',
              borderRadius: '999px',
              background: '#F1F5F9',
            }}
          />
        </div>
        <div
          style={{
            width: '140px',
            height: '36px',
            borderRadius: '10px',
            background: '#F1F5F9',
          }}
        />
      </div>

      {/* Main card skeleton */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(90deg, #F8FAFC 25%, #EDF2F7 50%, #F8FAFC 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.2s infinite ease-in-out',
          }}
        />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#F1F5F9',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, maxWidth: '280px' }}>
                <div
                  style={{
                    width: '70%',
                    height: '14px',
                    borderRadius: '4px',
                    background: '#F1F5F9',
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    height: '11px',
                    borderRadius: '4px',
                    background: '#F8FAFC',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                width: '80px',
                height: '16px',
                borderRadius: '4px',
                background: '#F1F5F9',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
