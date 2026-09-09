/**
 * Format a number as Philippine Peso
 * @param {number} amount
 * @param {boolean} showCurrency - show ₱ symbol
 * @returns {string}
 */
export function formatCurrency(amount, showCurrency = true) {
  const num = parseFloat(amount) || 0;
  const formatted = num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showCurrency ? `₱${formatted}` : formatted;
}

/**
 * Format currency compact (e.g. ₱2,850 instead of ₱2,850.00 for whole numbers)
 */
export function formatCurrencyCompact(amount) {
  const num = parseFloat(amount) || 0;
  if (num % 1 === 0) return `₱${num.toLocaleString('en-PH')}`;
  return formatCurrency(num);
}

/**
 * Format a number as a short compact value (e.g. 1200 → "1.2k")
 */
export function formatCompact(amount) {
  const num = parseFloat(amount) || 0;
  if (num >= 1000000) return `₱${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₱${(num / 1000).toFixed(1)}K`;
  return `₱${num.toFixed(0)}`;
}
