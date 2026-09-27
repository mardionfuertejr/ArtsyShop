// Web Push & Device Notification Helper for M&M Artsy

export function isNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    await registerServiceWorker();
    const permission = await Notification.requestPermission();
    
    // Save preference to localStorage
    if (permission === 'granted') {
      try {
        localStorage.setItem('mm_push_notifications_enabled', 'true');
      } catch {}
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export async function triggerOrderNotification({ title, body, url, tag }) {
  if (typeof window === 'undefined') return;

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && reg.showNotification) {
      // Use service worker for robust mobile notification display
      reg.showNotification(title || '🌸 M&M Artsy Shop', {
        body: body || 'Update sa iyong order!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: tag || 'order-ready-alert',
        renotify: true,
        data: { url: url || '/track' },
      });
      return;
    }
  } catch (e) {
    console.warn('SW notification fallback:', e);
  }

  // Fallback to standard Notification API
  try {
    const notif = new Notification(title || '🌸 M&M Artsy Shop', {
      body: body || 'Update sa iyong order!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url: url || '/track' },
    });
    notif.onclick = function () {
      window.focus();
      if (url) window.location.href = url;
      notif.close();
    };
  } catch {}
}

/**
 * Format status message for customer notification (General for all handmade products)
 */
export function getOrderStatusNotificationContent(order, newStatus) {
  const ref = order.reference_code || order.id || '';
  const firstName = order.customer_name ? order.customer_name.trim().split(' ')[0] : '';
  const greeting = firstName ? `Hi ${firstName}! ` : '';
  const isDelivery = order.order_type === 'delivery';

  switch (newStatus) {
    case 'ready':
      return {
        title: 'Order Ready! 📦 — M&M Artsy',
        body: `${greeting}Your order #${ref} is ready ${isDelivery ? 'and set for delivery.' : 'for pickup.'}`,
        url: `/track?ref=${ref}`,
        tag: `order-ready-${ref}`,
      };
    case 'preparing':
    case 'crafting':
      return {
        title: 'Crafting in Progress 🎨 — M&M Artsy',
        body: `${greeting}We have started crafting your order #${ref}.`,
        url: `/track?ref=${ref}`,
        tag: `order-crafting-${ref}`,
      };
    case 'completed':
      return {
        title: 'Order Completed 🎉 — M&M Artsy',
        body: `Thank you ${firstName ? firstName : 'for shopping with us'}! Your order #${ref} has been completed.`,
        url: `/track?ref=${ref}`,
        tag: `order-completed-${ref}`,
      };
    default:
      return null;
  }
}
