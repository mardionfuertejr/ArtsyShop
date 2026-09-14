const { Client } = require('pg');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const defaultPhotos = {
  bouquet: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
  gift: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  craft: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  resin: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
};

const masterProducts = [
  {
    name: 'Flower Bouquet',
    slug: 'fuzzy-flower-bouquet',
    category_slug: 'bouquets',
    base_price: 250,
    description: 'Handcrafted fuzzy chenille wire flower bouquet wrapped in premium Korean wrapping paper. Features customizable colors and lovely floral blooms.',
    is_ready_made: true,
    ready_made_stock: 10,
    is_bestseller: true,
    photo_url: defaultPhotos.bouquet,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Yellow', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Blue', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Fairy LED Light', price: 35 },
          { name: 'Gift Packaging', price: 30 },
          { name: 'Complete Gift Bundle (Card + Ribbon + LED + Packaging)', price: 85 },
        ],
      },
    ],
  },
  {
    name: 'Mini Bouquet',
    slug: 'fuzzy-mini-bouquet',
    category_slug: 'bouquets',
    base_price: 120,
    description: 'Petite fuzzy wire flower bouquet. A sweet, charming token for desks, gifts, and special small surprises.',
    is_ready_made: true,
    ready_made_stock: 15,
    is_bestseller: true,
    photo_url: defaultPhotos.bouquet,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Yellow', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Single Flower',
    slug: 'fuzzy-single-flower',
    category_slug: 'bouquets',
    base_price: 60,
    description: 'Single bloom fuzzy wire stem (Rose / Tulip / Sunflower / Daisy) wrapped delicately with a satin bow.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: false,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Flower Type',
        is_required: true,
        choices: [
          { name: 'Rose', price: 0 },
          { name: 'Tulip', price: 0 },
          { name: 'Sunflower', price: 0 },
          { name: 'Daisy', price: 0 },
        ],
      },
      {
        option_name: 'Color',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Yellow', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Blue', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
        ],
      },
    ],
  },
  {
    name: 'Flower Mirror',
    slug: 'fuzzy-flower-mirror',
    category_slug: 'custom-gifts',
    base_price: 250,
    description: 'Aesthetic wavy floral mirror lined with handmade fuzzy wire petals. A stunning centerpiece for vanity tables.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    photo_url: defaultPhotos.gift,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Flower Keychain',
    slug: 'fuzzy-flower-keychain',
    category_slug: 'custom-gifts',
    base_price: 80,
    description: 'Cute fuzzy wire flower charm keychain with sturdy clasp for bags, keys, and backpacks.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: true,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Mini Flower Pot',
    slug: 'fuzzy-mini-flower-pot',
    category_slug: 'custom-gifts',
    base_price: 150,
    description: 'Handcrafted fuzzy flower potted in a cute miniature pot. Never withers, perfect desk decor.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    photo_url: defaultPhotos.gift,
    options: [
      {
        option_name: 'Flower Type',
        is_required: true,
        choices: [
          { name: 'Rose', price: 0 },
          { name: 'Tulip', price: 0 },
          { name: 'Sunflower', price: 0 },
          { name: 'Daisy', price: 0 },
          { name: 'Mixed Bloom', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Mini Flower Basket',
    slug: 'fuzzy-mini-flower-basket',
    category_slug: 'bouquets',
    base_price: 180,
    description: 'Rustic miniature woven basket overflowing with colorful handmade fuzzy pipe cleaner blossoms.',
    is_ready_made: true,
    ready_made_stock: 10,
    is_bestseller: false,
    photo_url: defaultPhotos.bouquet,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Flower Pen',
    slug: 'fuzzy-flower-pen',
    category_slug: 'custom-gifts',
    base_price: 60,
    description: 'Smooth writing ballpoint pen topped with a blooming fuzzy wire flower topper.',
    is_ready_made: true,
    ready_made_stock: 25,
    is_bestseller: false,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Blue', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Flower Bookmark',
    slug: 'fuzzy-flower-bookmark',
    category_slug: 'custom-gifts',
    base_price: 50,
    description: 'Handmade floral wire bookmark with elegant clip and ribbon tail for book lovers.',
    is_ready_made: true,
    ready_made_stock: 25,
    is_bestseller: false,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Blue', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Flower Phone Charm',
    slug: 'fuzzy-flower-phone-charm',
    category_slug: 'custom-gifts',
    base_price: 60,
    description: 'Trendy pastel floral phone strap with beaded accents and velvet-touch fuzzy blossom charm.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: false,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Color / Theme',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'White', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Blue', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Mini Flower Set',
    slug: 'fuzzy-mini-flower-set',
    category_slug: 'bouquets',
    base_price: 180,
    description: 'Curated bundle of mini fuzzy wire flower stems arranged together with decorative wrapper.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    photo_url: defaultPhotos.bouquet,
    options: [
      {
        option_name: 'Bundle Size',
        is_required: true,
        choices: [
          { name: '3 Flowers', price: 0 },
          { name: '5 Flowers', price: 70 },
          { name: 'Mixed Flower Garden (7 Flowers)', price: 120 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Flower Gift Set',
    slug: 'fuzzy-flower-gift-set',
    category_slug: 'custom-gifts',
    base_price: 300,
    description: 'Complete boxed gift set featuring a flower bouquet, mini flower accessory, and premium presentation.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    photo_url: defaultPhotos.gift,
    options: [
      {
        option_name: 'Theme',
        is_required: true,
        choices: [
          { name: 'Pink Theme', price: 0 },
          { name: 'Red Theme', price: 0 },
          { name: 'Pastel Theme', price: 0 },
          { name: 'Mixed Theme', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Fairy LED Light', price: 35 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Customized Bouquet',
    slug: 'fuzzy-customized-bouquet',
    category_slug: 'bouquets',
    base_price: 450,
    description: 'Fully personalized fuzzy wire bouquet tailored to your desired color combination, stem count, and floral variety.',
    is_ready_made: false,
    ready_made_stock: 5,
    is_bestseller: true,
    photo_url: defaultPhotos.bouquet,
    options: [
      {
        option_name: 'Size',
        is_required: true,
        choices: [
          { name: '6 Stems', price: 0 },
          { name: '10 Stems', price: 200 },
          { name: '15 Stems', price: 400 },
        ],
      },
      {
        option_name: 'Color',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'Pastel', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Yellow', price: 0 },
          { name: 'Blue', price: 0 },
          { name: 'Mixed Colors', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Fairy Lights', price: 35 },
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Customized Mini Pot',
    slug: 'fuzzy-customized-mini-pot',
    category_slug: 'custom-gifts',
    base_price: 200,
    description: 'Custom potted fuzzy flower arrangement where you choose the flower variety, colors, and pot styling.',
    is_ready_made: false,
    ready_made_stock: 10,
    is_bestseller: false,
    photo_url: defaultPhotos.gift,
    options: [
      {
        option_name: 'Flower Combination',
        is_required: true,
        choices: [
          { name: 'Rose & Tulip Mix', price: 0 },
          { name: 'Sunflower Duo', price: 0 },
          { name: 'Custom Choice', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
  {
    name: 'Customized Keychain',
    slug: 'fuzzy-customized-keychain',
    category_slug: 'custom-gifts',
    base_price: 100,
    description: 'Custom personalized fuzzy wire keychain made with your choice of charm design, colors, and initials.',
    is_ready_made: false,
    ready_made_stock: 15,
    is_bestseller: false,
    photo_url: defaultPhotos.craft,
    options: [
      {
        option_name: 'Design Style',
        is_required: true,
        choices: [
          { name: 'Single Blossom', price: 0 },
          { name: 'Flower Pair', price: 0 },
          { name: 'Flower with Leaf Charm', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Packaging', price: 30 },
        ],
      },
    ],
  },
];

async function seedMasterProducts() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL...');

  // 1. Fetch Categories
  const catRes = await client.query('SELECT id, slug FROM categories');
  const catMap = {};
  catRes.rows.forEach(c => { catMap[c.slug] = c.id; });

  // 2. Clear old products to make way for the clean Master List
  await client.query('DELETE FROM product_photos');
  await client.query('DELETE FROM product_options');
  await client.query('DELETE FROM products');
  console.log('Cleared existing products table.');

  // 3. Insert the 15 Master Products
  for (let i = 0; i < masterProducts.length; i++) {
    const p = masterProducts[i];
    const categoryId = catMap[p.category_slug] || catMap['bouquets'] || catMap['custom-gifts'] || catRes.rows[0].id;

    const prodInsert = await client.query(
      `INSERT INTO products (
        category_id, name, slug, description, base_price,
        pricing_method, markup_value, is_available, is_bestseller,
        is_ready_made, ready_made_stock, is_on_sale, is_sold_out, display_order
      ) VALUES (
        $1, $2, $3, $4, $5,
        'fixed', 1.0, true, $6,
        $7, $8, false, false, $9
      ) RETURNING id`,
      [
        categoryId,
        p.name,
        p.slug,
        p.description,
        p.base_price,
        p.is_bestseller,
        p.is_ready_made,
        p.ready_made_stock,
        i + 1,
      ]
    );

    const productId = prodInsert.rows[0].id;
    console.log(`+ Added Product #${i + 1}: ${p.name} (${p.slug}) - ₱${p.base_price}`);

    // Insert Photo
    await client.query(
      `INSERT INTO product_photos (product_id, storage_path, url, is_cover, display_order)
       VALUES ($1, $2, $3, true, 1)`,
      [productId, `placeholders/${p.slug}.jpg`, p.photo_url]
    );

    // Insert Options
    if (p.options && p.options.length > 0) {
      for (let j = 0; j < p.options.length; j++) {
        const opt = p.options[j];
        await client.query(
          `INSERT INTO product_options (product_id, option_name, choices, is_required, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, opt.option_name, JSON.stringify(opt.choices), opt.is_required, j + 1]
        );
      }
    }
  }

  const finalCount = await client.query('SELECT count(*) FROM products');
  const finalPhotos = await client.query('SELECT count(*) FROM product_photos');
  const finalOptions = await client.query('SELECT count(*) FROM product_options');

  console.log(`\n🎉 Success! Seeded ${finalCount.rows[0].count} Products, ${finalPhotos.rows[0].count} Photos, ${finalOptions.rows[0].count} Options sets!`);

  await client.end();
}

seedMasterProducts().catch(err => {
  console.error('Error seeding master products:', err);
  process.exit(1);
});
