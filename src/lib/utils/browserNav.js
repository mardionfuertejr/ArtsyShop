/**
 * Safe External Navigation & Direct Messenger Deep-Linking Helper
 * 
 * 1. Direct Messenger App Launching: Uses official `m.me` universal links so mobile devices
 *    (iOS/Android) immediately open the native Messenger App without intermediary prompts
 *    ("Continue to Messenger?" confirmation modals).
 * 2. Seamless WebView Protection: In Facebook/Instagram In-App Browsers, uses `window.location.href`
 *    so the WebView never crashes and never drops the customer into the Facebook News Feed.
 */

export const MESSENGER_PAGE_ID = '61587268312750';
export const MESSENGER_SHORT_URL = `https://m.me/${MESSENGER_PAGE_ID}`;

export function getMessengerChatUrl(text = '') {
  if (!text) return `https://m.me/${MESSENGER_PAGE_ID}`;
  return `https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(text)}`;
}

export function openMessengerDirect(text = '') {
  if (typeof window === 'undefined') return;

  const encodedText = encodeURIComponent(text || '');
  const mMeUrl = text
    ? `https://m.me/${MESSENGER_PAGE_ID}?text=${encodedText}`
    : `https://m.me/${MESSENGER_PAGE_ID}`;

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isFbOrIg = /FBAN|FBAV|Instagram|Messenger/i.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  if (isFbOrIg || isMobile) {
    // Universal m.me link directly opens native Messenger app on mobile without extra confirmation screens
    window.location.href = mMeUrl;
  } else {
    // On desktop browsers: open clean web chat tab
    const webUrl = text
      ? `https://www.facebook.com/messages/t/${MESSENGER_PAGE_ID}?text=${encodedText}`
      : `https://www.facebook.com/messages/t/${MESSENGER_PAGE_ID}`;
    const win = window.open(webUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = webUrl;
    }
  }
}

export function openExternalSafe(url) {
  if (typeof window === 'undefined' || !url) return;

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isFbOrIg = /FBAN|FBAV|Instagram|Messenger/i.test(ua);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  if (isFbOrIg || isMobile) {
    window.location.href = url;
  } else {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = url;
    }
  }
}

