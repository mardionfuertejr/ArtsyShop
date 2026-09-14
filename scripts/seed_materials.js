const { Client } = require('pg');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const rawMaterials = [
  // ── 1. FUZZY WIRES (Chenille Stems) ──
  {
    name: 'Fuzzy Wire (White)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Pink)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Baby Pink)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Red)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Yellow)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Purple)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Baby Blue)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },
  {
    name: 'Fuzzy Wire (Green)',
    category: 'Chenille Stems',
    unit: '100 pcs',
    current_unit_cost: 35.00,
    current_stock: 50,
    minimum_stock: 10
  },

  // ── 2. FLORAL SUPPLIES & HARDWARE ──
  {
    name: 'Floral Wire (Green)',
    category: 'Floral Supplies',
    unit: 'pack',
    current_unit_cost: 75.00,
    current_stock: 30,
    minimum_stock: 10
  },
  {
    name: 'Floral Tape (Green)',
    category: 'Floral Supplies',
    unit: 'roll',
    current_unit_cost: 20.00,
    current_stock: 30,
    minimum_stock: 10
  },
  {
    name: 'Floral Stamen (Yellow)',
    category: 'Floral Supplies',
    unit: 'pack',
    current_unit_cost: 35.00,
    current_stock: 25,
    minimum_stock: 10
  },
  {
    name: 'Floral Stamen (White)',
    category: 'Floral Supplies',
    unit: 'pack',
    current_unit_cost: 35.00,
    current_stock: 25,
    minimum_stock: 10
  },
  {
    name: 'Pearl Beads (White)',
    category: 'Floral Supplies',
    unit: 'pack',
    current_unit_cost: 45.00,
    current_stock: 25,
    minimum_stock: 10
  },
  {
    name: 'Hot Glue Sticks (Clear)',
    category: 'Floral Supplies',
    unit: 'pack',
    current_unit_cost: 30.00,
    current_stock: 40,
    minimum_stock: 10
  },

  // ── 3. WRAPPERS & RIBBONS ──
  {
    name: 'Bouquet Wrapper (White)',
    category: 'Wrappers & Ribbons',
    unit: 'sheet',
    current_unit_cost: 15.00,
    current_stock: 50,
    minimum_stock: 15
  },
  {
    name: 'Bouquet Wrapper (Pink)',
    category: 'Wrappers & Ribbons',
    unit: 'sheet',
    current_unit_cost: 15.00,
    current_stock: 50,
    minimum_stock: 15
  },
  {
    name: 'Bouquet Wrapper (Brown/Kraft)',
    category: 'Wrappers & Ribbons',
    unit: 'sheet',
    current_unit_cost: 15.00,
    current_stock: 50,
    minimum_stock: 15
  },
  {
    name: 'Clear Bouquet Plastic',
    category: 'Packaging',
    unit: 'pc',
    current_unit_cost: 5.00,
    current_stock: 100,
    minimum_stock: 20
  },
  {
    name: 'Ribbon (White)',
    category: 'Wrappers & Ribbons',
    unit: 'roll',
    current_unit_cost: 75.00,
    current_stock: 25,
    minimum_stock: 10
  },
  {
    name: 'Ribbon (Pink)',
    category: 'Wrappers & Ribbons',
    unit: 'roll',
    current_unit_cost: 75.00,
    current_stock: 25,
    minimum_stock: 10
  },
  {
    name: 'Ribbon (Red)',
    category: 'Wrappers & Ribbons',
    unit: 'roll',
    current_unit_cost: 75.00,
    current_stock: 25,
    minimum_stock: 10
  },

  // ── 4. TOOLS & EQUIPMENT ──
  {
    name: 'Glue Gun',
    category: 'Floral Supplies',
    unit: 'pc',
    current_unit_cost: 115.00,
    current_stock: 10,
    minimum_stock: 2
  },
  {
    name: 'Scissors',
    category: 'Floral Supplies',
    unit: 'pc',
    current_unit_cost: 75.00,
    current_stock: 10,
    minimum_stock: 2
  },
  {
    name: 'Small Pliers',
    category: 'Floral Supplies',
    unit: 'pc',
    current_unit_cost: 75.00,
    current_stock: 10,
    minimum_stock: 2
  }
];

async function seedMaterials() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  let inserted = 0;
  let updated = 0;

  for (const mat of rawMaterials) {
    const existing = await client.query('SELECT id FROM materials WHERE name = $1', [mat.name]);
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO materials (name, category, unit, current_unit_cost, current_stock, minimum_stock)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [mat.name, mat.category, mat.unit, mat.current_unit_cost, mat.current_stock, mat.minimum_stock]
      );
      inserted++;
      console.log(`+ Added: ${mat.name} (${mat.category} - ${mat.unit})`);
    } else {
      await client.query(
        `UPDATE materials SET
          category = $1, unit = $2, current_unit_cost = $3, current_stock = $4, minimum_stock = $5
         WHERE id = $6`,
        [mat.category, mat.unit, mat.current_unit_cost, mat.current_stock, mat.minimum_stock, existing.rows[0].id]
      );
      updated++;
      console.log(`* Updated: ${mat.name}`);
    }
  }

  const countRes = await client.query('SELECT count(*) FROM materials');
  console.log(`\n✅ Done! Inserted: ${inserted}, Updated: ${updated}. Total materials in DB: ${countRes.rows[0].count}`);

  await client.end();
}

seedMaterials().catch(err => {
  console.error('Error seeding materials:', err);
  process.exit(1);
});
