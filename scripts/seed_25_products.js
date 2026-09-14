const { Client } = require('pg');

const connectionString = 'postgresql://postgres.fqubsupqkorxfgohartk:TpGNT8Nd2pnZoF47@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const defaultPlaceholders = {
  bouquets: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80',
  crochet: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
  'resin-art': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  'custom-gifts': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
};

const productsData = [
  // ── 1. BOUQUETS (7 items) ──
  {
    name: 'Satin Ribbon Single Rose',
    slug: 'satin-ribbon-single-rose',
    category_slug: 'bouquets',
    base_price: 150,
    description: 'Elegantly handcrafted single satin ribbon rose with Korean wrapper and ribbon accent.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: true,
    options: [
      {
        option_name: 'Rose Color',
        is_required: true,
        choices: [
          { name: 'Crimson Red', price: 0 },
          { name: 'Blush Pink', price: 0 },
          { name: 'Royal Blue', price: 0 },
          { name: 'Lavender', price: 0 },
        ],
      },
      {
        option_name: 'Wrapper Style',
        is_required: false,
        choices: [
          { name: 'Classic Black Matte', price: 0 },
          { name: 'Cream Korean Wrap', price: 0 },
          { name: 'Kraft Vintage', price: 0 },
        ],
      },
    ],
  },
  {
    name: '3-Stem Satin Rose Trio',
    slug: '3-stem-satin-rose-trio',
    category_slug: 'bouquets',
    base_price: 350,
    description: 'Charming 3-stem satin ribbon rose bouquet arranged with filler greenery and satin bow.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: false,
    options: [
      {
        option_name: 'Color Palette',
        is_required: true,
        choices: [
          { name: 'All Red', price: 0 },
          { name: 'Pink & White Ombre', price: 0 },
          { name: 'Lilac & Champagne', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Grand 12-Stem Ribbon Bouquet',
    slug: 'grand-12-stem-ribbon-bouquet',
    category_slug: 'bouquets',
    base_price: 950,
    description: 'Luxurious dozen satin ribbon roses nestled in layered premium wrapping with pearls and fairy lights.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Primary Theme',
        is_required: true,
        choices: [
          { name: 'Ruby Romance (Red & Gold)', price: 0 },
          { name: 'Fairy Blossom (Pastel Pink)', price: 0 },
          { name: 'Midnight Starlight (Navy & Silver)', price: 0 },
        ],
      },
      {
        option_name: 'Add-on Lights',
        is_required: false,
        choices: [
          { name: 'With Warm Fairy Lights', price: 60 },
          { name: 'No Lights', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Eternal Sunflower & Daisy Bundle',
    slug: 'eternal-sunflower-daisy-bundle',
    category_slug: 'bouquets',
    base_price: 480,
    description: 'Bright and cheerful handcrafted satin sunflower paired with 2 white daisies and eucalyptus leaves.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: true,
    options: [
      {
        option_name: 'Wrapper Color',
        is_required: false,
        choices: [
          { name: 'Warm Kraft Brown', price: 0 },
          { name: 'Pastel Yellow & White', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Pastel Tulip Garden Bouquet',
    slug: 'pastel-tulip-garden-bouquet',
    category_slug: 'bouquets',
    base_price: 650,
    description: 'Delicate 5-stem handmade satin tulip bouquet in soft spring pastel tones with organza ribbon.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: false,
    options: [
      {
        option_name: 'Tulip Color Set',
        is_required: true,
        choices: [
          { name: 'Pastel Sunset (Peach, Cream, Pink)', price: 0 },
          { name: 'Spring Lavender (Purple, White, Blue)', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Butterfly Glow Fairy Bouquet',
    slug: 'butterfly-glow-fairy-bouquet',
    category_slug: 'bouquets',
    base_price: 520,
    description: 'Enchanting illuminated bouquet with satin roses and 3D fluttering holographic butterflies with LED string.',
    is_ready_made: true,
    ready_made_stock: 2,
    is_bestseller: true,
    options: [
      {
        option_name: 'Butterfly Tone',
        is_required: true,
        choices: [
          { name: 'Gold Holographic', price: 0 },
          { name: 'Rose Gold Shimmer', price: 0 },
          { name: 'Silver Starlight', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Mini Bud & Pearl Pocket Bouquet',
    slug: 'mini-bud-pearl-pocket-bouquet',
    category_slug: 'bouquets',
    base_price: 220,
    description: 'Compact cute single bloom bouquet with faux pearl embellishments, perfect for graduation or desk decor.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: false,
    options: [],
  },

  // ── 2. CROCHET (7 items) ──
  {
    name: 'Crochet Mini Potted Sunflower',
    slug: 'crochet-mini-potted-sunflower',
    category_slug: 'crochet',
    base_price: 280,
    description: 'Adorable handmade crochet sunflower in a sturdy miniature yarn pot. Stays forever blooming!',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: true,
    options: [
      {
        option_name: 'Pot Style',
        is_required: false,
        choices: [
          { name: 'Terracotta Brown Pot', price: 0 },
          { name: 'Cream Oatmeal Pot', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Crochet Tulip Single Stem',
    slug: 'crochet-tulip-single-stem',
    category_slug: 'crochet',
    base_price: 120,
    description: 'Fine milk-cotton yarn crochet tulip on a flexible wire stem. Great as a desk buddy or single gift.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: false,
    options: [
      {
        option_name: 'Yarn Color',
        is_required: true,
        choices: [
          { name: 'Soft Coral Pink', price: 0 },
          { name: 'Sunny Yellow', price: 0 },
          { name: 'Pure White', price: 0 },
          { name: 'Sky Blue', price: 0 },
          { name: 'Taro Purple', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Amigurumi Teddy Bear Charm',
    slug: 'amigurumi-teddy-bear-charm',
    category_slug: 'crochet',
    base_price: 190,
    description: 'Hand-crocheted mini teddy bear with tiny bow tie and durable gold metal keyring clasp.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: true,
    options: [
      {
        option_name: 'Bear Color',
        is_required: true,
        choices: [
          { name: 'Honey Brown', price: 0 },
          { name: 'Milk White', price: 0 },
          { name: 'Caramel Latte', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Crochet Strawberry Trinket Pouch',
    slug: 'crochet-strawberry-trinket-pouch',
    category_slug: 'crochet',
    base_price: 260,
    description: 'Cute draw-string coin and jewelry pouch shaped like a juicy sweet strawberry with green leafy rim.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Crochet Daisy Coaster (Set of 2)',
    slug: 'crochet-daisy-coaster-set-of-2',
    category_slug: 'crochet',
    base_price: 240,
    description: 'Thick and heat-absorbent 100% cotton floral coasters designed to brighten your coffee desk.',
    is_ready_made: true,
    ready_made_stock: 6,
    is_bestseller: false,
    options: [
      {
        option_name: 'Center Color',
        is_required: false,
        choices: [
          { name: 'Classic Yellow Center', price: 0 },
          { name: 'Pastel Pink Center', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Crochet Heart Couple Keychains',
    slug: 'crochet-heart-couple-keychains',
    category_slug: 'crochet',
    base_price: 220,
    description: 'Matching pair of plush crochet heart keychains with initial metal letters and lobster clasps.',
    is_ready_made: true,
    ready_made_stock: 4,
    is_bestseller: true,
    options: [
      {
        option_name: 'Color Pair',
        is_required: true,
        choices: [
          { name: 'Red & Pink', price: 0 },
          { name: 'Navy & Sky Blue', price: 0 },
          { name: 'Black & White', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Crochet Lavender Sprig Stem',
    slug: 'crochet-lavender-sprig-stem',
    category_slug: 'crochet',
    base_price: 130,
    description: 'Detailed textured crochet lavender bloom with leaves on a bendable stem. Scent-friendly yarn!',
    is_ready_made: true,
    ready_made_stock: 10,
    is_bestseller: false,
    options: [],
  },

  // ── 3. RESIN ART (6 items) ──
  {
    name: 'Floral Initial Resin Letter Keychain',
    slug: 'floral-initial-resin-letter-keychain',
    category_slug: 'resin-art',
    base_price: 180,
    description: 'Crystal-clear epoxy resin letter with real preserved baby breath flowers and shimmering gold leaf flakes.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Foil Style',
        is_required: true,
        choices: [
          { name: '24K Gold Leaf', price: 0 },
          { name: 'Rose Gold Flakes', price: 0 },
          { name: 'Silver Leaf', price: 0 },
        ],
      },
      {
        option_name: 'Flower Tone',
        is_required: true,
        choices: [
          { name: 'Baby Pink', price: 0 },
          { name: 'Royal Violet', price: 0 },
          { name: 'Ocean Cyan', price: 0 },
          { name: 'Pure White', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Gold Flake Resin Bookmark',
    slug: 'gold-flake-resin-bookmark',
    category_slug: 'resin-art',
    base_price: 160,
    description: 'Slim, smooth resin bookmark with preserved pressed petals and a matching silky tassel fringe.',
    is_ready_made: true,
    ready_made_stock: 7,
    is_bestseller: false,
    options: [
      {
        option_name: 'Tassel Color',
        is_required: false,
        choices: [
          { name: 'Champagne Gold', price: 0 },
          { name: 'Blush Pink', price: 0 },
          { name: 'Emerald Green', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Ocean Wave Resin Geode Coaster',
    slug: 'ocean-wave-resin-geode-coaster',
    category_slug: 'resin-art',
    base_price: 250,
    description: 'Hand-poured 3D ocean wave effect coaster with genuine crushed crystals and gold gilded edge.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: true,
    options: [],
  },
  {
    name: 'Preserved Floral Resin Jewelry Dish',
    slug: 'preserved-floral-resin-jewelry-dish',
    category_slug: 'resin-art',
    base_price: 380,
    description: 'Hexagon or round trinket tray for rings and accessories made with cured crystal epoxy and dried botanicals.',
    is_ready_made: true,
    ready_made_stock: 2,
    is_bestseller: false,
    options: [
      {
        option_name: 'Shape',
        is_required: true,
        choices: [
          { name: 'Hexagon Dish (10cm)', price: 0 },
          { name: 'Round Dish (11cm)', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Glow-in-the-Dark Cosmic Pendant',
    slug: 'glow-in-the-dark-cosmic-pendant',
    category_slug: 'resin-art',
    base_price: 210,
    description: 'Galaxy-inspired resin pendant necklace that charges with light and gently glows neon blue in the dark.',
    is_ready_made: true,
    ready_made_stock: 5,
    is_bestseller: false,
    options: [
      {
        option_name: 'Chain Type',
        is_required: true,
        choices: [
          { name: 'Black Wax Cord', price: 0 },
          { name: 'Silver Stainless Chain', price: 40 },
        ],
      },
    ],
  },
  {
    name: 'Floral Resin Comb with Gold Foil',
    slug: 'floral-resin-comb-with-gold-foil',
    category_slug: 'resin-art',
    base_price: 290,
    description: 'Stunning handcrafted resin hair comb with encased pressed wildflowers and anti-static teeth.',
    is_ready_made: true,
    ready_made_stock: 3,
    is_bestseller: false,
    options: [],
  },

  // ── 4. CUSTOM GIFTS (5 items) ──
  {
    name: 'Custom Acrylic Song Plaque with Stand',
    slug: 'custom-acrylic-song-plaque-with-stand',
    category_slug: 'custom-gifts',
    base_price: 399,
    description: 'Clear UV-printed acrylic plaque featuring your favorite song title, artist, and scannable code on wooden stand.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [
      {
        option_name: 'Stand Option',
        is_required: true,
        choices: [
          { name: 'Natural Solid Wood Stand', price: 0 },
          { name: 'LED Warm Light Wooden Stand', price: 120 },
        ],
      },
    ],
  },
  {
    name: 'Personalized Photo Keepsake Box',
    slug: 'personalized-photo-keepsake-box',
    category_slug: 'custom-gifts',
    base_price: 450,
    description: 'Handcrafted gift box with custom engraved lid name, fairy lights, and shredded paper bed.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: false,
    options: [
      {
        option_name: 'Box Color',
        is_required: true,
        choices: [
          { name: 'Kraft Brown Vintage', price: 0 },
          { name: 'Midnight Black Luxury', price: 0 },
          { name: 'Pearl White Wedding', price: 0 },
        ],
      },
    ],
  },
  {
    name: 'Engraved Wooden Bookmark & Tassel',
    slug: 'engraved-wooden-bookmark-tassel',
    category_slug: 'custom-gifts',
    base_price: 140,
    description: 'Natural bamboo bookmark with precision laser-engraved floral patterns or custom name.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    options: [],
  },
  {
    name: 'Custom Polaroid Photo Magnet Set (4 pcs)',
    slug: 'custom-polaroid-photo-magnet-set-4-pcs',
    category_slug: 'custom-gifts',
    base_price: 180,
    description: 'Set of 4 water-resistant glossy mini photo magnets for ref or metal boards with custom captions.',
    is_ready_made: false,
    ready_made_stock: 0,
    is_bestseller: true,
    options: [],
  },
  {
    name: 'Handcrafted Greeting Card & Wax Seal',
    slug: 'handcrafted-greeting-card-wax-seal',
    category_slug: 'custom-gifts',
    base_price: 85,
    description: 'Vintage handmade paper greeting card with dried floral accent and authentic wax seal stamp.',
    is_ready_made: true,
    ready_made_stock: 15,
    is_bestseller: false,
    options: [
      {
        option_name: 'Occasion Stamp',
        is_required: false,
        choices: [
          { name: 'With Love (Heart Seal)', price: 0 },
          { name: 'Happy Birthday', price: 0 },
          { name: 'For You (Floral Seal)', price: 0 },
        ],
      },
    ],
  },
];

async function seed25Products() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Supabase DB for seeding 25 products.');

  try {
    // 1. Fetch categories map
    const catRes = await client.query('SELECT id, slug FROM public.categories;');
    const catMap = {};
    catRes.rows.forEach((r) => {
      catMap[r.slug] = r.id;
    });

    console.log('Found categories in DB:', catMap);

    // 2. Insert products
    let displayOrder = 1;
    for (const p of productsData) {
      const categoryId = catMap[p.category_slug] || null;
      const placeholderImg = defaultPlaceholders[p.category_slug] || defaultPlaceholders.bouquets;

      const insertProdQuery = `
        INSERT INTO public.products (
          category_id, name, slug, description, base_price,
          pricing_method, markup_value, is_available, is_bestseller,
          is_ready_made, ready_made_stock, is_sold_out, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          base_price = EXCLUDED.base_price,
          is_available = EXCLUDED.is_available,
          is_ready_made = EXCLUDED.is_ready_made,
          ready_made_stock = EXCLUDED.ready_made_stock,
          is_bestseller = EXCLUDED.is_bestseller
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

      // Delete existing photos & options to avoid duplicates
      await client.query('DELETE FROM public.product_photos WHERE product_id = $1;', [productId]);
      await client.query('DELETE FROM public.product_options WHERE product_id = $1;', [productId]);

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

      console.log(`✅ [${displayOrder - 1}/25] Inserted product: ${p.name} (₱${p.base_price})`);
    }

    const countRes = await client.query('SELECT count(*) FROM public.products;');
    console.log(`\n🎉 Total Products in Supabase: ${countRes.rows[0].count}`);
  } catch (err) {
    console.error('Error seeding products:', err);
  } finally {
    await client.end();
  }
}

seed25Products();
