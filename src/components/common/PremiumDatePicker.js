'use client';

import { useState, useEffect, useRef } from 'react';

// Helper: Format Date object to YYYY-MM-DD in local time
function toDateInputValue(date) {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Parse YYYY-MM-DD string to local Date
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: Formatted string (e.g., "Sat, Sep 12, 2026")
function formatDisplayDate(dateStr) {
  const d = parseDateString(dateStr);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper: Relative day badge ("Tomorrow", "In 3 days", etc.)
export function getRelativeDayLabel(dateStr) {
  const d = parseDateString(dateStr);
  if (!d) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 2) return 'In 2 days';
  if (diffDays === 3) return 'In 3 days';
  if (diffDays > 3 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays > 7 && diffDays <= 14) return 'Next week';
  return null;
}

// Helper: Detect if date is within 24-48 hours (Today or Tomorrow)
export function isRushDate(dateStr) {
  const d = parseDateString(dateStr);
  if (!d) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  return diffDays === 0 || diffDays === 1;
}

export default function PremiumDatePicker({
  id = 'premium-date-picker',
  name = 'preferredDate',
  value = '',
  onChange,
  minDate,
  required = false,
  label = 'Date Needed',
  placeholder = 'Select date needed...',
  className = '',
  error = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Effective min date
  const effectiveMinStr = minDate || toDateInputValue(new Date());
  const effectiveMinDate = parseDateString(effectiveMinStr) || new Date();
  effectiveMinDate.setHours(0, 0, 0, 0);

  const selectedDateObj = parseDateString(value);
  const [viewYear, setViewYear] = useState(() => (selectedDateObj ? selectedDateObj.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDateObj ? selectedDateObj.getMonth() : new Date().getMonth()));

  // Sync calendar view month when value changes
  useEffect(() => {
    if (selectedDateObj) {
      setViewYear(selectedDateObj.getFullYear());
      setViewMonth(selectedDateObj.getMonth());
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSelectDate = (date) => {
    const formatted = toDateInputValue(date);
    if (onChange) {
      onChange(formatted);
    }
    setIsOpen(false);
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar month days construction
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const relativeLabel = value ? getRelativeDayLabel(value) : null;
  const displayValue = value ? formatDisplayDate(value) : '';

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
          <svg className="trigger-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>

          {value ? (
            <div className="trigger-val-wrap">
              <span className="trigger-val-text">{displayValue}</span>
              {relativeLabel && <span className="trigger-val-badge">{relativeLabel}</span>}
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

        {/* Form submission / required check */}
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
            left: '50%'
          }}
        />
      </div>

      {error && (
        <p style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '10px' }}></i>
          <span>{error}</span>
        </p>
      )}

      {/* Floating Compact Calendar Popover with Smooth In/Out Transition */}
      <div
        className={`premium-datepicker-popover ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="Choose date"
        aria-hidden={!isOpen}
      >
        {/* Calendar Header Navigation */}
        <div className="calendar-header" style={{ marginTop: '2px' }}>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div className="calendar-title">
              <strong>{monthNames[viewMonth]}</strong> {viewYear}
            </div>

            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <span key={day} className="weekday-col">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-grid">
            {/* Previous month filler */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <div key={`prev-${i}`} className="calendar-day-cell disabled filler">
                  <span>{prevDayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(viewYear, viewMonth, dayNum);
              cellDate.setHours(0, 0, 0, 0);

              const isPast = cellDate < effectiveMinDate;
              const cellStr = toDateInputValue(cellDate);
              const isSelected = value === cellStr;
              const isToday = cellDate.getTime() === today.getTime();

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDate(cellDate)}
                  className={`calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'disabled' : ''}`}
                >
                  <span className="day-number">{dayNum}</span>
                  {isToday && !isSelected && <span className="today-dot" />}
                </button>
              );
            })}
          </div>

          {/* Footer with Today and Close */}
          <div className="calendar-footer">
            <button
              type="button"
              className="calendar-today-btn"
              onClick={() => handleSelectDate(new Date())}
            >
              Select Today
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
