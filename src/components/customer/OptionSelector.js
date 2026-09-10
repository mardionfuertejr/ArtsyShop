'use client';

import { useState, useRef, useEffect } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const name = optionName || option?.option_name || '';
  const rawChoices = choices || option?.choices || [];
  const activeSelected = selected ?? selectedValue ?? '';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  if (!rawChoices || rawChoices.length === 0) {
    return null;
  }

  const isColorTheme =
    name.toLowerCase().includes('color') ||
    name.toLowerCase().includes('theme') ||
    name.toLowerCase().includes('shade');

  const hasSelection = Boolean(
    activeSelected &&
    activeSelected !== '— Select —' &&
    activeSelected !== '---' &&
    activeSelected.trim() !== ''
  );

  const selectedSwatch = isColorTheme && hasSelection ? getColorSwatch(activeSelected) : null;

  // Find extra cost of currently selected item
  let selectedExtraCost = 0;
  if (hasSelection) {
    const currentChoiceObj = rawChoices.find((c) => {
      const label = (typeof c === 'string' ? c : c.label || '')
        .replace(/\s*\(\+?₱?[\d,.]+\)/gi, '')
        .replace(/\s*\+?₱[\d,.]+/gi, '')
        .trim();
      return label === activeSelected;
    });
    if (currentChoiceObj) {
      if (typeof currentChoiceObj === 'object' && currentChoiceObj.extra_cost) {
        selectedExtraCost = currentChoiceObj.extra_cost;
      } else {
        const orig = typeof currentChoiceObj === 'string' ? currentChoiceObj : currentChoiceObj.label || '';
        const match = orig.match(/\+?\s*₱?\s*(\d+[\d,]*)/);
        if (match) selectedExtraCost = parseFloat(match[1].replace(/,/g, '')) || 0;
      }
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: '8px' }}>
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '700',
          color: 'var(--color-text)',
          marginBottom: '4px',
        }}
      >
        {name}
      </label>

      {/* Trigger Button - Sleek Single Line */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          minHeight: '38px',
          borderRadius: '10px',
          border: isOpen
            ? '1.5px solid var(--color-primary, #C2410C)'
            : '1.5px solid var(--color-border-light, #E2E8F0)',
          background: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text)',
          fontSize: '12.5px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.18s ease',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {selectedSwatch && (
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: selectedSwatch,
                border: '1px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
          )}
          <span
            style={{
              fontWeight: hasSelection ? '600' : '500',
              color: hasSelection ? 'var(--color-text)' : 'var(--color-text-muted, #94A3B8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {hasSelection ? activeSelected : '— Select —'}
          </span>
          {selectedExtraCost > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: 'var(--color-primary)',
                background: 'rgba(194, 65, 12, 0.08)',
                padding: '1px 5px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              +₱{selectedExtraCost}
            </span>
          )}
        </div>

        <i
          className="fa-solid fa-chevron-down"
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Floating Dropdown Options Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border-light, #E5E7EB)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {/* Default Unselected / Reset Item */}
          <button
            type="button"
            onClick={() => {
              onSelect('', 0);
              setIsOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: !hasSelection ? 'var(--color-primary-lighter, #FFF5F2)' : 'transparent',
              color: !hasSelection ? 'var(--color-primary)' : 'var(--color-text-muted, #94A3B8)',
              fontSize: '12px',
              fontWeight: !hasSelection ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span>— Select —</span>
            {!hasSelection && (
              <i className="fa-solid fa-check" style={{ fontSize: '10px', color: 'var(--color-primary)' }} />
            )}
          </button>

          {/* Configured Choices */}
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
                onClick={() => {
                  onSelect(cleanLabel, extraCost);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSelected
                    ? 'var(--color-primary-lighter, #FFF5F2)'
                    : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  fontSize: '12px',
                  fontWeight: isSelected ? '600' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {swatchColor && (
                    <span
                      style={{
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        backgroundColor: swatchColor,
                        border: '1px solid rgba(0,0,0,0.15)',
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cleanLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {extraCost > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        background: isSelected ? 'rgba(194, 65, 12, 0.15)' : 'var(--color-surface-warm, #F3F4F6)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      +₱{extraCost}
                    </span>
                  )}
                  {isSelected && (
                    <i
                      className="fa-solid fa-check"
                      style={{ fontSize: '10px', color: 'var(--color-primary)' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
