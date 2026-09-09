/**
 * LIKHA Pricing Engine
 * Supports Manual, Markup, and Target Margin pricing methods.
 */

/**
 * Calculate suggested selling price using target margin
 * Selling Price = Cost / (1 - Margin)
 * @param {number} cost - BOM cost
 * @param {number} targetMargin - e.g. 0.40 for 40%
 * @returns {number}
 */
export function calcByMargin(cost, targetMargin) {
  if (targetMargin >= 1 || targetMargin < 0) return cost;
  return cost / (1 - targetMargin);
}

/**
 * Calculate suggested selling price using markup multiplier
 * Selling Price = Cost * Markup
 * @param {number} cost - BOM cost
 * @param {number} markup - e.g. 2.0 for 2x markup
 * @returns {number}
 */
export function calcByMarkup(cost, markup) {
  return cost * markup;
}

/**
 * Get the suggested price based on chosen method
 * @param {number} cost
 * @param {'manual'|'markup'|'margin'} method
 * @param {number} value - markup multiplier or margin decimal
 * @param {number} manualPrice - used if method is 'manual'
 * @returns {number}
 */
export function getSuggestedPrice(cost, method, value, manualPrice = 0) {
  switch (method) {
    case 'margin': return calcByMargin(cost, value);
    case 'markup': return calcByMarkup(cost, value);
    case 'manual': return manualPrice;
    default: return cost;
  }
}

/**
 * Calculate estimated profit and margin from selling price and cost
 * @param {number} sellingPrice
 * @param {number} cost
 * @returns {{ grossProfit: number, margin: number }}
 */
export function calcProfit(sellingPrice, cost) {
  const grossProfit = sellingPrice - cost;
  const margin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  return {
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    margin: parseFloat(margin.toFixed(1)),
  };
}

/**
 * Round a price to the nearest "nice" number (e.g. ₱118.33 → ₱120)
 * @param {number} price
 * @param {number} nearest - round to nearest this (default 5)
 * @returns {number}
 */
export function roundPrice(price, nearest = 5) {
  return Math.ceil(price / nearest) * nearest;
}

/**
 * Calculate net profit for a period
 * @param {number} revenue - total sales
 * @param {number} cogs - total product cost (order_item.total_cost)
 * @param {number} expenses - overhead expenses
 * @returns {{ grossProfit: number, netProfit: number, grossMargin: number, netMargin: number }}
 */
export function calcNetProfit(revenue, cogs, expenses) {
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return {
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    grossMargin: parseFloat(grossMargin.toFixed(1)),
    netMargin: parseFloat(netMargin.toFixed(1)),
  };
}
