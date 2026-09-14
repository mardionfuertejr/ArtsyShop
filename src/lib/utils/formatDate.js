/**
 * Format a date string or Date object to a readable format
 */

/**
 * Format date as "Aug 25, 2026"
 */
export function formatDate(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format date as "Aug 25"
 */
export function formatDateShort(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format date + time as "Aug 25, 2026 · 2:30 PM"
 */
export function formatDateTime(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return `${formatDate(d)} · ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return '—';
  }
}

/**
 * Relative time (e.g. "2 hours ago", "just now")
 */
export function formatRelative(date) {
  if (!date) return '—';
  try {
    const target = new Date(date);
    if (isNaN(target.getTime())) return '—';
    const now = new Date();
    const diff = now - target;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(target);
  } catch {
    return '—';
  }
}

/**
 * Format date as input value "YYYY-MM-DD"
 */
export function toInputDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format HH:MM 24-hr time string (e.g. "14:30") to "2:30 PM"
 */
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  try {
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1].slice(0, 2).padStart(2, '0');
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Helper: Parse YYYY-MM-DD string to local Date
 */
export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Detect if date is within 24-48 hours (Rush order)
 */
export function isRushDate(dateStr) {
  if (!dateStr) return false;
  const d = parseDateString(dateStr) || new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  return diffDays === 0 || diffDays === 1;
}

