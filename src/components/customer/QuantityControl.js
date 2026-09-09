'use client';

export default function QuantityControl({ value = 1, onChange, min = 1, max = 99 }) {
  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  return (
    <div className="qty-stepper" role="group" aria-label="Quantity">
      <button
        className="qty-btn"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        type="button"
      >
        <i className="fa-solid fa-minus" style={{ fontSize: '11px' }}></i>
      </button>
      <span className="qty-value" aria-live="polite" aria-label={`Quantity: ${value}`}>
        {value}
      </span>
      <button
        className="qty-btn"
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase quantity"
        type="button"
      >
        <i className="fa-solid fa-plus" style={{ fontSize: '11px' }}></i>
      </button>
    </div>
  );
}
