import { formatCurrency } from './formatCurrency';
import { formatDateShort, formatTime12Hour, isRushDate } from './formatDate';

/**
 * Standardized, Professional & Accurate Order Summary Formatter
 * Human-sounding, well-structured, Meta-safe (No spam triggers, clean encoding)
 */
export function formatOrderSummary(order) {
  if (!order) return '';

  const isRush = Boolean(order.is_rush || order.isRush || isRushDate(order.preferred_date || order.preferredDate));
  const rushFee = parseFloat(order.rush_fee || order.rushFee) || (isRush ? 50 : 0);
  const deliveryFee = order.order_type === 'pickup' ? 0 : (parseFloat(order.delivery_fee || order.deliveryFee) || 0);
  const voucherDiscount = parseFloat(order.voucher_discount || order.voucherDiscount) || 0;
  const items = order.order_items || order.items || [];
  const itemsCount = items.length;

  const baseFulfillment = order.order_type === 'pickup' ? 'Pickup' : 'Delivery';
  const fulfillmentType = isRush ? `${baseFulfillment} (Rush Order)` : baseFulfillment;

  let paymentMethodLabel = 'Cash on Delivery (COD)';
  if (order.payment_method === 'gcash' || order.paymentMethod === 'gcash') {
    const refNo = order.gcash_reference_no || order.gcashRefNo;
    const hasProof = Boolean(order.payment_proof_url || order.paymentProofUrl);
    if (refNo) {
      paymentMethodLabel = `GCash (Ref: ${refNo})`;
    } else if (hasProof) {
      paymentMethodLabel = 'GCash (Proof Attached)';
    } else {
      paymentMethodLabel = 'GCash';
    }
  } else if (order.order_type === 'pickup' || order.orderType === 'pickup') {
    paymentMethodLabel = 'Cash upon Pickup';
  } else {
    paymentMethodLabel = 'Cash on Delivery (COD)';
  }

  const targetDateStr = order.preferred_date || order.preferredDate;
  const targetTimeStr = order.preferred_time || order.preferredTime;
  const formattedSchedule = targetDateStr
    ? `${formatDateShort(targetDateStr)}${targetTimeStr ? ` · ${formatTime12Hour(targetTimeStr)}` : ''}`
    : '';

  const deliveryAddr = order.delivery_address || order.delivery_location?.address || order.address || '';
  const customerNote = order.notes ? String(order.notes).trim() : '';

  const itemsListText = items
    .map((item) => {
      const optsList = item.order_item_options || item.options || [];
      const opts = optsList
        .map((o) => (typeof o === 'string' ? o : o.option_value || o.optionValue || o.label || o.name || ''))
        .filter(Boolean)
        .join(', ');
      const name = item.product_name || item.productName || item.name || 'Handmade Piece';
      const qty = item.quantity || 1;
      const price = item.total_price || item.totalPrice || (item.unitPrice ? item.unitPrice * qty : 0);
      return `• ${qty}x ${name}${opts ? ` (${opts})` : ''} — ${formatCurrency(price)}`;
    })
    .join('\n');

  const pickupLoc = order.pickup_address || order.pickupAddress || '';
  const isDelivery = order.order_type === 'delivery';

  let detailsList = [];
  detailsList.push(`• Reference: #${order.reference_code || order.referenceCode || 'MM-ORDER'}`);
  detailsList.push(`• Customer: ${order.customer_name || order.customerName || 'Customer'}${order.customer_phone || order.customerPhone ? ` (${order.customer_phone || order.customerPhone})` : ''}`);
  
  if (isDelivery) {
    detailsList.push(`• Claim via: Delivery${deliveryAddr ? ` (${deliveryAddr})` : ''}${isRush ? ' (Rush Order)' : ''}`);
  } else {
    detailsList.push(`• Claim via: Store Pickup${pickupLoc ? ` (${pickupLoc})` : ' (M&M\'s Artsy Studio)'}${isRush ? ' (Rush Order)' : ''}`);
  }

  if (formattedSchedule) {
    detailsList.push(`• Date Needed: ${formattedSchedule}`);
  }
  detailsList.push(`• Payment: ${paymentMethodLabel}`);

  const detailsBlock = detailsList.join('\n');

  let priceLines = [];
  if (itemsCount > 1 || deliveryFee > 0 || voucherDiscount > 0 || rushFee > 0) {
    if (order.subtotal) priceLines.push(`• Subtotal: ${formatCurrency(order.subtotal)}`);
  }
  if (deliveryFee > 0) {
    priceLines.push(`• Delivery Fee: ${formatCurrency(deliveryFee)}`);
  }
  if (rushFee > 0) {
    priceLines.push(`• Rush Fee: ${formatCurrency(rushFee)}`);
  }
  if (voucherDiscount > 0) {
    priceLines.push(`• Voucher Discount: -${formatCurrency(voucherDiscount)}`);
  }
  priceLines.push(`• Total Amount: ${formatCurrency(order.total_amount || order.totalAmount || 0)}`);
  const priceBreakdown = priceLines.join('\n');

  const notesLine = customerNote ? `\n\nSpecial Instructions: ${customerNote}` : '';

  return `Hi M&M Artsy! I would like to confirm my order from your shop:

📋 Order Details:
${detailsBlock}

🛍 Items:
${itemsListText || '• Handcrafted Bouquet / Crafts'}

💰 Summary:
${priceBreakdown}${notesLine}

Thank you po!`;
}
