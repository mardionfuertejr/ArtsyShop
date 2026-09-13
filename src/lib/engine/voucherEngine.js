/**
 * M&M Artsy Voucher Wallet Engine
 * Allows customers to collect vouchers across all tiers and automatically applies
 * the best possible discount matching their cart subtotal (e.g. ₱5 for ₱150 carts,
 * up to ₱30 for ₱499+ carts). Single voucher use per checkout transaction.
 */

export const VOUCHER_TIERS = {
  BRONZE: {
    name: 'Bronze Starter',
    discount: 5,
    minSpend: 100, // ₱5 off on ₱100+ spend
    badge: '🥉',
    color: '#D97706',
    scoreRange: '80-139 pts',
  },
  SILVER: {
    name: 'Silver Blossom',
    discount: 10,
    minSpend: 150, // ₱10 off on ₱150+ spend (Instantly works for small single item orders!)
    badge: '🥈',
    color: '#64748B',
    scoreRange: '140-199 pts',
  },
  GOLD: {
    name: 'Gold Master Florist',
    discount: 20,
    minSpend: 280, // ₱20 off on ₱280+ spend
    badge: '🥇',
    color: '#EA580C',
    scoreRange: '200-249 pts',
  },
  DIAMOND: {
    name: 'Diamond Artisan Legend',
    discount: 30,
    minSpend: 399, // ₱30 off on ₱399+ spend
    badge: '💎',
    color: '#7C3AED',
    scoreRange: '250+ pts',
  },
};

export const SWEET_ARTISAN_QUOTES = [
  "Every flower blooms in its own sweet time.",
  "Handmade with love, gifted with thought.",
  "Creating little moments of handcrafted joy.",
  "Beauty takes time and craft.",
];

// Generate randomized unique voucher code: ARTSY-X4K9-30
export function generateRandomVoucherCode(discountAmount) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ARTSY-${rand}-${discountAmount}`;
}

// Get all stored vouchers in customer wallet
export function getVoucherWallet() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('mm_voucher_wallet');
    if (!raw) {
      // Check legacy single voucher and migrate if exists
      const legacy = localStorage.getItem('mm_active_voucher');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && !parsed.used && !isVoucherExpired(parsed)) {
          localStorage.setItem('mm_voucher_wallet', JSON.stringify([parsed]));
          return [parsed];
        }
      }
      return [];
    }
    const wallet = JSON.parse(raw);
    if (!Array.isArray(wallet)) return [];
    // Filter out expired & used
    const valid = wallet.filter((v) => v && !v.used && !isVoucherExpired(v));
    return valid;
  } catch {
    return [];
  }
}

// Save wallet
function saveVoucherWallet(wallet) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('mm_voucher_wallet', JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('mm_wallet_updated', { detail: wallet }));
  } catch {}
}

const TIER_KEYS_HIERARCHY = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

// Issue a voucher to customer's wallet (Cumulative: grants target tier AND all lower tiers so any cart size enjoys discounts!)
export function issueVoucherForTier(tierKey) {
  const tier = VOUCHER_TIERS[tierKey];
  if (!tier) return null;

  const targetIdx = TIER_KEYS_HIERARCHY.indexOf(tierKey);
  const eligibleTierKeys = targetIdx >= 0
    ? TIER_KEYS_HIERARCHY.slice(0, targetIdx + 1)
    : [tierKey];

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const vouchersToIssue = eligibleTierKeys.map((k) => {
    const t = VOUCHER_TIERS[k];
    return {
      code: generateRandomVoucherCode(t.discount),
      tierKey: k,
      tierName: t.name,
      discount: t.discount,
      minSpend: t.minSpend,
      badge: t.badge,
      color: t.color,
      label: `₱${t.discount} OFF (Min. spend ₱${t.minSpend})`,
      createdAt: now.toISOString(),
      expiresAt,
      used: false,
    };
  });

  const mainVoucher = vouchersToIssue[vouchersToIssue.length - 1];

  try {
    const currentWallet = getVoucherWallet();
    let updatedWallet = [...currentWallet];

    vouchersToIssue.forEach((newV) => {
      const existingIdx = updatedWallet.findIndex((v) => v.tierKey === newV.tierKey);
      if (existingIdx >= 0) {
        updatedWallet[existingIdx] = newV;
      } else {
        updatedWallet.push(newV);
      }
    });

    saveVoucherWallet(updatedWallet);
    // Also update active single voucher reference for quick compatibility
    localStorage.setItem('mm_active_voucher', JSON.stringify(mainVoucher));
    window.dispatchEvent(new CustomEvent('mm_voucher_updated', { detail: mainVoucher }));

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('likha_toast', {
            detail: {
              type: 'success',
              title: `Vouchers Unlocked! ${tier.badge || '🎁'}`,
              message: `₱${tier.discount} OFF & all tier discounts added to your wallet!`,
              actionLabel: 'Shop Now',
              actionUrl: '/shop',
              duration: 3800,
            },
          })
        );
      } catch {}
    }

    return { voucher: mainVoucher, upgraded: true, message: 'Vouchers saved to wallet' };
  } catch {
    return { voucher: mainVoucher, upgraded: true, message: 'Voucher created' };
  }
}

// Get the best applicable voucher for a given cart subtotal
export function getBestApplicableVoucher(subtotal = 0) {
  const wallet = getVoucherWallet();
  if (!wallet || wallet.length === 0) return null;

  // Find all vouchers where subtotal >= minSpend, sorted by discount descending
  const eligible = wallet
    .filter((v) => subtotal >= (v.minSpend || 0))
    .sort((a, b) => b.discount - a.discount);

  if (eligible.length > 0) {
    return eligible[0]; // Best discount that can be used right now!
  }

  // If none eligible yet, return the lowest min spend voucher so customer knows what's closest
  const sortedByMinSpend = [...wallet].sort((a, b) => a.minSpend - b.minSpend);
  return sortedByMinSpend[0] || null;
}

// Check if voucher has passed 24h
export function isVoucherExpired(voucher) {
  if (!voucher || !voucher.expiresAt) return false;
  return new Date(voucher.expiresAt).getTime() < Date.now();
}

// Mark voucher as used after order checkout submission
export function markVoucherAsUsed(code) {
  if (typeof window === 'undefined' || !code) return;
  try {
    const wallet = getVoucherWallet();
    const updated = wallet.map((v) => (v.code === code ? { ...v, used: true } : v));
    saveVoucherWallet(updated.filter((v) => !v.used));

    const activeRaw = localStorage.getItem('mm_active_voucher');
    if (activeRaw) {
      const parsed = JSON.parse(activeRaw);
      if (parsed.code === code) {
        parsed.used = true;
        localStorage.setItem('mm_active_voucher', JSON.stringify(parsed));
      }
    }
  } catch {}
}

// Validate voucher against subtotal
export function validateVoucherAgainstSubtotal(voucher, subtotal) {
  if (!voucher) return { valid: false, reason: 'No voucher selected.' };
  if (isVoucherExpired(voucher)) return { valid: false, reason: 'Voucher expired (24h limit).' };
  if (voucher.used) return { valid: false, reason: 'Voucher was already used.' };
  if (subtotal < (voucher.minSpend || 0)) {
    const lacking = voucher.minSpend - subtotal;
    const lackingStr = lacking % 1 === 0 ? lacking.toFixed(0) : lacking.toFixed(2);
    return {
      valid: false,
      reason: `Min. spend ₱${voucher.minSpend} · Add ₱${lackingStr} more`,
      lacking: voucher.minSpend - subtotal,
    };
  }
  return { valid: true, discount: voucher.discount };
}

// Retrieve single active voucher
export function getActiveVoucher() {
  if (typeof window === 'undefined') return null;
  try {
    const wallet = getVoucherWallet();
    if (wallet.length > 0) {
      return wallet.sort((a, b) => b.discount - a.discount)[0];
    }
    const raw = localStorage.getItem('mm_active_voucher');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.used || isVoucherExpired(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
