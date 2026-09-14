/**
 * M&M Artsy Mock Data Layer
 * Clean baseline with raw materials and category structures.
 * Products are managed dynamically via Supabase Database and Admin Panel.
 */

export const MOCK_CATEGORIES = [
  { id: 'cat-bouquets', name: 'Bouquets', slug: 'bouquets', display_order: 1, is_active: true },
  { id: 'cat-crochet', name: 'Crochet', slug: 'crochet', display_order: 2, is_active: true },
  { id: 'cat-resin-art', name: 'Resin Art', slug: 'resin-art', display_order: 3, is_active: true },
  { id: 'cat-custom-gifts', name: 'Custom Gifts', slug: 'custom-gifts', display_order: 4, is_active: true },
];

export const MOCK_MATERIALS = [
  // ── 1. FUZZY WIRES (Chenille Stems) ──
  {
    id: 'mat-fuzzy-wire-white',
    name: 'Fuzzy Wire (White)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-pink',
    name: 'Fuzzy Wire (Pink)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-baby-pink',
    name: 'Fuzzy Wire (Baby Pink)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-red',
    name: 'Fuzzy Wire (Red)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-yellow',
    name: 'Fuzzy Wire (Yellow)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-purple',
    name: 'Fuzzy Wire (Purple)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-baby-blue',
    name: 'Fuzzy Wire (Baby Blue)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-fuzzy-wire-green',
    name: 'Fuzzy Wire (Green)',
    category: 'Chenille Stems',
    current_stock: 50,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },

  // ── 2. FLORAL SUPPLIES & HARDWARE ──
  {
    id: 'mat-floral-wire-green',
    name: 'Floral Wire (Green)',
    category: 'Floral Supplies',
    current_stock: 30,
    unit: 'pack',
    cost_per_unit: 75.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-floral-tape-green',
    name: 'Floral Tape (Green)',
    category: 'Floral Supplies',
    current_stock: 30,
    unit: 'roll',
    cost_per_unit: 20.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-floral-stamen-yellow',
    name: 'Floral Stamen (Yellow)',
    category: 'Floral Supplies',
    current_stock: 25,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-floral-stamen-white',
    name: 'Floral Stamen (White)',
    category: 'Floral Supplies',
    current_stock: 25,
    unit: 'pack',
    cost_per_unit: 35.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-pearl-beads-white',
    name: 'Pearl Beads (White)',
    category: 'Floral Supplies',
    current_stock: 25,
    unit: 'pack',
    cost_per_unit: 45.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-hot-glue-sticks-clear',
    name: 'Hot Glue Sticks (Clear)',
    category: 'Floral Supplies',
    current_stock: 40,
    unit: 'pack',
    cost_per_unit: 30.0,
    minimum_stock: 10,
  },

  // ── 3. WRAPPERS & RIBBONS ──
  {
    id: 'mat-bouquet-wrapper-white',
    name: 'Bouquet Wrapper (White)',
    category: 'Wrappers & Ribbons',
    current_stock: 50,
    unit: 'sheet',
    cost_per_unit: 15.0,
    minimum_stock: 15,
  },
  {
    id: 'mat-bouquet-wrapper-pink',
    name: 'Bouquet Wrapper (Pink)',
    category: 'Wrappers & Ribbons',
    current_stock: 50,
    unit: 'sheet',
    cost_per_unit: 15.0,
    minimum_stock: 15,
  },
  {
    id: 'mat-bouquet-wrapper-kraft',
    name: 'Bouquet Wrapper (Brown/Kraft)',
    category: 'Wrappers & Ribbons',
    current_stock: 50,
    unit: 'sheet',
    cost_per_unit: 15.0,
    minimum_stock: 15,
  },
  {
    id: 'mat-clear-bouquet-plastic',
    name: 'Clear Bouquet Plastic',
    category: 'Packaging',
    current_stock: 100,
    unit: 'pc',
    cost_per_unit: 5.0,
    minimum_stock: 20,
  },
  {
    id: 'mat-ribbon-white',
    name: 'Ribbon (White)',
    category: 'Wrappers & Ribbons',
    current_stock: 25,
    unit: 'roll',
    cost_per_unit: 75.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-ribbon-pink',
    name: 'Ribbon (Pink)',
    category: 'Wrappers & Ribbons',
    current_stock: 25,
    unit: 'roll',
    cost_per_unit: 75.0,
    minimum_stock: 10,
  },
  {
    id: 'mat-ribbon-red',
    name: 'Ribbon (Red)',
    category: 'Wrappers & Ribbons',
    current_stock: 25,
    unit: 'roll',
    cost_per_unit: 75.0,
    minimum_stock: 10,
  },

  // ── 4. TOOLS & EQUIPMENT ──
  {
    id: 'mat-glue-gun',
    name: 'Glue Gun',
    category: 'Floral Supplies',
    current_stock: 10,
    unit: 'pc',
    cost_per_unit: 115.0,
    minimum_stock: 2,
  },
  {
    id: 'mat-scissors',
    name: 'Scissors',
    category: 'Floral Supplies',
    current_stock: 10,
    unit: 'pc',
    cost_per_unit: 75.0,
    minimum_stock: 2,
  },
  {
    id: 'mat-small-pliers',
    name: 'Small Pliers',
    category: 'Floral Supplies',
    current_stock: 10,
    unit: 'pc',
    cost_per_unit: 75.0,
    minimum_stock: 2,
  },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-master-01',
    name: 'Flower Bouquet',
    slug: 'fuzzy-flower-bouquet',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 250,
    description: 'Handcrafted fuzzy chenille wire flower bouquet wrapped in premium Korean wrapping paper. Features customizable colors and lovely floral blooms.',
    is_ready_made: true,
    ready_made_stock: 10,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
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
    id: 'prod-master-02',
    name: 'Mini Bouquet',
    slug: 'fuzzy-mini-bouquet',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 120,
    description: 'Petite fuzzy wire flower bouquet. A sweet, charming token for desks, gifts, and special small surprises.',
    is_ready_made: true,
    ready_made_stock: 15,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
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
    id: 'prod-master-03',
    name: 'Single Flower',
    slug: 'fuzzy-single-flower',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 60,
    description: 'Single bloom fuzzy wire stem (Rose / Tulip / Sunflower / Daisy) wrapped delicately with a satin bow.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
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
    id: 'prod-master-04',
    name: 'Flower Mirror',
    slug: 'fuzzy-flower-mirror',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 250,
    description: 'Aesthetic wavy floral mirror lined with handmade fuzzy wire petals. A stunning centerpiece for vanity tables.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
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
    id: 'prod-master-05',
    name: 'Flower Keychain',
    slug: 'fuzzy-flower-keychain',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 80,
    description: 'Cute fuzzy wire flower charm keychain with sturdy clasp for bags, keys, and backpacks.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
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
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-06',
    name: 'Mini Flower Pot',
    slug: 'fuzzy-mini-flower-pot',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 150,
    description: 'Handcrafted fuzzy flower potted in a cute miniature pot. Never withers, perfect desk decor.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Flower',
        is_required: true,
        choices: [
          { name: 'Rose', price: 0 },
          { name: 'Tulip', price: 0 },
          { name: 'Sunflower', price: 0 },
          { name: 'Daisy', price: 0 },
          { name: 'Mixed Flowers', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-07',
    name: 'Mini Flower Basket',
    slug: 'fuzzy-mini-flower-basket',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 180,
    description: 'Rustic miniature woven basket overflowing with colorful handmade fuzzy pipe cleaner blossoms.',
    is_ready_made: true,
    ready_made_stock: 10,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
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
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-08',
    name: 'Flower Pen',
    slug: 'fuzzy-flower-pen',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 60,
    description: 'Smooth writing ballpoint pen topped with a blooming fuzzy wire flower topper.',
    is_ready_made: true,
    ready_made_stock: 25,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
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
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-09',
    name: 'Flower Bookmark',
    slug: 'fuzzy-flower-bookmark',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 50,
    description: 'Handmade floral wire bookmark with elegant clip and ribbon tail for book lovers.',
    is_ready_made: true,
    ready_made_stock: 25,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
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
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-10',
    name: 'Flower Phone Charm',
    slug: 'fuzzy-flower-phone-charm',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 60,
    description: 'Trendy pastel floral phone strap with beaded accents and velvet-touch fuzzy blossom charm.',
    is_ready_made: true,
    ready_made_stock: 20,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
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
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-11',
    name: 'Mini Flower Set',
    slug: 'fuzzy-mini-flower-set',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 180,
    description: 'Curated bundle of mini fuzzy wire flower stems arranged together with decorative wrapper.',
    is_ready_made: true,
    ready_made_stock: 12,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Size',
        is_required: true,
        choices: [
          { name: '3 Flowers', price: 0 },
          { name: '5 Flowers', price: 70 },
          { name: '7 Flowers', price: 120 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-12',
    name: 'Flower Gift Set',
    slug: 'fuzzy-flower-gift-set',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 300,
    description: 'Complete boxed gift set featuring a flower bouquet, mini flower accessory, and premium presentation.',
    is_ready_made: true,
    ready_made_stock: 8,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Color',
        is_required: true,
        choices: [
          { name: 'Pink', price: 0 },
          { name: 'Red', price: 0 },
          { name: 'Pastel', price: 0 },
          { name: 'Purple', price: 0 },
          { name: 'Yellow', price: 0 },
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
    id: 'prod-master-13',
    name: 'Customized Bouquet',
    slug: 'fuzzy-customized-bouquet',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    category: { name: 'Bouquets', slug: 'bouquets' },
    base_price: 450,
    description: 'Fully personalized fuzzy wire bouquet tailored to your desired color combination, stem count, and floral variety.',
    is_ready_made: false,
    ready_made_stock: 5,
    is_bestseller: true,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
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
    id: 'prod-master-14',
    name: 'Customized Mini Pot',
    slug: 'fuzzy-customized-mini-pot',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 200,
    description: 'Custom potted fuzzy flower arrangement where you choose the flower variety, colors, and pot styling.',
    is_ready_made: false,
    ready_made_stock: 10,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Flower',
        is_required: true,
        choices: [
          { name: 'Rose & Tulip', price: 0 },
          { name: 'Sunflower', price: 0 },
          { name: 'Daisy & Lavender', price: 0 },
          { name: 'Mixed Flowers', price: 0 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Ribbon', price: 15 },
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
  {
    id: 'prod-master-15',
    name: 'Customized Keychain',
    slug: 'fuzzy-customized-keychain',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    category: { name: 'Custom Gifts', slug: 'custom-gifts' },
    base_price: 100,
    description: 'Custom personalized fuzzy wire keychain made with your choice of charm design, colors, and initials.',
    is_ready_made: false,
    ready_made_stock: 15,
    is_bestseller: false,
    is_available: true,
    product_photos: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', is_cover: true }],
    product_options: [
      {
        option_name: 'Design',
        is_required: true,
        choices: [
          { name: '1 Flower', price: 0 },
          { name: '2 Flowers', price: 0 },
          { name: 'Flower with Leaf', price: 0 },
          { name: 'Initial Letter + Flower', price: 20 },
        ],
      },
      {
        option_name: 'Add-ons',
        is_required: false,
        choices: [
          { name: 'Message Card', price: 15 },
          { name: 'Gift Box', price: 30 },
        ],
      },
    ],
  },
];

export const MOCK_ORDERS = [];

export const MOCK_CUSTOM_REQUESTS = [];

export const MOCK_REVIEWS = [];

export const MOCK_FEEDBACKS = [];

// In-memory storage for active session submissions
let localReviews = [...MOCK_REVIEWS];
let localFeedbacks = [...MOCK_FEEDBACKS];
let localProducts = [...MOCK_PRODUCTS];
let localOrders = [...MOCK_ORDERS];
let localMaterials = [...MOCK_MATERIALS];

export function getMockReviewsByProductSlug(slug) {
  return localReviews.filter((r) => r.productSlug === slug && r.is_approved !== false);
}

export function getAllMockReviews() {
  return localReviews;
}

export function deleteMockReview(id) {
  localReviews = localReviews.filter((r) => r.id !== id);
  return localReviews;
}

export function toggleMockReviewApproval(id) {
  localReviews = localReviews.map((r) => {
    if (r.id === id) {
      return { ...r, is_approved: r.is_approved === false ? true : false };
    }
    return r;
  });
  return localReviews;
}

export function addMockReview(review) {
  const newReview = {
    id: `rev-${Date.now()}`,
    is_verified_buyer: true,
    is_approved: true,
    created_at: new Date().toISOString(),
    ...review,
  };
  localReviews = [newReview, ...localReviews];
  return newReview;
}

export function getMockFeedbacks() {
  return localFeedbacks;
}

export function deleteMockFeedback(id) {
  localFeedbacks = localFeedbacks.filter((f) => f.id !== id);
  return localFeedbacks;
}

export function addMockFeedback(feedback) {
  const newFeedback = {
    id: `fb-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...feedback,
  };
  localFeedbacks = [newFeedback, ...localFeedbacks];
  return newFeedback;
}

export function getMockProducts(categorySlug = 'all') {
  let list = [...localProducts];
  if (categorySlug && categorySlug !== 'all') {
    if (categorySlug === 'ready-made') {
      list = list.filter((p) => p.is_ready_made);
    } else {
      const matchedCat = localCategories.find((c) => c.slug === categorySlug || c.id === categorySlug);
      list = list.filter((p) =>
        p.category?.slug === categorySlug ||
        p.category_id === categorySlug ||
        (matchedCat && (p.category_id === matchedCat.id || p.category?.id === matchedCat.id))
      );
    }
  }

  // Always sort available/in-stock first, all sold out products to the end
  return list.sort((a, b) => {
    const aSold = Boolean(a.is_sold_out || (a.is_ready_made && a.ready_made_stock === 0));
    const bSold = Boolean(b.is_sold_out || (b.is_ready_made && b.ready_made_stock === 0));
    if (aSold && !bSold) return 1;
    if (!aSold && bSold) return -1;
    return (a.display_order || 99) - (b.display_order || 99);
  });
}

export function getMockReadyMadeProducts() {
  return localProducts.filter((p) => p.is_ready_made);
}

export function getMockProductBySlug(slug) {
  return localProducts.find((p) => p.slug === slug) || null;
}

export function saveMockProduct(productData) {
  const existingIdx = localProducts.findIndex((p) => p.id === productData.id || (p.slug && p.slug === productData.slug));
  if (existingIdx >= 0) {
    localProducts[existingIdx] = { ...localProducts[existingIdx], ...productData };
    return localProducts[existingIdx];
  } else {
    const newProd = {
      id: productData.id || `prod-${Date.now()}`,
      display_order: localProducts.length + 1,
      ...productData,
    };
    localProducts = [newProd, ...localProducts];
    return newProd;
  }
}

export function deleteMockProduct(productId) {
  localProducts = localProducts.filter((p) => p.id !== productId);
  return true;
}

export let localCategories = [...MOCK_CATEGORIES];

export function getMockCategories() {
  return localCategories;
}

export function saveMockCategory(categoryData) {
  const existingIdx = localCategories.findIndex(
    (c) => c.id === categoryData.id || c.slug === categoryData.slug
  );
  if (existingIdx >= 0) {
    localCategories[existingIdx] = { ...localCategories[existingIdx], ...categoryData };
    return localCategories[existingIdx];
  } else {
    const newCat = {
      id: categoryData.id || `cat-${Date.now()}`,
      display_order: localCategories.length + 1,
      ...categoryData,
    };
    localCategories.push(newCat);
    return newCat;
  }
}

export function deleteMockCategory(categoryId) {
  localCategories = localCategories.filter((c) => c.id !== categoryId && c.slug !== categoryId);
  return true;
}

export function getMockMaterials() {
  return localMaterials;
}

export function saveMockMaterial(materialData) {
  const existingIdx = localMaterials.findIndex((m) => m.id === materialData.id);
  if (existingIdx >= 0) {
    localMaterials[existingIdx] = { ...localMaterials[existingIdx], ...materialData };
    return localMaterials[existingIdx];
  } else {
    const newMat = {
      id: materialData.id || `mat-${Date.now()}`,
      ...materialData,
    };
    localMaterials = [newMat, ...localMaterials];
    return newMat;
  }
}

export function deleteMockMaterial(materialId) {
  localMaterials = localMaterials.filter((m) => m.id !== materialId);
  return true;
}

export function addMockOrder(orderData) {
  const newOrder = {
    id: `ord-${Date.now()}`,
    status: 'pending',
    created_at: new Date().toISOString(),
    ...orderData,
  };
  localOrders = [newOrder, ...localOrders];
  return newOrder;
}

export function getAllMockOrders() {
  return localOrders;
}

export function getMockOrderByReference(refCode) {
  if (!refCode) return null;
  const clean = refCode.trim().toUpperCase();
  return localOrders.find((o) => (o.reference_code || o.id || '').toUpperCase() === clean) || null;
}

export function getMockDashboardData() {
  const lowStock = MOCK_MATERIALS.filter((m) => m.current_stock <= m.minimum_stock);
  const totalRevenue = localOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const pendingOrders = localOrders.filter((o) => o.status === 'pending');

  return {
    todaySales: totalRevenue,
    todaySalesDelta: 0,
    monthSales: totalRevenue,
    monthSalesDelta: 0,
    pendingOrdersCount: pendingOrders.length,
    activeListingsCount: localProducts.filter((p) => p.is_available).length,
    salesTrend: [
      { date: 'Mon', revenue: 0, cost: 0, profit: 0 },
      { date: 'Tue', revenue: 0, cost: 0, profit: 0 },
      { date: 'Wed', revenue: 0, cost: 0, profit: 0 },
      { date: 'Thu', revenue: 0, cost: 0, profit: 0 },
      { date: 'Fri', revenue: 0, cost: 0, profit: 0 },
      { date: 'Sat', revenue: 0, cost: 0, profit: 0 },
      { date: 'Sun', revenue: 0, cost: 0, profit: 0 },
    ],
    recentOrders: localOrders.slice(0, 5),
    lowStockMaterials: lowStock,
    topProducts: localProducts.slice(0, 5).map((p) => ({
      name: p.name,
      unitsSold: 0,
      revenue: p.base_price,
    })),
  };
}
