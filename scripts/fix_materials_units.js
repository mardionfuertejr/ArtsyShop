const { Client } = require('pg');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function fixUnits() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(`
      UPDATE materials 
      SET unit = 'pack' 
      WHERE unit = '100 pcs' OR unit LIKE '%100 pcs%';
    `);
    console.log(`Updated ${res.rowCount} rows in materials table.`);

    const check = await client.query(`SELECT id, name, unit, current_stock, minimum_stock, current_unit_cost FROM materials LIMIT 10`);
    console.log('Sample materials:', check.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixUnits();
