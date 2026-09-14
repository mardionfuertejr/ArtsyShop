const { Client } = require('pg');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const defaultPlaceholders = {
  bouquets: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80',
  crochet: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
  'resin-art': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  'custom-gifts': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
};

const fuzzyProductsData = [
  // ── 1. FUZZY BOUQUETS (8 items) ──
  {
    name: 'Fuzzy Tulip Single Stem',
    slug: 'fuzzy-tulip-single-stem',
    category_slug: 'bouquets',
    base_price: 120,
    description: 'Single stem fuzzy wire tulip in colorful pastel shades with Korean style wrapper.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    options: [
      {
        option_name: 'Tulip Color',
        is_required: true,
        choices: [
          { name: 'Pastel Pink', price: 0 },
          { name: 'Butter Yellow', price: 0 },
          { name: 'Lavender Purple', price: 0 },
          { name: 'Sky Blue', price: 0 },
          { name: 'Cream White', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy 3-Stem Tulip Bouquet',
    slug: 'fuzzy-3-stem-tulip-bouquet',
    category_slug: 'bouquets',
    base_price: 290,
    description: '3-piece fuzzy pipe cleaner tulip bouquet with layered wrapping and satin ribbon.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: true,
    options: [
      {
        option_name: 'Color Mix',
        is_required: true,
        choices: [
          { name: 'Pink, Cream & Yellow', price: 0 },
          { name: 'Purple, Blue & White', price: 0 },
          { name: 'Monochrome Pink', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Sunflower Bouquet',
    slug: 'fuzzy-sunflower-bouquet',
    category_slug: 'bouquets',
    base_price: 350,
    description: 'Vibrant fuzzy chenille sunflower bouquet with cute green leaves and warm brown kraft wrapper.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: true,
    options: [
      {
        option_name: 'Wrapper Style',
        is_required: false,
        choices: [
          { name: 'Vintage Brown Kraft', price: 0 },
          { name: 'Matte Black Aesthetic', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Rose Single Bloom',
    slug: 'fuzzy-rose-single-bloom',
    category_slug: 'bouquets',
    base_price: 150,
    description: 'Soft velvet-touch fuzzy pipe cleaner rose wrapped with a bow, perfect as a sweet gift.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: false,
    options: [
      {
        option_name: 'Rose Color',
        is_required: true,
        choices: [
          { name: 'Classic Red', price: 0 },
          { name: 'Baby Pink', price: 0 },
          { name: 'Royal Blue', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy 6-Stem Rose Bouquet',
    slug: 'fuzzy-6-stem-rose-bouquet',
    category_slug: 'bouquets',
    base_price: 550,
    description: 'Full handcrafted 6-stem fuzzy rose bouquet in Korean multi-layer wrap.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Fairy Lights',
        is_required: false,
        choices: [
          { name: 'With Warm LED Fairy Lights', price: 50 },
          { name: 'No Lights', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Daisy Bouquet',
    slug: 'fuzzy-daisy-bouquet',
    category_slug: 'bouquets',
    base_price: 280,
    description: 'Bright and cheery white & yellow fuzzy daisy bunch wrapped with aesthetic ribbon.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Lavender Bunch',
    slug: 'fuzzy-lavender-bunch',
    category_slug: 'bouquets',
    base_price: 320,
    description: 'Delicate textured fuzzy wire lavender bouquet with soft lilac wrapping and bow.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Mini Graduation Bouquet',
    slug: 'fuzzy-mini-graduation-bouquet',
    category_slug: 'bouquets',
    base_price: 250,
    description: 'Cute mini fuzzy flower bouquet with a miniature graduation cap and diploma roll.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: true,
    options: [
      {
        option_name: 'Cap Tassel Color',
        is_required: false,
        choices: [
          { name: 'Gold Tassel', price: 0 },
          { name: 'Red Tassel', price: 0 },
          { name: 'Blue Tassel', price: 0 },
        ],
      },
    ],
  },

  // ── 2. FUZZY MIRRORS & FRAMES (4 items) ──
  {
    name: 'Fuzzy Flower Cloud Mirror',
    slug: 'fuzzy-flower-cloud-mirror',
    category_slug: 'custom-gifts',
    base_price: 450,
    description: 'Aesthetic tabletop vanity mirror framed with puffy handcrafted fuzzy wire cloud flowers.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Flower Color Theme',
        is_required: true,
        choices: [
          { name: 'Pastel Dream (Pink, Cream, Lilac)', price: 0 },
          { name: 'Sunflower Bloom (Yellow & Green)', price: 0 },
          { name: 'Sky Cloud (Blue & White)', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Daisy Round Mirror',
    slug: 'fuzzy-daisy-round-mirror',
    category_slug: 'custom-gifts',
    base_price: 380,
    description: 'Round desk vanity mirror adorned with adorable handcrafted fuzzy daisies all around the border.',
    is_ready_made: true,
    ready_made_stock: 2,
    is_bestseller: true,
    options: [],
  },
  {
    name: 'Fuzzy Tulip Waved Mirror',
    slug: 'fuzzy-tulip-waved-mirror',
    category_slug: 'custom-gifts',
    base_price: 420,
    description: 'Wavy aesthetic mirror surrounded by blooming fuzzy wire tulips and greenery.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Polaroid Photo Frame',
    slug: 'fuzzy-polaroid-photo-frame',
    category_slug: 'custom-gifts',
    base_price: 220,
    description: 'Mini tabletop photo frame with puffy fuzzy flower borders designed for Instax & polaroid prints.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: false,
    options: [
      {
        option_name: 'Frame Color',
        is_required: true,
        choices: [
          { name: 'Blush Pink Flowers', price: 0 },
          { name: 'Butter Yellow Daisies', price: 0 },
          { name: 'Matcha Green Florals', price: 0 },
        ],
      },
    ],
  },

  // ── 3. FUZZY KEYCHAINS & CHARMS (8 items) ──
  {
    name: 'Fuzzy Bunny Keychain',
    slug: 'fuzzy-bunny-keychain',
    category_slug: 'crochet',
    base_price: 120,
    description: 'Fluffy handmade fuzzy wire bunny with ribbon bow tie and durable metal clasp.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    options: [
      {
        option_name: 'Bunny Color',
        is_required: true,
        choices: [
          { name: 'Snow White', price: 0 },
          { name: 'Pastel Pink', price: 0 },
          { name: 'Caramel Brown', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Teddy Bear Keychain',
    slug: 'fuzzy-teddy-bear-keychain',
    category_slug: 'crochet',
    base_price: 130,
    description: 'Hand-shaped fuzzy pipe cleaner teddy bear charm with cute button nose.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: true,
    options: [
      {
        option_name: 'Bear Color',
        is_required: true,
        choices: [
          { name: 'Milk Tea Brown', price: 0 },
          { name: 'Cream Beige', price: 0 },
          { name: 'Chocolate Brown', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Puppy Dog Keychain',
    slug: 'fuzzy-puppy-dog-keychain',
    category_slug: 'crochet',
    base_price: 130,
    description: 'Fluffy fuzzy wire puppy charm with cute floppy ears and mini collar.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Strawberry Keychain',
    slug: 'fuzzy-strawberry-keychain',
    category_slug: 'crochet',
    base_price: 110,
    description: 'Sweet handmade fuzzy strawberry charm with tiny green leaves and mini bell.',
    is_ready_made: true,
    ready_made_stock: 7,
    is_bestseller: true,
    options: [
      {
        option_name: 'Strawberry Color',
        is_required: true,
        choices: [
          { name: 'Classic Red', price: 0 },
          { name: 'Pastel Pink', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Duckling Keychain',
    slug: 'fuzzy-duckling-keychain',
    category_slug: 'crochet',
    base_price: 110,
    description: 'Cute bright yellow fuzzy duckling bag charm with tiny orange beak.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Butterfly Bag Charm',
    slug: 'fuzzy-butterfly-bag-charm',
    category_slug: 'crochet',
    base_price: 120,
    description: 'Handcrafted colorful fuzzy wire butterfly bag charm with faux pearl drop.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: false,
    options: [
      {
        option_name: 'Wing Color',
        is_required: true,
        choices: [
          { name: 'Lilac & Pink', price: 0 },
          { name: 'Cyan & White', price: 0 },
          { name: 'Peach & Yellow', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Heart Couple Keychains',
    slug: 'fuzzy-heart-couple-keychains',
    category_slug: 'crochet',
    base_price: 160,
    description: 'Pair of matching puffy fuzzy pipe cleaner hearts for couples and best friends.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: true,
    options: [
      {
        option_name: 'Color Pair',
        is_required: true,
        choices: [
          { name: 'Red & Pink', price: 0 },
          { name: 'Blue & White', price: 0 },
          { name: 'Black & Red', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Initial Letter Keychain',
    slug: 'fuzzy-initial-letter-keychain',
    category_slug: 'resin-art',
    base_price: 140,
    description: 'Personalized fuzzy wire alphabet monogram keychain with mini floral accent.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Wire Color',
        is_required: true,
        choices: [
          { name: 'Rose Pink', price: 0 },
          { name: 'Lavender', price: 0 },
          { name: 'Sky Blue', price: 0 },
          { name: 'Lemon Yellow', price: 0 },
          { name: 'Mint Green', price: 0 },
        ],
      },
    ],
  },

  // ── 4. OTHER FUZZY HANDICRAFTS (5 items) ──
  {
    name: 'Fuzzy Mini Potted Sunflower',
    slug: 'fuzzy-mini-potted-sunflower',
    category_slug: 'resin-art',
    base_price: 220,
    description: 'Everlasting cheerful fuzzy wire sunflower nestled in a miniature desk pot.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: true,
    options: [],
  },
  {
    name: 'Fuzzy Potted Cactus',
    slug: 'fuzzy-potted-cactus',
    category_slug: 'resin-art',
    base_price: 190,
    description: 'Cute zero-maintenance fuzzy pipe cleaner cactus with a tiny pink flower on top.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Fuzzy Flower Hair Claw Clip',
    slug: 'fuzzy-flower-hair-claw-clip',
    category_slug: 'resin-art',
    base_price: 150,
    description: 'Trendy Korean-style matte hair claw clip decorated with handcrafted fuzzy flower blooms.',
    is_ready_made: true,
    ready_made_stock: 7,
    is_bestseller: true,
    options: [
      {
        option_name: 'Clip Style',
        is_required: true,
        choices: [
          { name: 'Pink & White Daisies', price: 0 },
          { name: 'Yellow Sunflowers', price: 0 },
          { name: 'Purple Tulips', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Flower Pen Topper',
    slug: 'fuzzy-flower-pen-topper',
    category_slug: 'resin-art',
    base_price: 85,
    description: 'Smooth black gel pen topped with a vibrant handcrafted fuzzy tulip or sunflower bloom.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    options: [
      {
        option_name: 'Flower Type',
        is_required: true,
        choices: [
          { name: 'Pink Tulip', price: 0 },
          { name: 'Yellow Sunflower', price: 0 },
          { name: 'White Daisy', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Fuzzy Flower Headband',
    slug: 'fuzzy-flower-headband',
    category_slug: 'custom-gifts',
    base_price: 180,
    description: 'Comfortable flexible hair headband adorned with soft handcrafted fuzzy flowers and leaves.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: false,
    options: [],
  },
];

async function seedFuzzy25Products() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase DB. Replacing catalog with 25 Fuzzy Craft products...');

  try {
    // 1. Truncate existing products, photos, options
    await client.query('TRUNCATE TABLE public.product_photos, public.product_options, public.products CASCADE;');
    console.log('Cleared previous products.');

    // 2. Fetch categories map
    const catRes = await client.query('SELECT id, slug FROM public.categories;');
    const catMap = {};
    catRes.rows.forEach((r) => {
      catMap[r.slug] = r.id;
    });

    // 3. Insert fuzzy products
    let displayOrder = 1;
    for (const p of fuzzyProductsData) {
      const categoryId = catMap[p.category_slug] || catMap['bouquets'];
      const placeholderImg = defaultPlaceholders[p.category_slug] || defaultPlaceholders.bouquets;

      const insertProdQuery = `
        INSERT INTO public.products (
          category_id, name, slug, description, base_price,
          pricing_method, markup_value, is_available, is_bestseller,
          is_ready_made, ready_made_stock, is_sold_out, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id;
      `;

      const prodRes = await client.query(insertProdQuery, [
        categoryId,
        p.name,
        p.slug,
        p.description,
        p.base_price,
        'markup',
        1.5,
        true,
        Boolean(p.is_bestseller),
        Boolean(p.is_ready_made),
        p.ready_made_stock || 0,
        false,
        displayOrder++,
      ]);

      const productId = prodRes.rows[0].id;

      // Insert cover photo with placeholder URL
      await client.query(
        `INSERT INTO public.product_photos (product_id, storage_path, url, is_cover, display_order)
         VALUES ($1, $2, $3, $4, $5);`,
        [productId, `placeholders/${p.slug}.jpg`, placeholderImg, true, 1]
      );

      // Insert options
      if (p.options && p.options.length > 0) {
        let optOrder = 1;
        for (const opt of p.options) {
          await client.query(
            `INSERT INTO public.product_options (product_id, option_name, choices, is_required, display_order)
             VALUES ($1, $2, $3, $4, $5);`,
            [productId, opt.option_name, JSON.stringify(opt.choices), Boolean(opt.is_required), optOrder++]
          );
        }
      }

      console.log(`✅ [${displayOrder - 1}/25] Inserted: ${p.name} (₱${p.base_price})`);
    }

    const countRes = await client.query('SELECT count(*) FROM public.products;');
    console.log(`\n🎉 Successfully inserted ${countRes.rows[0].count} Fuzzy Craft products into Supabase!`);
  } catch (err) {
    console.error('Error seeding fuzzy products:', err);
  } finally {
    await client.end();
  }
}

seedFuzzy25Products();
