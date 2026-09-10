/**
 * LIKHA Mock Data Layer
 * Clean baseline with 30 crafted products and 10 raw materials.
 * Categories are left empty/unassigned so the user can create and assign them.
 */

export const MOCK_CATEGORIES = [];

export const MOCK_MATERIALS = [
  {
    id: 'mat-01',
    name: 'Chenille Fuzzy Wire Stems (Pack of 100 - Pastel Pink & Peach)',
    category: 'Chenille Stems',
    current_stock: 150,
    unit: 'pcs',
    cost_per_unit: 2.50,
    minimum_stock: 30,
  },
  {
    id: 'mat-02',
    name: 'Chenille Fuzzy Wire Stems (Pack of 100 - Botanical Olive & Sage)',
    category: 'Chenille Stems',
    current_stock: 120,
    unit: 'pcs',
    cost_per_unit: 2.50,
    minimum_stock: 30,
  },
  {
    id: 'mat-03',
    name: '5-Ply Milk Cotton Yarn (Soft Sunflower Yellow - 50g)',
    category: 'Floral Supplies',
    current_stock: 18,
    unit: 'skeins',
    cost_per_unit: 65.00,
    minimum_stock: 5,
  },
  {
    id: 'mat-04',
    name: '5-Ply Milk Cotton Yarn (Pure Cream White - 50g)',
    category: 'Floral Supplies',
    current_stock: 22,
    unit: 'skeins',
    cost_per_unit: 65.00,
    minimum_stock: 5,
  },
  {
    id: 'mat-05',
    name: 'Epoxy Resin Crystal Clear A+B Kit (1000mL Low Viscosity)',
    category: 'Resin & Glitters',
    current_stock: 1400,
    unit: 'mL',
    cost_per_unit: 0.45,
    minimum_stock: 300,
  },
  {
    id: 'mat-06',
    name: 'Korean Waterproof Matte Wrapping Paper (Blush & Neutral 20-Sheets)',
    category: 'Wrappers & Ribbons',
    current_stock: 45,
    unit: 'sheets',
    cost_per_unit: 15.00,
    minimum_stock: 10,
  },
  {
    id: 'mat-07',
    name: 'Double-Faced Silky Satin Ribbon (2.5cm x 25 Yards - Champagne Gold)',
    category: 'Wrappers & Ribbons',
    current_stock: 60,
    unit: 'meters',
    cost_per_unit: 5.00,
    minimum_stock: 15,
  },
  {
    id: 'mat-08',
    name: '18-Gauge Floral Stem Wire (30cm Stiff Green - 50pcs)',
    category: 'Floral Supplies',
    current_stock: 200,
    unit: 'pcs',
    cost_per_unit: 3.00,
    minimum_stock: 40,
  },
  {
    id: 'mat-09',
    name: 'High-Temp Hot Melt Glue Sticks (11mm Clear - 1kg Pack)',
    category: 'Floral Supplies',
    current_stock: 35,
    unit: 'sticks',
    cost_per_unit: 6.00,
    minimum_stock: 15,
  },
  {
    id: 'mat-10',
    name: 'Glass Bell Display Dome with Solid Wood Base & Warm LED String',
    category: 'Packaging',
    current_stock: 12,
    unit: 'sets',
    cost_per_unit: 180.00,
    minimum_stock: 4,
  },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-01',
    name: 'Fuzzy Wire Rose Bouquet',
    slug: 'fuzzy-wire-rose-bouquet',
    category_id: null,
    category: null,
    base_price: 250,
    description: 'Handcrafted velvety fuzzy-wire roses wrapped in waterproof Korean matte kraft paper and tied with a silky satin ribbon. Everlasting flower art that never wilts.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 1,
    product_photos: [
      { id: 'ph-01', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-01', option_name: 'Rose Color', is_required: true, display_order: 1, choices: [{ label: 'Pastel Blush Pink', extra_cost: 0 }, { label: 'Crimson Velvet Red', extra_cost: 0 }, { label: 'Lilac Lavender', extra_cost: 0 }, { label: 'Sunflower Warm Yellow', extra_cost: 0 }] },
      { id: 'opt-02', option_name: 'Arrangement Size', is_required: true, display_order: 2, choices: [{ label: 'Single Rose Stem', extra_cost: 0 }, { label: '3-Rose Trio (+₱200)', extra_cost: 200 }, { label: '6-Rose Deluxe Bloom (+₱450)', extra_cost: 450 }] },
      { id: 'opt-03', option_name: 'Wrapper Style', is_required: true, display_order: 3, choices: [{ label: 'Korean Matte Kraft', extra_cost: 0 }, { label: 'Frosted Translucent White', extra_cost: 0 }, { label: 'Noir Black Gold-Trim', extra_cost: 30 }] }
    ]
  },
  {
    id: 'prod-02',
    name: 'Potted Handcrafted Crochet Sunflower',
    slug: 'potted-crochet-sunflower',
    category_id: null,
    category: null,
    base_price: 380,
    description: 'Delicately hand-knitted vibrant sunflower in a miniature terracotta-style knit pot. Perfect cheerful desk companion that brings sunshine every day.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 5,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 2,
    product_photos: [
      { id: 'ph-02', url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-04', option_name: 'Pot Color', is_required: true, display_order: 1, choices: [{ label: 'Terracotta Clay', extra_cost: 0 }, { label: 'Oatmeal Beige', extra_cost: 0 }, { label: 'Forest Moss Green', extra_cost: 0 }] },
      { id: 'opt-05', option_name: 'Mini Greeting Tag', is_required: false, display_order: 2, choices: [{ label: 'You Are My Sunshine ☀️', extra_cost: 0 }, { label: 'Best Wishes ✨', extra_cost: 0 }, { label: 'Happy Birthday 🎂', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-03',
    name: 'Crystal Floral Resin Bookmark',
    slug: 'crystal-floral-resin-bookmark',
    category_id: null,
    category: null,
    base_price: 160,
    description: 'Crystal-clear artisan resin bookmark embedded with real pressed baby’s breath, dried lavender petals, gleaming gold foil accents, and a handmade silky tassel.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 8,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 3,
    product_photos: [
      { id: 'ph-03', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-06', option_name: 'Metallic Accent', is_required: true, display_order: 1, choices: [{ label: '24K Gold Flakes', extra_cost: 0 }, { label: 'Rose Gold Shimmer', extra_cost: 0 }, { label: 'Silver Leaf', extra_cost: 0 }] },
      { id: 'opt-07', option_name: 'Tassel Color', is_required: true, display_order: 2, choices: [{ label: 'Dusty Rose', extra_cost: 0 }, { label: 'Champagne Gold', extra_cost: 0 }, { label: 'Sage Emerald', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-04',
    name: 'Lavender & Daisy Bloom Box',
    slug: 'lavender-daisy-bloom-box',
    category_id: null,
    category: null,
    base_price: 680,
    description: 'A luxurious round cylinder hatbox filled with meticulously shaped fuzzy-wire French lavender and cheery white daisies. Includes fairy lights and a ribbon bow.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: true,
    sale_price: 620,
    sale_tag: 'Special',
    is_sold_out: false,
    display_order: 4,
    product_photos: [
      { id: 'ph-04', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-08', option_name: 'Hatbox Color', is_required: true, display_order: 1, choices: [{ label: 'Pearl White', extra_cost: 0 }, { label: 'Blush Pink', extra_cost: 0 }, { label: 'Midnight Black', extra_cost: 0 }] },
      { id: 'opt-09', option_name: 'Fairy Light Glow', is_required: false, display_order: 2, choices: [{ label: 'Warm White Glow (Included)', extra_cost: 0 }, { label: 'Rainbow Sparkle (+₱30)', extra_cost: 30 }] }
    ]
  },
  {
    id: 'prod-05',
    name: 'Eternal Glass Tulip Nightlight',
    slug: 'eternal-glass-tulip-nightlight',
    category_id: null,
    category: null,
    base_price: 520,
    description: 'Enchanting glass bell dome with glowing handmade crystal tulip petals and soft LED fairy lights nestled on a solid natural wood base.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 3,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 5,
    product_photos: [
      { id: 'ph-05', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-10', option_name: 'Tulip Color', is_required: true, display_order: 1, choices: [{ label: 'Blush Pink', extra_cost: 0 }, { label: 'Lavender Purple', extra_cost: 0 }, { label: 'Sunshine Yellow', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-06',
    name: 'Crochet Amigurumi Couple Keychain',
    slug: 'crochet-amigurumi-couple-keychain',
    category_id: null,
    category: null,
    base_price: 240,
    description: 'Set of two adorable pocket-sized crochet mascots hand-stitched with soft milk cotton yarn. Features a durable gold-toned swivel clasp.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 6,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 6,
    product_photos: [
      { id: 'ph-06', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-11', option_name: 'Character Pair', is_required: true, display_order: 1, choices: [{ label: 'Bear & Bunny', extra_cost: 0 }, { label: 'Cat & Dog', extra_cost: 0 }, { label: 'Frog & Duck', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-07',
    name: 'Chenille Fuzzy Wire Sunflower Bouquet',
    slug: 'fuzzy-wire-sunflower-bouquet',
    category_id: null,
    category: null,
    base_price: 320,
    description: 'Sunny handcrafted fuzzy-wire sunflowers paired with delicate greenery and premium frosted Korean wrapping paper.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 7,
    product_photos: [
      { id: 'ph-07', url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-12', option_name: 'Ribbon Accent', is_required: true, display_order: 1, choices: [{ label: 'Golden Honey', extra_cost: 0 }, { label: 'Forest Green', extra_cost: 0 }, { label: 'Ivory White', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-08',
    name: 'Artisan Botanical Resin Coaster Set',
    slug: 'artisan-botanical-resin-coasters',
    category_id: null,
    category: null,
    base_price: 450,
    description: 'Set of 4 heat-resistant resin drink coasters with encapsulated dried wild blossoms, shimmer mica powder, and hand-painted metallic gold rims.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 4,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 8,
    product_photos: [
      { id: 'ph-08', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-13', option_name: 'Coaster Shape', is_required: true, display_order: 1, choices: [{ label: 'Hexagonal', extra_cost: 0 }, { label: 'Round Geode', extra_cost: 0 }, { label: 'Square Minimal', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-09',
    name: 'Hand-Crocheted Daisy Flower Pot',
    slug: 'crochet-daisy-flower-pot',
    category_id: null,
    category: null,
    base_price: 350,
    description: 'Cute tabletop potted daisy hand-knitted from soft cotton yarn with flexible bendable stems.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 5,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 9,
    product_photos: [
      { id: 'ph-09', url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-14', option_name: 'Petal Tone', is_required: true, display_order: 1, choices: [{ label: 'Classic Pure White', extra_cost: 0 }, { label: 'Buttercup Yellow', extra_cost: 0 }, { label: 'Soft Lilac', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-10',
    name: 'Pastel Chenille Tulip Garden in Ceramic Mug',
    slug: 'pastel-chenille-tulip-mug',
    category_id: null,
    category: null,
    base_price: 390,
    description: 'Trio of pastel pink, peach, and cream fuzzy-wire tulips artfully arranged in a reusable ceramic keepsake mug.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 3,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 10,
    product_photos: [
      { id: 'ph-10', url: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-15', option_name: 'Mug Color', is_required: true, display_order: 1, choices: [{ label: 'Pastel Mint', extra_cost: 0 }, { label: 'Baby Pink', extra_cost: 0 }, { label: 'Cloud White', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-11',
    name: 'Personalized Initial Floral Resin Keychain',
    slug: 'personalized-initial-resin-keychain',
    category_id: null,
    category: null,
    base_price: 140,
    description: 'Alphabet letter keychain hand-poured with real pressed botanicals, fine foil flakes, and a sturdy alloy key ring.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 11,
    product_photos: [
      { id: 'ph-11', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-16', option_name: 'Flake Type', is_required: true, display_order: 1, choices: [{ label: 'Gold Leaf Flakes', extra_cost: 0 }, { label: 'Rose Gold Flakes', extra_cost: 0 }, { label: 'Holographic Silver', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-12',
    name: 'Crochet Lily of the Valley Glowing Lamp',
    slug: 'crochet-lily-of-the-valley-lamp',
    category_id: null,
    category: null,
    base_price: 590,
    description: 'Delicate bell-shaped crocheted blossoms embedded with gentle warm micro-LED bulbs for a dreamy bedside glow.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 2,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 12,
    product_photos: [
      { id: 'ph-12', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-17', option_name: 'Pot Finish', is_required: true, display_order: 1, choices: [{ label: 'Natural Glazed Clay', extra_cost: 0 }, { label: 'Rustic Knit Wrap', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-13',
    name: 'Fuzzy Wire Blue Hydrangea Bloom Arrangement',
    slug: 'fuzzy-wire-blue-hydrangea',
    category_id: null,
    category: null,
    base_price: 480,
    description: 'Dense cluster of soft sky-blue and lavender fuzzy-wire hydrangea florets in premium textured gift wrapping.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 13,
    product_photos: [
      { id: 'ph-13', url: 'https://images.unsplash.com/photo-1533616688419-b7a58556458e?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-18', option_name: 'Hydrangea Color', is_required: true, display_order: 1, choices: [{ label: 'Cerulean Sky Blue', extra_cost: 0 }, { label: 'Periwinkle Lilac', extra_cost: 0 }, { label: 'Cotton Candy Pink', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-14',
    name: 'Custom Spotify Code Floral Resin Plaque',
    slug: 'custom-spotify-floral-resin-plaque',
    category_id: null,
    category: null,
    base_price: 650,
    description: 'Clear acrylic resin desk plaque showcasing your favorite song title, scannable Spotify sound code, and dried flowers on a beech wood stand.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 14,
    product_photos: [
      { id: 'ph-14', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-19', option_name: 'Stand Option', is_required: true, display_order: 1, choices: [{ label: 'Standard Beechwood Base', extra_cost: 0 }, { label: 'LED Glowing Wooden Base (+₱120)', extra_cost: 120 }] }
    ]
  },
  {
    id: 'prod-15',
    name: 'Handcrafted Crochet Strawberry Vine Hanging',
    slug: 'crochet-strawberry-vine-hanging',
    category_id: null,
    category: null,
    base_price: 280,
    description: 'Playful hand-stitched red strawberries and blossom flowers on a hanging vine designed for car mirrors or study nooks.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 7,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 15,
    product_photos: [
      { id: 'ph-15', url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-20', option_name: 'Berry Style', is_required: true, display_order: 1, choices: [{ label: 'Ruby Red Strawberries', extra_cost: 0 }, { label: 'Pastel Pink Berries', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-16',
    name: 'Velvet Chenille Lavender Stems Bundle',
    slug: 'velvet-chenille-lavender-bundle',
    category_id: null,
    category: null,
    base_price: 340,
    description: 'Bundle of 10 long-stem fuzzy-wire lavender sprigs tied with rustic jute twine and purple organza ribbon.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 4,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 16,
    product_photos: [
      { id: 'ph-16', url: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-21', option_name: 'Packaging Finish', is_required: true, display_order: 1, choices: [{ label: 'Rustic Jute & Kraft', extra_cost: 0 }, { label: 'Clear Frosted Sleeve', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-17',
    name: 'Pressed Floral Resin Hair Claw Clip',
    slug: 'pressed-floral-resin-hair-claw',
    category_id: null,
    category: null,
    base_price: 180,
    description: 'Elegant French-style hair claw clip with crystal clear resin overlay, genuine dried hydrangeas, and gold shimmer.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 9,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 17,
    product_photos: [
      { id: 'ph-17', url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-22', option_name: 'Clip Colorway', is_required: true, display_order: 1, choices: [{ label: 'Amber Tortoise Floral', extra_cost: 0 }, { label: 'Milky White Floral', extra_cost: 0 }, { label: 'Clear Crystal Gold', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-18',
    name: 'Hand-Knitted Crochet Rose Bud in Gift Tube',
    slug: 'crochet-single-rose-gift-tube',
    category_id: null,
    category: null,
    base_price: 220,
    description: 'Single artisan-knitted red rose in a clear acrylic display cylinder with custom message ribbon.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 6,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 18,
    product_photos: [
      { id: 'ph-18', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-23', option_name: 'Rose Shade', is_required: true, display_order: 1, choices: [{ label: 'Ruby Velvet Red', extra_cost: 0 }, { label: 'Sunset Coral Peach', extra_cost: 0 }, { label: 'Champagne Cream', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-19',
    name: 'Mini Preserved Gypsophila & Fuzzy Daisy Gift Box',
    slug: 'gypsophila-fuzzy-daisy-gift-box',
    category_id: null,
    category: null,
    base_price: 420,
    description: 'Compact square gift box adorned with fluffy fuzzy-wire daisies surrounded by airy dried baby’s breath.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 19,
    product_photos: [
      { id: 'ph-19', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-24', option_name: 'Box Color', is_required: true, display_order: 1, choices: [{ label: 'Powder Blue', extra_cost: 0 }, { label: 'Blush Pink', extra_cost: 0 }, { label: 'Kraft Brown', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-20',
    name: 'Crochet Succulent & Cactus Trio Terrarium',
    slug: 'crochet-succulent-cactus-trio',
    category_id: null,
    category: null,
    base_price: 560,
    description: 'Trio of hand-knit miniature desert succulents and flowering cacti in a stylish ceramic bowl.',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 3,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 20,
    product_photos: [
      { id: 'ph-20', url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-25', option_name: 'Pot Finish', is_required: true, display_order: 1, choices: [{ label: 'Matte White Ceramic', extra_cost: 0 }, { label: 'Terracotta Clay Pot', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-21',
    name: 'Fuzzy Wire Cherry Blossom Branch',
    slug: 'fuzzy-wire-cherry-blossom-branch',
    category_id: null,
    category: null,
    base_price: 390,
    description: 'Graceful Japanese sakura branch crafted with soft pink chenille stems and flexible bendable twigs.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 21,
    product_photos: [
      { id: 'ph-21', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-26', option_name: 'Blossom Palette', is_required: true, display_order: 1, choices: [{ label: 'Sakura Soft Pink', extra_cost: 0 }, { label: 'Snow White Petals', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-22',
    name: 'Artisan Resin Trinket Tray with Gold Leaf',
    slug: 'resin-trinket-tray-gold-leaf',
    category_id: null,
    category: null,
    base_price: 320,
    description: 'Oval resin catchall tray for rings, jewelry, and perfume bottles featuring real dried rose petals.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 5,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 22,
    product_photos: [
      { id: 'ph-22', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-27', option_name: 'Foil Style', is_required: true, display_order: 1, choices: [{ label: '24K Gold Leaf Rim', extra_cost: 0 }, { label: 'Rose Gold Flakes', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-23',
    name: 'Handmade Crochet Cute Bunny Charm Keychain',
    slug: 'crochet-bunny-charm-keychain',
    category_id: null,
    category: null,
    base_price: 190,
    description: 'Fluffy amigurumi bunny charm wearing a miniature pastel sweater, complete with tiny bell and bead accents.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 8,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 23,
    product_photos: [
      { id: 'ph-23', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-28', option_name: 'Sweater Color', is_required: true, display_order: 1, choices: [{ label: 'Strawberry Pink', extra_cost: 0 }, { label: 'Sky Blue', extra_cost: 0 }, { label: 'Matcha Green', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-24',
    name: 'Enchanted Forest Resin Floral Pendant Necklace',
    slug: 'resin-floral-pendant-necklace',
    category_id: null,
    category: null,
    base_price: 290,
    description: 'Teardrop resin cabochon with preserved moss and forget-me-not blossoms on an 18K gold-plated stainless chain.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 6,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 24,
    product_photos: [
      { id: 'ph-24', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-29', option_name: 'Chain Color', is_required: true, display_order: 1, choices: [{ label: '18K Gold Plated', extra_cost: 0 }, { label: 'Sterling Silver Plated', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-25',
    name: 'Fuzzy Wire Carnation Tribute Bouquet',
    slug: 'fuzzy-wire-carnation-tribute-bouquet',
    category_id: null,
    category: null,
    base_price: 460,
    description: 'Layered fluffy pink and coral carnations symbolizing gratitude and love, wrapped with a satin bow.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 25,
    product_photos: [
      { id: 'ph-25', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-30', option_name: 'Carnation Tone', is_required: true, display_order: 1, choices: [{ label: 'Coral & Peachy Pink', extra_cost: 0 }, { label: 'Deep Crimson Red', extra_cost: 0 }, { label: 'Soft Ivory Cream', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-26',
    name: 'Crochet Hanging Car Mirror Floral Charm',
    slug: 'crochet-car-mirror-floral-charm',
    category_id: null,
    category: null,
    base_price: 210,
    description: 'Charming double-blossom dangling floral accessory for car rearview mirrors with adjustable cord.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 10,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 26,
    product_photos: [
      { id: 'ph-26', url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-31', option_name: 'Flower Style', is_required: true, display_order: 1, choices: [{ label: 'Double Daisy Duo', extra_cost: 0 }, { label: 'Mini Rose Bud Pair', extra_cost: 0 }, { label: 'Sunflower Bloom', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-27',
    name: 'Resin Embedded Floral Compact Pocket Mirror',
    slug: 'resin-floral-compact-pocket-mirror',
    category_id: null,
    category: null,
    base_price: 310,
    description: 'Dual-magnification foldable metal compact mirror with a bespoke botanical resin top shell.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 5,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 27,
    product_photos: [
      { id: 'ph-27', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-32', option_name: 'Casing Tone', is_required: true, display_order: 1, choices: [{ label: 'Rose Gold Metallic', extra_cost: 0 }, { label: 'Classic Polished Gold', extra_cost: 0 }, { label: 'Vintage Silver', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-28',
    name: 'Fuzzy Wire Red Poppy & Eucalyptus Hand Spray',
    slug: 'fuzzy-wire-red-poppy-spray',
    category_id: null,
    category: null,
    base_price: 380,
    description: 'Bold scarlet fuzzy poppies arranged with sage green chenille eucalyptus foliage.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: false,
    ready_made_stock: 0,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 28,
    product_photos: [
      { id: 'ph-28', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-33', option_name: 'Paper Wrapping', is_required: true, display_order: 1, choices: [{ label: 'Matte Charcoal & Gold', extra_cost: 0 }, { label: 'Earthy Oatmeal Kraft', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-29',
    name: 'Crochet Heart Daisy Keychain Pair',
    slug: 'crochet-heart-daisy-keychain-pair',
    category_id: null,
    category: null,
    base_price: 230,
    description: 'Matching pair of knit puffy heart and sunshine daisy keychains with secure lobster clasps.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 8,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 29,
    product_photos: [
      { id: 'ph-29', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-34', option_name: 'Heart Color', is_required: true, display_order: 1, choices: [{ label: 'Ruby Cherry Red', extra_cost: 0 }, { label: 'Pastel Baby Pink', extra_cost: 0 }, { label: 'Lavender Purple', extra_cost: 0 }] }
    ]
  },
  {
    id: 'prod-30',
    name: 'Galaxy Glitter Floral Resin Ballpoint Pen',
    slug: 'galaxy-glitter-floral-resin-pen',
    category_id: null,
    category: null,
    base_price: 150,
    description: 'Smooth refillable ballpoint pen with handcrafted floral crystal barrel and rose gold accents.',
    is_available: true,
    is_bestseller: false,
    is_ready_made: true,
    ready_made_stock: 12,
    is_on_sale: false,
    sale_price: 0,
    sale_tag: '',
    is_sold_out: false,
    display_order: 30,
    product_photos: [
      { id: 'ph-30', url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80', is_cover: true, display_order: 1 }
    ],
    product_options: [
      { id: 'opt-35', option_name: 'Ink & Trim Tone', is_required: true, display_order: 1, choices: [{ label: 'Black Ink (Rose Gold Barrel)', extra_cost: 0 }, { label: 'Blue Ink (Silver Flake Barrel)', extra_cost: 0 }] }
    ]
  }
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
