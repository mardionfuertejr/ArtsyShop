'use client';

import { useState, useEffect, useRef } from 'react';

// Format 24-hr "HH:MM" or "H:MM" to "h:mm AM/PM"
export function formatDisplayTime(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2).padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

// Helper to get time of day period label ("Morning", "Afternoon", "Evening")
export function getTimePeriodLabel(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':');
  if (parts.length < 1) return null;
  const h = parseInt(parts[0], 10);
  if (isNaN(h)) return null;
  if (h >= 6 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

const COMMON_TIME_SLOTS = [
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '11:00 AM', value: '11:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '2:00 PM', value: '14:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '5:00 PM', value: '17:00' },
  { label: '6:00 PM', value: '18:00' },
];

export default function PremiumTimePicker({
  id = 'premium-time-picker',
  name = 'preferredTime',
  value = '',
  onChange,
  required = false,
  label = 'Time Needed',
  placeholder = 'Select time...',
  className = '',
  error = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const containerRef = useRef(null);

  // Parse current value for custom spinner
  const initialHour = value ? parseInt(value.split(':')[0], 10) : 14;
  const initialMinute = value ? parseInt(value.split(':')[1], 10) : 0;
  const [selectedHour12, setSelectedHour12] = useState(initialHour % 12 || 12);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [selectedAmpm, setSelectedAmpm] = useState(initialHour >= 12 ? 'PM' : 'AM');

  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          setSelectedHour12(h % 12 || 12);
          setSelectedMinute(m);
          setSelectedAmpm(h >= 12 ? 'PM' : 'AM');
        }
      }
    }
  }, [value]);

  // Click outside and escape key handling
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectSlot = (slotValue) => {
    if (onChange) {
      onChange(slotValue);
    }
    setIsOpen(false);
  };

  const handleApplyCustomTime = () => {
    let hour24 = selectedHour12 % 12;
    if (selectedAmpm === 'PM') hour24 += 12;
    const formatted = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    if (onChange) {
      onChange(formatted);
    }
    setIsOpen(false);
  };

  const displayValue = value ? formatDisplayTime(value) : '';
  const periodLabel = value ? getTimePeriodLabel(value) : null;

  return (
    <div className={`premium-datepicker-root ${className}`} ref={containerRef}>
      {label && (
        <label className="input-label" htmlFor={id} onClick={() => setIsOpen(true)} style={{ display: 'block', marginBottom: '6px' }}>
          {label} {required && <span className="required">*</span>}
        </label>
      )}

      {/* Sleek Compact Input Trigger */}
      <div
        id={id}
        tabIndex={0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`premium-datepicker-compact-trigger ${isOpen ? 'focused' : ''} ${value ? 'has-value' : ''}`}
        style={{
          borderColor: error ? '#EF4444' : undefined,
          boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : undefined,
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="trigger-left">
          <svg
            className="trigger-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>

          {value ? (
            <div className="trigger-val-wrap">
              <span className="trigger-val-text">{displayValue}</span>
              {periodLabel && <span className="trigger-val-badge">{periodLabel}</span>}
            </div>
          ) : (
            <span className="trigger-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="trigger-right">
          <svg
            className="trigger-chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        {/* Hidden Input for Form Submission / HTML5 Validation */}
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            height: 0,
            width: 0,
            bottom: 0,
            left: '50%',
          }}
        />
      </div>

      {error && (
        <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '10px' }}></i>
          <span>{error}</span>
        </p>
      )}

      {/* Floating Compact Time Popover */}
      <div
        className={`premium-datepicker-popover ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Choose time"
        aria-hidden={!isOpen}
        style={{ maxWidth: '290px' }}
      >
        {/* Toggle Mode Tab (Slots vs Custom Time) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', marginTop: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text)' }}>
            {customMode ? 'Custom Exact Time' : 'Popular Time Slots'}
          </span>
          <button
            type="button"
            onClick={() => setCustomMode((p) => !p)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            {customMode ? 'View Slots' : 'Custom Time'}
          </button>
        </div>

        {!customMode ? (
          /* Grid of Available Crafting Hours */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '5px',
              maxHeight: '190px',
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {COMMON_TIME_SLOTS.map((slot) => {
              const isSelected = value === slot.value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => handleSelectSlot(slot.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid #ECE8E1',
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text)',
                    fontSize: '12px',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-primary-lighter)';
                      e.currentTarget.style.borderColor = 'rgba(194, 94, 56, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = '#ECE8E1';
                    }
                  }}
                >
                  <span>{slot.label}</span>
                  {isSelected && <span style={{ fontSize: '10px' }}>✓</span>}
                </button>
              );
            })}
          </div>
        ) : (
          /* Custom Hour:Minute:AM/PM Controls */
          <div style={{ padding: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {/* Hour Selector */}
              <select
                className="input"
                value={selectedHour12}
                onChange={(e) => setSelectedHour12(parseInt(e.target.value, 10))}
                style={{
                  width: '64px',
                  height: '38px',
                  fontSize: '14px',
                  fontWeight: '700',
                  textAlign: 'center',
                  padding: '0 4px',
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)' }}>:</span>

              {/* Minute Selector */}
              <select
                className="input"
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value, 10))}
                style={{
                  width: '64px',
                  height: '38px',
                  fontSize: '14px',
                  fontWeight: '700',
                  textAlign: 'center',
                  padding: '0 4px',
                }}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>

              {/* AM / PM Toggle */}
              <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAmpm('AM')}
                  style={{
                    padding: '8px 9px',
                    border: 'none',
                    background: selectedAmpm === 'AM' ? 'var(--color-primary)' : '#FFF',
                    color: selectedAmpm === 'AM' ? '#FFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAmpm('PM')}
                  style={{
                    padding: '8px 9px',
                    border: 'none',
                    background: selectedAmpm === 'PM' ? 'var(--color-primary)' : '#FFF',
                    color: selectedAmpm === 'PM' ? '#FFF' : '#64748B',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  PM
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCustomTime}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', height: '34px', fontSize: '12px', fontWeight: '700' }}
            >
              Set Time
            </button>
          </div>
        )}

        {/* Footer with Reset & Close */}
        <div className="calendar-footer" style={{ marginTop: '8px', paddingTop: '8px' }}>
          <button
            type="button"
            className="calendar-today-btn"
            onClick={() => handleSelectSlot('10:00')}
          >
            Default (10:00 AM)
          </button>
          <button
            type="button"
            className="calendar-close-btn"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
