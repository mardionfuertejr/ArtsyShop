'use client';

export default function OptionSelector({ option, optionName, choices, selected, selectedValue, onSelect, required = false }) {
  const name = optionName || option?.option_name || '';
  const rawChoices = choices || option?.choices || [];
  const activeSelected = selected ?? selectedValue ?? '';
  const isRequired = required || option?.is_required || false;

  if (!rawChoices || rawChoices.length === 0) {
    return null;
  }

  return (
    <div className="input-group" style={{ margin: 0 }}>
      <label className="input-label" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>{name}</span>
        {isRequired && <span style={{ color: 'var(--color-primary)', fontWeight: '700' }} aria-hidden="true">*</span>}
      </label>
      <div className="option-chips" role="radiogroup" aria-label={name}>
        {rawChoices.map((choice) => {
          const originalLabel = typeof choice === 'string' ? choice : (choice.label || '');
          let extraCost = typeof choice === 'object' ? (choice.extra_cost || 0) : 0;

          // Parse embedded price if extraCost wasn't explicitly provided in object
          if (!extraCost && typeof originalLabel === 'string') {
            const match = originalLabel.match(/\+?\s*₱?\s*(\d+[\d,]*)/);
            if (match) {
              extraCost = parseFloat(match[1].replace(/,/g, '')) || 0;
            }
          }

          // Strip redundant embedded price strings like (+₱200) or +₱200 from label
          const cleanLabel = originalLabel
            .replace(/\s*\(\+?₱?[\d,.]+\)/gi, '')
            .replace(/\s*\+?₱[\d,.]+/gi, '')
            .trim();

          const isSelected = selected === cleanLabel;

          return (
            <button
              key={cleanLabel}
              className={`option-chip ripple${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(cleanLabel, extraCost)}
              role="radio"
              aria-checked={isSelected}
              type="button"
            >
              <span>{cleanLabel}</span>
              {extraCost > 0 && (
                <span className="option-chip-cost">
                  +₱{extraCost}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
