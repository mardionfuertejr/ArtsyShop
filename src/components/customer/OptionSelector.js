'use client';

import { useState, useRef, useEffect } from 'react';

export default function OptionSelector({
  option,
  optionName,
  choices,
  selected,
  selectedValue,
  onSelect,
  required,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [highlightedChoice, setHighlightedChoice] = useState(null);
  const containerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const name = optionName || option?.option_name || '';
  let rawChoices = choices || option?.choices || [];
  if (typeof rawChoices === 'string') {
    try {
      rawChoices = JSON.parse(rawChoices);
    } catch (e) {
      rawChoices = rawChoices.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(rawChoices)) {
    rawChoices = [];
  }

  const activeSelected = selected ?? selectedValue ?? '';
  const isRequired = required !== undefined ? Boolean(required) : Boolean(option?.is_required);

  const handleClose = () => {
    setIsOpen(false);
    setIsClosing(false);
  };

  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen((prev) => !prev);
    setIsClosing(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleClose();
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

  const hasSelection = Boolean(
    activeSelected &&
    activeSelected !== '— Select —' &&
    activeSelected !== '---' &&
    activeSelected.trim() !== ''
  );

  // Find extra cost of currently selected item
  let selectedExtraCost = 0;
  if (hasSelection) {
    const currentChoiceObj = rawChoices.find((c) => {
      let item = c;
      if (typeof item === 'string' && item.startsWith('{') && item.endsWith('}')) {
        try { item = JSON.parse(item); } catch (e) {}
      }
      const rawText = typeof item === 'string' ? item : (item?.name || item?.label || item?.title || item?.value || '');
      const label = rawText
        .replace(/\s*\(\+?₱?[\d,.]+\)/gi, '')
        .replace(/\s*\+?₱[\d,.]+/gi, '')
        .trim();
      return label === activeSelected;
    });
    if (currentChoiceObj) {
      let item = currentChoiceObj;
      if (typeof item === 'string' && item.startsWith('{') && item.endsWith('}')) {
        try { item = JSON.parse(item); } catch (e) {}
      }
      if (typeof item === 'object' && item !== null) {
        const costVal = item.price ?? item.extra_cost ?? item.additional_cost ?? 0;
        selectedExtraCost = parseFloat(costVal) || 0;
      }
      if (!selectedExtraCost) {
        const orig = typeof item === 'string' ? item : (item?.name || item?.label || '');
        const match = String(orig).match(/\+?\s*₱?\s*(\d+[\d,]*)/);
        if (match) selectedExtraCost = parseFloat(match[1].replace(/,/g, '')) || 0;
      }
    }
  }

  const handleSelectOption = (cleanLabel, extraCost) => {
    onSelect(cleanLabel, extraCost);
    setIsOpen(false);
    setIsClosing(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: '8px' }}>
      {/* Dynamic Keyframes for smooth animations */}
      <style>{`
        @keyframes optionMenuEnter {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
            filter: blur(2px);
          }
          70% {
            transform: translateY(1px) scale(1.005);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes optionMenuExit {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-6px) scale(0.97);
          }
        }
        @keyframes checkmarkPop {
          0% {
            opacity: 0;
            transform: scale(0.4) rotate(-15deg);
          }
          70% {
            transform: scale(1.25) rotate(4deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .option-selector-trigger {
          transition: border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.2s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .option-selector-trigger:active {
          transform: scale(0.99);
        }
        .option-choice-item {
          transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), padding-left 0.16s ease;
        }
        .option-choice-item:hover {
          background-color: var(--color-surface-warm, #F8FAFC);
          padding-left: 13px !important;
        }
        .option-choice-item:active {
          transform: scale(0.985);
        }
        .option-choice-item.is-active {
          background-color: var(--color-primary-lighter, #FFF5F2) !important;
          color: var(--color-primary, #EA580C) !important;
          font-weight: 700 !important;
        }
        .option-menu-panel::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--color-text)',
            letterSpacing: '0.01em',
            margin: 0,
          }}
        >
          {name} {isRequired && <span style={{ color: '#E11D48', fontWeight: '800' }}>*</span>}
        </label>
      </div>

      {/* Trigger Button - Sleek Single Line with smooth focus state */}
      <button
        type="button"
        onClick={handleToggle}
        className="option-selector-trigger"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8.5px 12px',
          minHeight: '40px',
          borderRadius: '12px',
          border: isOpen
            ? '1.5px solid var(--color-primary, #EA580C)'
            : '1.5px solid var(--color-border-light, #E2E8F0)',
          boxShadow: isOpen
            ? '0 0 0 3.5px rgba(234, 88, 12, 0.12), 0 2px 8px rgba(0,0,0,0.04)'
            : '0 1px 2px rgba(0,0,0,0.02)',
          background: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text)',
          fontSize: '12.5px',
          cursor: 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontWeight: hasSelection ? '700' : '500',
              color: hasSelection ? 'var(--color-text)' : 'var(--color-text-muted, #94A3B8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s ease',
            }}
          >
            {hasSelection ? activeSelected : '— Select —'}
          </span>
          {selectedExtraCost > 0 && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                color: 'var(--color-primary, #EA580C)',
                background: 'rgba(234, 88, 12, 0.1)',
                padding: '2px 6px',
                borderRadius: '6px',
                flexShrink: 0,
                transition: 'all 0.2s ease',
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
            color: isOpen ? 'var(--color-primary, #EA580C)' : 'var(--color-text-muted)',
            transition: 'transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Floating Dropdown Options Panel with Smooth Animation */}
      {(isOpen || isClosing) && (
        <div
          className="option-menu-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 90,
            background: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border-light, #E2E8F0)',
            borderRadius: '14px',
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.16), 0 4px 12px -2px rgba(0,0,0,0.06)',
            padding: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            overflow: 'visible',
            transformOrigin: 'top center',
            animation: isClosing
              ? 'optionMenuExit 0.18s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : 'optionMenuEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Default Unselected / Reset Item */}
          <button
            type="button"
            onClick={() => handleSelectOption('', 0)}
            className={`option-choice-item ${!hasSelection ? 'is-active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              background: !hasSelection ? 'var(--color-primary-lighter, #FFF5F2)' : 'transparent',
              color: !hasSelection ? 'var(--color-primary, #EA580C)' : 'var(--color-text-muted, #94A3B8)',
              fontSize: '12px',
              fontWeight: !hasSelection ? '700' : '500',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              outline: 'none',
            }}
          >
            <span>— Select —</span>
            {!hasSelection && (
              <i
                className="fa-solid fa-check"
                style={{
                  fontSize: '11px',
                  color: 'var(--color-primary, #EA580C)',
                  animation: 'checkmarkPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                }}
              />
            )}
          </button>

          {/* Configured Choices */}
          {rawChoices.map((choiceItem, idx) => {
            let choice = choiceItem;
            if (typeof choice === 'string' && choice.startsWith('{') && choice.endsWith('}')) {
              try { choice = JSON.parse(choice); } catch (e) {}
            }
            const originalLabel = typeof choice === 'string'
              ? choice
              : (choice?.name || choice?.label || choice?.title || choice?.value || '');
            let extraCost = 0;
            if (typeof choice === 'object' && choice !== null) {
              const costVal = choice.price ?? choice.extra_cost ?? choice.additional_cost ?? 0;
              extraCost = parseFloat(costVal) || 0;
            }

            if (!extraCost && typeof originalLabel === 'string') {
              const match = String(originalLabel).match(/\+?\s*₱?\s*(\d+[\d,]*)/);
              if (match) extraCost = parseFloat(match[1].replace(/,/g, '')) || 0;
            }

            const cleanLabel = String(originalLabel)
              .replace(/\s*\(\+?₱?[\d,.]+\)/gi, '')
              .replace(/\s*\+?₱[\d,.]+/gi, '')
              .trim() || String(originalLabel || `Option ${idx + 1}`);

            const isSelected = activeSelected === cleanLabel || highlightedChoice === cleanLabel;

            return (
              <button
                key={`${cleanLabel}-${idx}`}
                type="button"
                onClick={() => handleSelectOption(cleanLabel, extraCost)}
                className={`option-choice-item ${isSelected ? 'is-active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8.5px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: isSelected
                    ? 'var(--color-primary-lighter, #FFF5F2)'
                    : 'transparent',
                  color: isSelected ? 'var(--color-primary, #EA580C)' : 'var(--color-text, #0F172A)',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit' }}>
                    {cleanLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {extraCost > 0 && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: isSelected ? 'var(--color-primary, #EA580C)' : 'var(--color-text-secondary, #64748B)',
                        background: isSelected ? 'rgba(234, 88, 12, 0.15)' : 'var(--color-surface-warm, #F3F4F6)',
                        padding: '1.5px 5.5px',
                        borderRadius: '5px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      +₱{extraCost}
                    </span>
                  )}
                  {isSelected && (
                    <i
                      className="fa-solid fa-check"
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-primary, #EA580C)',
                        animation: 'checkmarkPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                      }}
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
