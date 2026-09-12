/**
 * M&M Artsy Costing Engine
 * Calculates Bill of Materials (BOM) cost for a product
 * based on materials and their current unit costs.
 */

/**
 * Calculate the total BOM cost for a product
 * @param {Array} productMaterials - Array of { quantity_required, material: { current_unit_cost } }
 * @returns {number} Total material cost
 */
export function calculateBOMCost(productMaterials = []) {
  return productMaterials.reduce((total, item) => {
    const qty = parseFloat(item.quantity_required) || 0;
    const unitCost = parseFloat(item.material?.current_unit_cost) || 0;
    return total + (qty * unitCost);
  }, 0);
}

/**
 * Get a breakdown of each material's contribution to cost
 * @param {Array} productMaterials
 * @returns {Array} Array of { name, unit, quantity, unitCost, subtotal }
 */
export function getBOMBreakdown(productMaterials = []) {
  return productMaterials.map((item) => {
    const qty = parseFloat(item.quantity_required) || 0;
    const unitCost = parseFloat(item.material?.current_unit_cost) || 0;
    return {
      materialId: item.material_id,
      name: item.material?.name || 'Unknown',
      unit: item.material?.unit || '',
      quantity: qty,
      unitCost,
      subtotal: qty * unitCost,
    };
  });
}

/**
 * Take a cost snapshot for an order item (preserves historical accuracy)
 * Even if material prices change later, this snapshot remains fixed.
 * @param {Array} productMaterials
 * @param {number} quantity - how many of the product ordered
 * @returns {{ unitCost: number, totalCost: number }}
 */
export function takeCostSnapshot(productMaterials = [], quantity = 1) {
  const unitCost = calculateBOMCost(productMaterials);
  return {
    unitCost: parseFloat(unitCost.toFixed(2)),
    totalCost: parseFloat((unitCost * quantity).toFixed(2)),
  };
}
