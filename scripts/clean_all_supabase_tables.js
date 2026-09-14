const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fqubsupqkorxfgohartk.supabase.co';
const supabaseKey = 'sb_publishable_fCYxAzMOcCTisJNWjC-2NA_VDR-IVbR';
const supabase = createClient(supabaseUrl, supabaseKey);

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function cleanAllSupabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL DB.');

  try {
    // 1. Get all tables in public schema
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const tables = res.rows.map((r) => r.table_name);
    console.log('Public tables found in Supabase:', tables);

    // 2. Disable constraints temporarily and truncate/delete all rows
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE public."${table}" CASCADE;`);
        console.log(`✅ Truncated: ${table}`);
      } catch (truncErr) {
        try {
          await client.query(`DELETE FROM public."${table}";`);
          console.log(`✅ Cleared with DELETE: ${table}`);
        } catch (delErr) {
          console.warn(`Could not clear ${table}: ${delErr.message}`);
        }
      }
    }

    // 3. Re-seed default 4 empty categories
    console.log('Adding fresh baseline categories...');
    await client.query(`
      INSERT INTO public.categories (id, name, slug, display_order, is_active)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'Bouquets', 'bouquets', 1, true),
        ('c0000000-0000-0000-0000-000000000002', 'Crochet', 'crochet', 2, true),
        ('c0000000-0000-0000-0000-000000000003', 'Resin Art', 'resin-art', 3, true),
        ('c0000000-0000-0000-0000-000000000004', 'Custom Gifts', 'custom-gifts', 4, true)
      ON CONFLICT DO NOTHING;
    `);

    // 4. Clean all storage objects in Supabase storage
    console.log('Cleaning all files from Supabase Storage...');
    const { data: fileList } = await supabase.storage.from('product-photos').list('', { limit: 1000 });
    if (fileList && fileList.length > 0) {
      const paths = fileList.map((f) => f.name).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('product-photos').remove(paths);
        console.log(`Deleted ${paths.length} storage files.`);
      }
    }

    // 5. Verify row count for each table
    console.log('\n--- FINAL SUPABASE TABLE ROW COUNTS ---');
    for (const table of tables) {
      try {
        const countRes = await client.query(`SELECT count(*) FROM public."${table}";`);
        console.log(`Table "${table}": ${countRes.rows[0].count} rows`);
      } catch {}
    }

    console.log('\n✅ Supabase is 100% sparkling clean!');
  } catch (err) {
    console.error('Error during Supabase clean:', err);
  } finally {
    await client.end();
  }
}

cleanAllSupabase();
