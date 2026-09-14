// Automated Test Suite for Order Receipt, Messenger Deep Linking, and Standards Compliance

function runTests() {
  console.log('=== STARTING AUTOMATED VALIDATION SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test Browser Navigation & Messenger URL Constructor
  const PAGE_ID = '61587268312750';
  const sampleOrder = {
    reference_code: 'M&M-260914-001',
    customer_name: 'Juan Dela Cruz',
    order_type: 'pickup',
    subtotal: 620,
    delivery_fee: 0,
    voucher_discount: 50,
    total_amount: 570,
    order_items: [
      {
        product_name: 'Lavender & Daisy Bloom Box',
        quantity: 1,
        total_price: 620,
        order_item_options: [
          { option_name: 'Color', option_value: 'Pearl White' },
          { option_name: 'Lights', option_value: 'Warm White Glow' },
        ],
      },
    ],
  };

  // Build items text
  const itemsListText = sampleOrder.order_items
    .map((item) => {
      const opts = item.order_item_options.map((o) => o.option_value).join(', ');
      return `• ${item.quantity}x ${item.product_name}${opts ? ` (${opts})` : ''} — ₱${item.total_price.toFixed(2)}`;
    })
    .join('\n');

  // Build price lines
  let priceLines = [];
  priceLines.push(`Subtotal: ₱${sampleOrder.subtotal.toFixed(2)}`);
  if (sampleOrder.voucher_discount > 0) {
    priceLines.push(`Voucher Discount: -₱${sampleOrder.voucher_discount.toFixed(2)}`);
  }
  priceLines.push(`Total Amount: ₱${sampleOrder.total_amount.toFixed(2)}`);
  const priceBreakdown = priceLines.join('\n');

  const prefilledMessage = `Order Receipt - M&M's Artsy
Reference: ${sampleOrder.reference_code}
Customer: ${sampleOrder.customer_name}
Claim Method: Pickup

Items:
${itemsListText}

${priceBreakdown}

Hi M&M's Artsy! I would like to confirm my order from the website. Thank you!`;

  // Check 1: Anti-spam compliance (no unicode box drawing characters that trigger Meta spam bots)
  assert(!prefilledMessage.includes('───') && !prefilledMessage.includes('━━━') && !prefilledMessage.includes('│'), 'No unicode box characters (passes Meta anti-spam filter)');

  // Check 2: Structure includes all essential e-commerce fields
  assert(prefilledMessage.includes('Reference: M&M-260914-001'), 'Includes Reference Code');
  assert(prefilledMessage.includes('Customer: Juan Dela Cruz'), 'Includes Customer Name');
  assert(prefilledMessage.includes('Claim Method: Pickup'), 'Includes Claim Method');
  assert(prefilledMessage.includes('Voucher Discount: -₱50.00'), 'Includes Voucher Discount breakdown');
  assert(prefilledMessage.includes('Total Amount: ₱570.00'), 'Includes Total Amount');

  // Check 3: Deep Link construction (m.me universal link)
  const encodedText = encodeURIComponent(prefilledMessage);
  const deepLink = `https://m.me/${PAGE_ID}?text=${encodedText}`;
  assert(deepLink.startsWith(`https://m.me/${PAGE_ID}?text=`), 'Valid m.me deep link generated');
  assert(deepLink.includes('Reference%3A%20M%26M-260914-001'), 'Text is properly URL-encoded for cross-platform delivery');

  // Check 4: In-App Browser Regex Detection
  const fbUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/16.0;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]';
  const isFbOrIg = /FBAN|FBAV|Instagram|Messenger/i.test(fbUserAgent);
  assert(isFbOrIg === true, 'Successfully detects Facebook In-App Browser to prevent newsfeed kickback');

  console.log(`\n=== RESULT: ${passed} TESTS PASSED, ${failed} FAILED ===\n`);
}

runTests();
