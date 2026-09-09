/**
 * Device-Remembered Customer Loyalty Engine
 * Automatically tracks previous customer orders on the device via localStorage
 * and provides loyalty discounts for returning craft lovers without requiring registration.
 */

const LOYALTY_STORAGE_KEY = 'mm_device_loyalty';
const LOYALTY_DISCOUNT_PERCENT = 5; // 5% discount for returning customers

export function getDeviceLoyalty() {
  if (typeof window === 'undefined') {
    return { isReturningCustomer: false, orderCount: 0, discountPercent: LOYALTY_DISCOUNT_PERCENT };
  }

  try {
    const raw = localStorage.getItem(LOYALTY_STORAGE_KEY);
    if (!raw) {
      return { isReturningCustomer: false, orderCount: 0, discountPercent: LOYALTY_DISCOUNT_PERCENT };
    }

    const data = JSON.parse(raw);
    const orderCount = Array.isArray(data.orders) ? data.orders.length : (data.orderCount || 0);

    return {
      isReturningCustomer: orderCount > 0,
      orderCount,
      discountPercent: LOYALTY_DISCOUNT_PERCENT,
      customerName: data.customerName || '',
      lastOrderDate: data.lastOrderDate || null,
      orders: data.orders || [],
    };
  } catch (err) {
    return { isReturningCustomer: false, orderCount: 0, discountPercent: LOYALTY_DISCOUNT_PERCENT };
  }
}

export function recordCompletedOrder(order) {
  if (typeof window === 'undefined' || !order) return;

  try {
    const current = getDeviceLoyalty();
    const existingOrders = current.orders || [];

    const orderEntry = {
      referenceCode: order.reference_code || order.referenceCode,
      createdAt: new Date().toISOString(),
      totalAmount: order.total_amount || order.totalAmount || 0,
      customerName: order.customer_name || order.customerName || '',
    };

    // Avoid duplicate reference codes
    const updatedOrders = [
      orderEntry,
      ...existingOrders.filter((o) => o.referenceCode !== orderEntry.referenceCode),
    ];

    const loyaltyPayload = {
      orderCount: updatedOrders.length,
      customerName: orderEntry.customerName || current.customerName,
      lastOrderDate: new Date().toISOString(),
      orders: updatedOrders.slice(0, 20), // Store up to recent 20 orders
    };

    localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(loyaltyPayload));
  } catch (err) {}
}

export function calculateLoyaltyDiscount(subtotal) {
  const loyalty = getDeviceLoyalty();
  if (!loyalty.isReturningCustomer || !subtotal || subtotal <= 0) {
    return 0;
  }

  // 5% discount rounded to nearest peso
  return Math.round((subtotal * loyalty.discountPercent) / 100);
}
