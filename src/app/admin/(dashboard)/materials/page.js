import { createClient } from '@/lib/supabase/server';
import { getMockMaterials } from '@/lib/mockData';
import AdminMaterialsClient from './AdminMaterialsClient';

export const metadata = { title: "Raw Materials & Inventory | M&M's Artsy Admin" };

export default async function AdminMaterialsPage() {
  let materials = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        materials = data.map((m) => ({
          ...m,
          cost_per_unit: Number(m.current_unit_cost || 0),
          current_stock: Number(m.current_stock || 0),
          minimum_stock: Number(m.minimum_stock || 0),
        }));
      }
    }
  } catch (err) {
    // Fallback to mock data
  }

  if (materials.length === 0) {
    materials = getMockMaterials();
  }

  return <AdminMaterialsClient initialMaterials={materials} />;
}
