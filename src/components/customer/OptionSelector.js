'use client';

function getColorSwatch(label = '') {
  const l = label.toLowerCase();
  if (l.includes('pink') || l.includes('blush') || l.includes('rose')) return '#F472B6';
  if (l.includes('red') || l.includes('crimson') || l.includes('velvet') || l.includes('ruby')) return '#E11D48';
  if (l.includes('purple') || l.includes('lilac') || l.includes('lavender') || l.includes('violet')) return '#A855F7';
  if (l.includes('blue') || l.includes('sky') || l.includes('cyan') || l.includes('navy')) return '#38BDF8';
  if (l.includes('yellow') || l.includes('sunflower') || l.includes('sunshine') || l.includes('gold')) return '#FACC15';
  if (l.includes('green') || l.includes('sage') || l.includes('mint') || l.includes('emerald')) return '#34D399';
  if (l.includes('white') || l.includes('cream') || l.includes('ivory')) return '#F1F5F9';
  if (l.includes('brown') || l.includes('coffee') || l.includes('kraft') || l.includes('tan')) return '#A16207';
  if (l.includes('orange') || l.includes('peach') || l.includes('coral')) return '#FB923C';
  return null;
}

export default function OptionSelector({
  option,
  optionName,
  choices,
  selected,
  selectedValue,
  onSelect,
}) {
  const name = optionName || option?.option_name || '';
  const rawChoices = choices || option?.choices || [];
  const activeSelected = selected ?? selectedValue ?? '';

  if (!rawChoices || rawChoices.length === 0) {
    return null;
  }

  const isColorTheme =
    name.toLowerCase().includes('color') ||
    name.toLowerCase().includes('theme') ||
    name.toLowerCase().includes('shade');

  return (
    <div style={{ marginBottom: '8px' }}>
      {/* Clean Minimal Header */}
      <div style={{ marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text)' }}>
          {name}
        </span>
      </div>

      {/* Space-Saving Balanced Option Chips */}
      <div
        role="radiogroup"
        aria-label={name}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px',
        }}
      >
        {rawChoices.map((choice) => {
          const originalLabel = typeof choice === 'string' ? choice : choice.label || '';
          let extraCost = typeof choice === 'object' ? choice.extra_cost || 0 : 0;

          if (!extraCost && typeof originalLabel === 'string') {
            const match = originalLabel.match(/\+?\s*₱?\s*(\d+[\d,]*)/);
            if (match) extraCost = parseFloat(match[1].replace(/,/g, '')) || 0;
          }

          const cleanLabel = originalLabel
            .replace(/\s*\(\+?₱?[\d,.]+\)/gi, '')
            .replace(/\s*\+?₱[\d,.]+/gi, '')
            .trim();

          const isSelected = activeSelected === cleanLabel;
          const swatchColor = isColorTheme ? getColorSwatch(cleanLabel) : null;

          return (
            <button
              key={cleanLabel}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(cleanLabel, extraCost)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: isColorTheme ? '999px' : '6px',
                border: isSelected
                  ? '1.5px solid var(--color-primary)'
                  : '1px solid var(--color-border-light, #E5E7EB)',
                background: isSelected
                  ? 'var(--color-primary-lighter, #FFF5F2)'
                  : 'var(--color-surface, #FFFFFF)',
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: isSelected ? '600' : '500',
                lineHeight: '1.2',
                transition: 'all 0.12s ease',
                minHeight: '29px',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {swatchColor && (
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: swatchColor,
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
              )}

              <span>{cleanLabel}</span>

              {extraCost > 0 ? (
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '700',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    background: isSelected ? 'rgba(194, 65, 12, 0.12)' : 'var(--color-surface-warm, #F3F4F6)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                  }}
                >
                  +₱{extraCost}
                </span>
              ) : isSelected ? (
                <i
                  className="fa-solid fa-check"
                  style={{ fontSize: '9px', color: 'var(--color-primary)' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
