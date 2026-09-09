import { createClient } from '@/lib/supabase/client';

/**
 * LIKHA Inventory Engine
 * Handles automatic stock deductions, purchase additions,
 * and stock movement audit logging.
 */

/**
 * Deduct stock when an order is completed
 * @param {string} orderId - UUID of the completed order
 * @param {Array} orderItems - Array of { product_id, quantity }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deductStockForOrder(orderId, orderItems) {
  const supabase = createClient();

  for (const item of orderItems) {
    // Get product's BOM
    const { data: bom, error: bomErr } = await supabase
      .from('product_materials')
      .select('material_id, quantity_required')
      .eq('product_id', item.product_id);

    if (bomErr) return { success: false, error: bomErr.message };

    for (const bomItem of bom || []) {
      const deductQty = bomItem.quantity_required * item.quantity;

      // Deduct from stock
      const { error: updateErr } = await supabase.rpc('deduct_stock', {
        p_material_id: bomItem.material_id,
        p_quantity: deductQty,
      });

      if (updateErr) return { success: false, error: updateErr.message };

      // Log movement
      await supabase.from('stock_movements').insert({
        material_id: bomItem.material_id,
        movement_type: 'ORDER_DEDUCTION',
        quantity: -deductQty,
        reference_id: orderId,
        reference_type: 'order',
        notes: `Auto-deducted for order completion`,
      });
    }
  }

  return { success: true };
}

/**
 * Add stock when a purchase is recorded
 * @param {string} purchaseId
 * @param {string} materialId
 * @param {number} quantity
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function addStockForPurchase(purchaseId, materialId, quantity) {
  const supabase = createClient();

  const { error: updateErr } = await supabase.rpc('add_stock', {
    p_material_id: materialId,
    p_quantity: quantity,
  });

  if (updateErr) return { success: false, error: updateErr.message };

  await supabase.from('stock_movements').insert({
    material_id: materialId,
    movement_type: 'PURCHASE',
    quantity: quantity,
    reference_id: purchaseId,
    reference_type: 'purchase',
    notes: `Stock added via purchase`,
  });

  return { success: true };
}

/**
 * Manually adjust stock (damaged, lost, correction)
 * @param {string} materialId
 * @param {number} quantity - positive or negative
 * @param {string} movementType - 'ADJUSTMENT' | 'DAMAGED' | 'RETURN'
 * @param {string} notes
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function adjustStock(materialId, quantity, movementType, notes) {
  const supabase = createClient();

  const { error: updateErr } = await supabase
    .from('materials')
    .update({
      current_stock: supabase.raw(`current_stock + ${quantity}`),
    })
    .eq('id', materialId);

  if (updateErr) return { success: false, error: updateErr.message };

  await supabase.from('stock_movements').insert({
    material_id: materialId,
    movement_type: movementType,
    quantity,
    reference_type: 'manual',
    notes,
  });

  return { success: true };
}

/**
 * Check if a material is low in stock
 * @param {{ current_stock: number, minimum_stock: number }} material
 * @returns {boolean}
 */
export function isLowStock(material) {
  return parseFloat(material.current_stock) <= parseFloat(material.minimum_stock);
}
