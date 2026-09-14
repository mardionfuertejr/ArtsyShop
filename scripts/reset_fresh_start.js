const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fqubsupqkorxfgohartk.supabase.co';
const supabaseKey = 'sb_publishable_fCYxAzMOcCTisJNWjC-2NA_VDR-IVbR';
const supabase = createClient(supabaseUrl, supabaseKey);

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function resetDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase DB.');

  const tables = ['order_items', 'orders', 'product_photos', 'product_options', 'products', 'custom_requests', 'feedbacks', 'materials'];

  for (const table of tables) {
    try {
      await client.query(`DELETE FROM public.${table};`);
      console.log(`Cleared table: ${table}`);
    } catch (err) {
      console.log(`Skipped table ${table} (${err.message})`);
    }
  }

  try {
    console.log('Resetting baseline categories...');
    await client.query('DELETE FROM public.categories;');
    await client.query(`
      INSERT INTO public.categories (id, name, slug, display_order, is_active)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'Bouquets', 'bouquets', 1, true),
        ('c0000000-0000-0000-0000-000000000002', 'Crochet', 'crochet', 2, true),
        ('c0000000-0000-0000-0000-000000000003', 'Resin Art', 'resin-art', 3, true),
        ('c0000000-0000-0000-0000-000000000004', 'Custom Gifts', 'custom-gifts', 4, true)
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log('Categories reset.');

    console.log('Cleaning Supabase Storage bucket product-photos...');
    const { data: fileList, error: listErr } = await supabase.storage.from('product-photos').list('', { limit: 1000 });
    if (!listErr && fileList && fileList.length > 0) {
      const pathsToDelete = fileList.map((f) => f.name).filter(Boolean);
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('product-photos').remove(pathsToDelete);
        console.log(`Deleted ${pathsToDelete.length} files from storage bucket.`);
      }
    }

    console.log('✅ Fresh Start Reset 100% Complete!');
  } catch (err) {
    console.error('Error during reset:', err);
  } finally {
    await client.end();
  }
}

resetDatabase();
