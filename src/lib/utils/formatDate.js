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
