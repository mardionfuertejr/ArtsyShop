'use client';

import ConfirmationClient from '../confirmation/[referenceCode]/ConfirmationClient';

export default function PreviewPage() {
  const mockOrder = {
    reference_code: 'M&M-260926-002',
    customer_name: 'Mardion Jr.',
    customer_phone: '09171234567',
    order_type: 'delivery',
    delivery_address: 'Barangay Central, Metro Manila',
    subtotal: 250,
    delivery_fee: 50,
    rush_fee: 0,
    is_rush: false,
    voucher_discount: 60.36,
    total_amount: 189.64,
    notes: 'Please handle with care. Thank you!',
    preferred_date: '2026-09-29',
    preferred_time: '14:00',
    order_items: [
      {
        product_name: 'mardion',
        quantity: 1,
        total_price: 250,
        order_item_options: [
          { option_name: 'Option', option_value: 'Standard Option1' },
        ],
      },
    ],
  };

  return <ConfirmationClient order={mockOrder} referenceCode="M&M-260926-002" />;
}
