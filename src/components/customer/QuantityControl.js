'use client';

import { useState, useEffect } from 'react';

export default function QuantityControl({ value = 1, onChange, onDelete, min = 1, max = 99 }) {
  const [animatingKey, setAnimatingKey] = useState(0);

  const decrement = () => {
    if (value > min) {
      setAnimatingKey((k) => k + 1);
      onChange(value - 1);
    } else if (value === min && onDelete) {
      onDelete();
    }
  };

  const increment = () => {
    if (value < max) {
      setAnimatingKey((k) => k + 1);
      onChange(value + 1);
    }
  };

  const isMinWithDelete = value === min && Boolean(onDelete);

  return (
    <div
      className="qty-stepper"
      role="group"
      aria-label="Quantity"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface, #FFFFFF)',
        border: '1.5px solid var(--color-border, #E2E8F0)',
        borderRadius: '999px',
        overflow: 'hidden',
        height: '36px',
        width: '108px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <style>{`
        @keyframes qtyNumberPop {
          0% { transform: scale(0.8); opacity: 0.6; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .qty-interactive-btn {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, color 0.15s ease;
        }
        .qty-interactive-btn:active:not(:disabled) {
          transform: scale(0.82);
        }
        .qty-interactive-btn:hover:not(:disabled) {
          background-color: var(--color-surface-warm, #F8FAFC);
        }
        .qty-interactive-btn.qty-delete-hover:hover {
          background-color: #FEF2F2 !important;
        }
      `}</style>

      <button
        className={`qty-btn qty-interactive-btn ${isMinWithDelete ? 'qty-btn-delete qty-delete-hover' : ''}`}
        onClick={decrement}
        disabled={value <= min && !onDelete}
        aria-label={isMinWithDelete ? 'Remove item' : 'Decrease quantity'}
        type="button"
        title={isMinWithDelete ? 'Remove from cart' : 'Decrease'}
        style={{
          width: '34px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text)',
          cursor: value <= min && !onDelete ? 'not-allowed' : 'pointer',
          border: 'none',
          background: 'transparent',
          padding: 0,
          userSelect: 'none',
          outline: 'none',
        }}
      >
        {isMinWithDelete ? (
          <i
            className="fa-regular fa-trash-can"
            style={{ fontSize: '11.5px', color: '#DC2626', transition: 'transform 0.2s ease' }}
          />
        ) : (
          <i
            className="fa-solid fa-minus"
            style={{ fontSize: '10.5px', color: value <= min ? 'var(--color-text-muted)' : 'inherit' }}
          />
        )}
      </button>

      <span
        key={animatingKey}
        className="qty-value"
        aria-live="polite"
        aria-label={`Quantity: ${value}`}
        style={{
          width: '38px',
          textAlign: 'center',
          fontSize: '13.5px',
          fontWeight: '700',
          color: 'var(--color-text)',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: animatingKey > 0 ? 'qtyNumberPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      >
        {value}
      </span>

      <button
        className="qty-btn qty-interactive-btn"
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase quantity"
        type="button"
        title="Increase"
        style={{
          width: '34px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: value >= max ? 'var(--color-text-muted)' : 'var(--color-text)',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          border: 'none',
          background: 'transparent',
          padding: 0,
          userSelect: 'none',
          outline: 'none',
        }}
      >
        <i className="fa-solid fa-plus" style={{ fontSize: '10.5px' }} />
      </button>
    </div>
  );
}
