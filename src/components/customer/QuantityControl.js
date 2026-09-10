'use client';

export default function QuantityControl({ value = 1, onChange, onDelete, min = 1, max = 99 }) {
  const decrement = () => {
    if (value > min) {
      onChange(value - 1);
    } else if (value === min && onDelete) {
      onDelete();
    }
  };
  const increment = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const isMinWithDelete = value === min && Boolean(onDelete);

  return (
    <div className="qty-stepper" role="group" aria-label="Quantity">
      <button
        className={`qty-btn ${isMinWithDelete ? 'qty-btn-delete' : ''}`}
        onClick={decrement}
        disabled={value <= min && !onDelete}
        aria-label={isMinWithDelete ? 'Remove item' : 'Decrease quantity'}
        type="button"
        title={isMinWithDelete ? 'Remove from cart' : 'Decrease'}
      >
        {isMinWithDelete ? (
          <i className="fa-regular fa-trash-can" style={{ fontSize: '11px', color: '#DC2626' }}></i>
        ) : (
          <i className="fa-solid fa-minus" style={{ fontSize: '11px' }}></i>
        )}
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
        title="Increase"
      >
        <i className="fa-solid fa-plus" style={{ fontSize: '11px' }}></i>
      </button>
    </div>
  );
}
