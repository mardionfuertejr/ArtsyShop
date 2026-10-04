/**
 * Device Order Rate Limiting Engine
 * Enforces a strict maximum of 5 orders per day per device to prevent spam / troll submissions.
 */

export const MAX_ORDERS_PER_DEVICE_DAY = 5;
const STORAGE_KEY = 'likha_device_order_tracker';
const COOKIE_KEY = 'likha_dot';

/**
 * Get current date string in Philippine / local format (YYYY-MM-DD)
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get a cookie value
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Helper to set a cookie with 2-day expiration
 */
function setCookie(name, value) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Get the current device's daily order statistics
 */
export function getDeviceDailyOrderInfo() {
  if (typeof window === 'undefined') {
    return {
      date: getTodayDateString(),
      count: 0,
      max: MAX_ORDERS_PER_DEVICE_DAY,
      remaining: MAX_ORDERS_PER_DEVICE_DAY,
      isLimitReached: false,
    };
  }

  const today = getTodayDateString();
  let tracker = null;

  // 1. Try reading from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      tracker = JSON.parse(raw);
    }
  } catch {}

  // 2. Fallback to cookie if localStorage was cleared
  if (!tracker) {
    try {
      const rawCookie = getCookie(COOKIE_KEY);
      if (rawCookie) {
        tracker = JSON.parse(rawCookie);
      }
    } catch {}
  }

  // If no tracker or tracker is from a previous day, initialize for today
  if (!tracker || tracker.date !== today) {
    tracker = {
      date: today,
      count: 0,
      references: [],
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker));
      setCookie(COOKIE_KEY, JSON.stringify(tracker));
    } catch {}
  }

  const count = Number(tracker.count) || 0;
  const remaining = Math.max(0, MAX_ORDERS_PER_DEVICE_DAY - count);
  const isLimitReached = count >= MAX_ORDERS_PER_DEVICE_DAY;

  return {
    date: today,
    count,
    max: MAX_ORDERS_PER_DEVICE_DAY,
    remaining,
    isLimitReached,
    references: tracker.references || [],
  };
}

/**
 * Checks whether the current device is allowed to place a new order
 */
export function checkDeviceOrderAllowed() {
  const info = getDeviceDailyOrderInfo();

  if (info.isLimitReached) {
    return {
      allowed: false,
      count: info.count,
      remaining: 0,
      max: MAX_ORDERS_PER_DEVICE_DAY,
      message: `Daily order limit reached (${MAX_ORDERS_PER_DEVICE_DAY}/day). Message us on Messenger for more orders.`,
    };
  }

  return {
    allowed: true,
    count: info.count,
    remaining: info.remaining,
    max: MAX_ORDERS_PER_DEVICE_DAY,
  };
}

/**
 * Record an order placed on this device
 */
export function recordDeviceOrderPlaced(referenceCode) {
  if (typeof window === 'undefined') return;

  const today = getTodayDateString();
  const currentInfo = getDeviceDailyOrderInfo();
  
  const updatedTracker = {
    date: today,
    count: (currentInfo.date === today ? currentInfo.count : 0) + 1,
    references: [...(currentInfo.references || []).filter(r => r !== referenceCode), referenceCode].slice(-10),
    lastOrderAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracker));
    setCookie(COOKIE_KEY, JSON.stringify(updatedTracker));
  } catch (err) {
    console.warn('Could not persist device order limit:', err);
  }

  return updatedTracker;
}
