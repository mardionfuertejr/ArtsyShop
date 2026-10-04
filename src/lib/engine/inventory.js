import { createClient } from '@/lib/supabase/client';
import { MOCK_MATERIALS } from '@/lib/mockData';

/**
 * M&M Artsy Inventory & Stock Deduction Engine
 * Handles automatic material deductions on order confirmation / crafting,
 * purchase additions, and stock movement audit logging across Supabase and local storage.
 */

const DEDUCTED_ORDERS_KEY = 'likha_deducted_orders';

/**
 * Check if an order has already had its materials deducted
 */
export function isOrderStockDeducted(referenceCode) {
  if (typeof window === 'undefined') return false;
  try {
    const list = JSON.parse(localStorage.getItem(DEDUCTED_ORDERS_KEY) || '[]');
    return list.includes(referenceCode);
  } catch {
    return false;
  }
}

/**
 * Mark an order as deducted to prevent double-deduction
 */
export function markOrderStockDeducted(referenceCode) {
  if (typeof window === 'undefined') return;
  try {
    const list = JSON.parse(localStorage.getItem(DEDUCTED_ORDERS_KEY) || '[]');
    if (!list.includes(referenceCode)) {
      list.push(referenceCode);
      localStorage.setItem(DEDUCTED_ORDERS_KEY, JSON.stringify(list.slice(-100)));
    }
  } catch {}
}

/**
 * Deduct material inventory when an order is confirmed or goes into crafting
 * @param {Object} order - Full order object with reference_code and order_items
 * @returns {Promise<{ success: boolean, deductedItems: Array, error?: string }>}
 */
export async function deductStockForOrder(order) {
  if (!order) return { success: false, error: 'No order provided' };

  const refCode = order.reference_code || order.id;
  if (!refCode) return { success: false, error: 'Missing reference code' };

  // 1. Prevent duplicate deduction
  if (isOrderStockDeducted(refCode)) {
    return { success: true, alreadyDeducted: true };
  }

  const items = order.order_items || order.items || [];
  if (items.length === 0) return { success: true, deductedItems: [] };

  const deductedSummary = [];

  // 2. Try Supabase deduction if connected
  try {
    const supabase = createClient();
    if (supabase) {
      for (const item of items) {
        if (item.product_id) {
          const { data: bom } = await supabase
            .from('product_materials')
            .select('material_id, quantity_required')
            .eq('product_id', item.product_id);

          if (Array.isArray(bom) && bom.length > 0) {
            for (const bomItem of bom) {
              const deductQty = (parseFloat(bomItem.quantity_required) || 1) * (item.quantity || 1);

              await supabase.rpc('deduct_stock', {
                p_material_id: bomItem.material_id,
                p_quantity: deductQty,
              }).catch(() => {});

              await supabase.from('stock_movements').insert({
                material_id: bomItem.material_id,
                movement_type: 'ORDER_DEDUCTION',
                quantity: -deductQty,
                reference_id: String(order.id || refCode),
                reference_type: 'order',
                notes: `Auto-deducted for order ${refCode}`,
              }).catch(() => {});

              deductedSummary.push({ materialId: bomItem.material_id, quantity: deductQty });
            }
          }
        }
      }
    }
  } catch (dbErr) {
    console.warn('Supabase stock deduction note:', dbErr);
  }

  // 3. Always sync / deduct in LocalStorage (likha_custom_materials) for instant UI updates
  if (typeof window !== 'undefined') {
    try {
      const savedRaw = localStorage.getItem('likha_custom_materials');
      let currentMaterials = savedRaw ? JSON.parse(savedRaw) : [...MOCK_MATERIALS];

      if (Array.isArray(currentMaterials) && currentMaterials.length > 0) {
        let updated = false;

        // General smart material deduction based on product name/category keywords
        items.forEach((item) => {
          const name = (item.product_name || item.name || '').toLowerCase();
          const qty = item.quantity || 1;

          currentMaterials = currentMaterials.map((mat) => {
            const mName = mat.name.toLowerCase();
            let deduction = 0;

            // Bouquet item deductions
            if (name.includes('bouquet') || name.includes('sunflower') || name.includes('tulip') || name.includes('rose')) {
              if (mName.includes('fuzzy wire') && (name.includes('yellow') ? mName.includes('yellow') : (name.includes('pink') ? mName.includes('pink') : true))) {
                deduction = Math.min(mat.current_stock, 1 * qty);
              } else if (mName.includes('floral tape') || mName.includes('flower stem')) {
                deduction = Math.min(mat.current_stock, 1 * qty);
              } else if (mName.includes('wrapper') || mName.includes('kraft')) {
                deduction = Math.min(mat.current_stock, 1 * qty);
              }
            } 
            // Keychain / small craft deductions
            else if (name.includes('keychain') || name.includes('charm')) {
              if (mName.includes('keychain ring')) {
                deduction = Math.min(mat.current_stock, 1 * qty);
              } else if (mName.includes('fuzzy wire')) {
                deduction = Math.min(mat.current_stock, 1 * qty);
              }
            }

            if (deduction > 0) {
              updated = true;
              return {
                ...mat,
                current_stock: Math.max(0, mat.current_stock - deduction),
              };
            }
            return mat;
          });
        });

        if (updated) {
          localStorage.setItem('likha_custom_materials', JSON.stringify(currentMaterials));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('likha_materials_updated', { detail: currentMaterials }));
        }
      }
    } catch (localErr) {
      console.warn('Local material stock deduction error:', localErr);
    }
  }

  // 4. Mark order as deducted
  markOrderStockDeducted(refCode);

  return {
    success: true,
    deductedItems: deductedSummary,
  };
}

/**
 * Add stock when a purchase is recorded
 */
export async function addStockForPurchase(purchaseId, materialId, quantity) {
  const supabase = createClient();
  if (!supabase) return { success: false, error: 'Client not ready' };

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
 */
export async function adjustStock(materialId, quantity, movementType, notes) {
  const supabase = createClient();
  if (!supabase) return { success: false, error: 'Client not ready' };

  // Try RPC first
  const { error: rpcErr } = await supabase.rpc('add_stock', {
    p_material_id: materialId,
    p_quantity: quantity,
  });

  if (rpcErr) {
    // Fallback: fetch current stock and update
    const { data: mat, error: fetchErr } = await supabase
      .from('materials')
      .select('current_stock')
      .eq('id', materialId)
      .single();

    if (fetchErr) return { success: false, error: fetchErr.message };

    const newStock = Math.max(0, (Number(mat?.current_stock) || 0) + Number(quantity));
    const { error: updateErr } = await supabase
      .from('materials')
      .update({ current_stock: newStock })
      .eq('id', materialId);

    if (updateErr) return { success: false, error: updateErr.message };
  }

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
 */
export function isLowStock(material) {
  return parseFloat(material.current_stock) <= parseFloat(material.minimum_stock);
}
