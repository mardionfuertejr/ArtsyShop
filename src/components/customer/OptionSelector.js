'use client';

function getColorSwatch(label = '') {
  const l = label.toLowerCase();
  if (l.includes('pink') || l.includes('blush') || l.includes('rose')) return '#F472B6';
  if (l.includes('red') || l.includes('crimson') || l.includes('ruby')) return '#E11D48';
  if (l.includes('purple') || l.includes('lilac') || l.includes('lavender') || l.includes('violet')) return '#A855F7';
  if (l.includes('blue') || l.includes('sky') || l.includes('cyan') || l.includes('navy')) return '#38BDF8';
  if (l.includes('yellow') || l.includes('sunflower') || l.includes('sunshine') || l.includes('gold')) return '#FACC15';
  if (l.includes('green') || l.includes('sage') || l.includes('mint') || l.includes('emerald')) return '#34D399';
  if (l.includes('white') || l.includes('cream') || l.includes('ivory')) return '#F1F5F9';
  if (l.includes('brown') || l.includes('coffee') || l.includes('kraft') || l.includes('tan')) return '#A16207';
  if (l.includes('orange') || l.includes('peach') || l.includes('coral')) return '#FB923C';
  if (l.includes('black') || l.includes('dark')) return '#334155';
  return null;
}

export default function OptionSelector({
  option,
  optionName,
  choices,
  selected,
  selectedValue,
  onSelect,
  required = false,
}) {
  const name = optionName || option?.option_name || '';
  const rawChoices = choices || option?.choices || [];
  const activeSelected = selected ?? selectedValue ?? '';
  const isRequired = required || option?.is_required || false;

  if (!rawChoices || rawChoices.length === 0) {
    return null;
  }

  // Determine if this is a Color / short chip option or a full-width add-on row
  const isColorOrShort =
    name.toLowerCase().includes('color') ||
    name.toLowerCase().includes('theme') ||
    name.toLowerCase().includes('shade') ||
    rawChoices.every((c) => {
      const label = typeof c === 'string' ? c : c.label || '';
      return label.length < 28 && (!c.extra_cost || c.extra_cost === 0);
    });

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-text)' }}>
            {name}
          </span>
          {isRequired ? (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                color: 'var(--color-primary)',
                background: 'rgba(194, 65, 12, 0.08)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              Required
            </span>
          ) : (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: '500',
                color: 'var(--color-text-muted)',
              }}
            >
              Optional
            </span>
          )}
        </div>

        {activeSelected && (
          <span
            style={{
              fontSize: '11.5px',
              color: 'var(--color-primary)',
              fontWeight: '600',
              maxWidth: '160px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeSelected}
          </span>
        )}
      </div>

      {/* Grid Style for Color Themes / Short Options */}
      {isColorOrShort ? (
        <div
          role="radiogroup"
          aria-label={name}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
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
            const swatchColor = getColorSwatch(cleanLabel);

            return (
              <button
                key={cleanLabel}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(cleanLabel, extraCost)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '1.5px solid var(--color-primary)'
                    : '1.5px solid var(--color-border-light, #E5E7EB)',
                  background: isSelected
                    ? 'var(--color-primary-lighter, #FFF5F2)'
                    : 'var(--color-surface, #FFFFFF)',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? '600' : '500',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 4px rgba(194, 65, 12, 0.12)' : 'none',
                  minHeight: '44px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {swatchColor && (
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: swatchColor,
                        border: '1.5px solid rgba(0,0,0,0.12)',
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cleanLabel}
                  </span>
                </div>

                {isSelected ? (
                  <i
                    className="fa-solid fa-circle-check"
                    style={{ color: 'var(--color-primary)', fontSize: '13px', flexShrink: 0 }}
                  />
                ) : extraCost > 0 ? (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '600',
                      color: 'var(--color-primary)',
                      background: 'rgba(194, 65, 12, 0.08)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    +₱{extraCost}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        /* Full-Width Structured Card List for Add-ons & Packaging */
        <div
          role="radiogroup"
          aria-label={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
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

            return (
              <button
                key={cleanLabel}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(cleanLabel, extraCost)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '1.5px solid var(--color-primary)'
                    : '1.5px solid var(--color-border-light, #E5E7EB)',
                  background: isSelected
                    ? 'var(--color-primary-lighter, #FFF5F2)'
                    : 'var(--color-surface, #FFFFFF)',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: isSelected ? '600' : '500',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 4px rgba(194, 65, 12, 0.12)' : 'none',
                  minHeight: '46px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1, minWidth: 0 }}>
                  <i
                    className={
                      isSelected
                        ? 'fa-solid fa-circle-dot'
                        : 'fa-regular fa-circle'
                    }
                    style={{
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontSize: '14px',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ lineHeight: '1.3' }}>{cleanLabel}</span>
                </div>

                {extraCost > 0 ? (
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      background: isSelected ? 'rgba(194, 65, 12, 0.12)' : 'var(--color-surface-warm, #F9FAFB)',
                      border: '1px solid var(--color-border-light, #E5E7EB)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      flexShrink: 0,
                    }}
                  >
                    +₱{extraCost}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    Standard
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
