/**
 * LIKHA Mock Data Layer
 * Realistic creative handmade crafts, bouquets, orders, and inventory.
 * Used for instant preview and fallback when Supabase is initializing.
 */

export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Bouquets', slug: 'bouquets', display_order: 1 },
  { id: 'cat-2', name: 'Crochet', slug: 'crochet', display_order: 2 },
  { id: 'cat-3', name: 'Resin Crafts', slug: 'resin', display_order: 3 },
  { id: 'cat-4', name: 'Bloom Boxes', slug: 'gift-boxes', display_order: 4 },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Fuzzy Wire Rose Bouquet',
    slug: 'fuzzy-wire-rose-bouquet',
    description: 'Handcrafted velvety fuzzy-wire roses wrapped in waterproof Korean matte kraft paper and tied with a silky satin ribbon. Everlasting flower art that never wilts.',
    base_price: 250.00,
    pricing_method: 'markup',
    is_available: true,
    is_bestseller: true,
    display_order: 1,
    category: { id: 'cat-1', name: 'Bouquets & Flowers', slug: 'bouquets' },
    product_photos: [
      {
        id: 'photo-1-1',
        url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
        storage_path: 'fuzzy-rose-1.jpg',
        is_cover: true,
        display_order: 1,
      },
      {
        id: 'photo-1-2',
        url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
        storage_path: 'fuzzy-rose-2.jpg',
        is_cover: false,
        display_order: 2,
      },
      {
        id: 'photo-1-3',
        url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80',
        storage_path: 'fuzzy-rose-3.jpg',
        is_cover: false,
        display_order: 3,
      },
    ],
    product_options: [],
    bom: [
      { material_name: 'Chenille Fuzzy Wire (Pink)', qty: 20, unit: 'pcs', unit_cost: 2.50 },
      { material_name: 'Floral Stem Wire (Gauge 18)', qty: 3, unit: 'pcs', unit_cost: 3.00 },
      { material_name: 'Korean Matte Wrapper', qty: 1, unit: 'pcs', unit_cost: 15.00 },
      { material_name: 'Satin Ribbon Bow', qty: 1, unit: 'pcs', unit_cost: 10.00 },
      { material_name: 'Hot Glue Stick', qty: 1, unit: 'pcs', unit_cost: 6.00 },
    ],
  },
  {
    id: 'prod-2',
    name: 'Potted Crochet Sunflower',
    slug: 'potted-crochet-sunflower',
    description: 'Delicately hand-knitted vibrant sunflower in a miniature terracotta-style knit pot. Perfect cheerful desk companion that brings sunshine every day.',
    base_price: 380.00,
    pricing_method: 'manual',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 4,
    display_order: 2,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-2-1',
        url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80',
        storage_path: 'crochet-sunflower-1.jpg',
        is_cover: true,
        display_order: 1,
      },
      {
        id: 'photo-2-2',
        url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80',
        storage_path: 'crochet-sunflower-2.jpg',
        is_cover: false,
        display_order: 2,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-3',
    name: 'Custom Floral Resin Bookmark',
    slug: 'custom-floral-resin-bookmark',
    description: 'Crystal-clear artisan resin bookmark embedded with real pressed baby’s breath, dried lavender petals, gleaming gold foil accents, and a handmade silky tassel.',
    base_price: 160.00,
    pricing_method: 'markup',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 6,
    display_order: 3,
    category: { id: 'cat-3', name: 'Resin Keepsakes', slug: 'resin' },
    product_photos: [
      {
        id: 'photo-3-1',
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        storage_path: 'resin-bookmark-1.jpg',
        is_cover: true,
        display_order: 1,
      },
      {
        id: 'photo-3-2',
        url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        storage_path: 'resin-bookmark-2.jpg',
        is_cover: false,
        display_order: 2,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-4',
    name: 'Lavender & Daisy Bloom Box',
    slug: 'lavender-daisy-bloom-box',
    description: 'A luxurious round cylinder hatbox filled with meticulously shaped fuzzy-wire French lavender and cheery white daisies. Includes fairy lights and a ribbon bow.',
    base_price: 680.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: false,
    display_order: 4,
    category: { id: 'cat-4', name: 'Bloom Boxes & Gifts', slug: 'gift-boxes' },
    product_photos: [
      {
        id: 'photo-4-1',
        url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
        storage_path: 'bloom-box-1.jpg',
        is_cover: true,
        display_order: 1,
      },
      {
        id: 'photo-4-2',
        url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
        storage_path: 'bloom-box-2.jpg',
        is_cover: false,
        display_order: 2,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-5',
    name: 'Eternal Glass Tulip Nightlight',
    slug: 'eternal-glass-tulip-nightlight',
    description: 'Enchanting glass bell dome with glowing handmade crystal tulip petals and soft LED fairy lights nestled on a solid natural wood base. Operates on USB or battery.',
    base_price: 520.00,
    pricing_method: 'markup',
    is_available: true,
    is_bestseller: true,
    is_ready_made: true,
    ready_made_stock: 2,
    display_order: 5,
    category: { id: 'cat-4', name: 'Bloom Boxes & Gifts', slug: 'gift-boxes' },
    product_photos: [
      {
        id: 'photo-5-1',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        storage_path: 'tulip-dome-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-6',
    name: 'Crochet Amigurumi Couple Keychain',
    slug: 'crochet-amigurumi-keychain',
    description: 'Set of two adorable pocket-sized crochet mascots hand-stitched with soft milk cotton yarn. Features a durable gold-toned swivel clasp.',
    base_price: 240.00,
    is_on_sale: true,
    sale_price: 199.00,
    sale_tag: 'Save ₱41',
    pricing_method: 'manual',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 5,
    display_order: 6,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-6-1',
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        storage_path: 'crochet-amigurumi-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-7',
    name: 'Pastel Fuzzy-Wire Tulip Mini-Bunch',
    slug: 'pastel-fuzzy-wire-tulip-mini-bunch',
    description: 'A cheerful handheld bunch of pastel pink and lilac fuzzy-wire tulips wrapped with frosted parchment wrapper and tied with sheer chiffon ribbon.',
    base_price: 290.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 5,
    display_order: 7,
    category: { id: 'cat-1', name: 'Bouquets & Flowers', slug: 'bouquets' },
    product_photos: [
      {
        id: 'photo-7-1',
        url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
        storage_path: 'tulip-bunch-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
    product_options: [],
  },
  {
    id: 'prod-8',
    name: 'Hand-Knitted Potted Lavender',
    slug: 'hand-knitted-potted-lavender',
    description: 'Whimsical desktop knitted lavender sprigs nestled in a soft earth-toned pot. Never needs watering and brings relaxing vibes to any study table.',
    base_price: 340.00,
    is_on_sale: true,
    sale_price: 299.00,
    sale_tag: '12% OFF',
    pricing_method: 'manual',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 3,
    display_order: 8,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-8-1',
        url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80',
        storage_path: 'potted-lavender-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-9',
    name: 'Pressed Sakura Floral Letter Keychain',
    slug: 'pressed-sakura-floral-letter-keychain',
    description: 'Custom alphabet initial encased in high-gloss UV-resistant resin with real cherry blossom petals and champagne leaf flakes.',
    base_price: 180.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 8,
    display_order: 9,
    category: { id: 'cat-3', name: 'Resin Keepsakes', slug: 'resin' },
    product_photos: [
      {
        id: 'photo-9-1',
        url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        storage_path: 'sakura-keychain-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-10',
    name: 'Sunshine Daisy Fuzzy Wire Bunch',
    slug: 'sunshine-daisy-fuzzy-wire-bunch',
    description: 'Bright and joyful fuzzy-wire daisy stems paired with baby yellow eucalyptus leaves and rustic kraft paper.',
    base_price: 320.00,
    is_on_sale: true,
    sale_price: 275.00,
    sale_tag: 'Promo Deal',
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: false,
    display_order: 10,
    category: { id: 'cat-1', name: 'Bouquets & Flowers', slug: 'bouquets' },
    product_photos: [
      {
        id: 'photo-10-1',
        url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=800&q=80',
        storage_path: 'daisy-bunch-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-11',
    name: 'Cute Bear Crochet Bag Charm',
    slug: 'cute-bear-crochet-bag-charm',
    description: 'Chubby little bear hand-crocheted with plush milk cotton yarn, complete with a mini knitted beanie and clasp for backpacks.',
    base_price: 210.00,
    pricing_method: 'manual',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 4,
    display_order: 11,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-11-1',
        url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
        storage_path: 'bear-charm-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-12',
    name: 'Celestial Moon & Star Resin Trinket Dish',
    slug: 'celestial-moon-star-resin-trinket-dish',
    description: 'Shimmering crescent-shaped resin jewelry dish with holographic starlight shimmer and midnight blue undertones.',
    base_price: 280.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    is_sold_out: true,
    ready_made_stock: 0,
    display_order: 12,
    category: { id: 'cat-3', name: 'Resin Keepsakes', slug: 'resin' },
    product_photos: [
      {
        id: 'photo-12-1',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        storage_path: 'celestial-dish-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-13',
    name: 'Everlasting Peony Blossom Gift Box',
    slug: 'everlasting-peony-blossom-gift-box',
    description: 'An elegant square acrylic display gift box featuring oversized velvet fuzzy-wire peonies and a hidden drawer for small gifts or jewelry.',
    base_price: 750.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: false,
    display_order: 13,
    category: { id: 'cat-4', name: 'Bloom Boxes & Gifts', slug: 'gift-boxes' },
    product_photos: [
      {
        id: 'photo-13-1',
        url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
        storage_path: 'peony-box-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-14',
    name: 'Strawberry Crochet Coin Pouch',
    slug: 'strawberry-crochet-coin-pouch',
    description: 'Sweet strawberry-shaped zippered coin purse hand-stitched with vibrant crimson yarn and green leaf zipper pull.',
    base_price: 195.00,
    pricing_method: 'manual',
    is_available: true,
    is_ready_made: true,
    is_sold_out: true,
    ready_made_stock: 0,
    display_order: 14,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-14-1',
        url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80',
        storage_path: 'strawberry-pouch-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-15',
    name: 'Gradient Hydrangea Fuzzy Wire Dome',
    slug: 'gradient-hydrangea-fuzzy-wire-dome',
    description: 'Pastel purple and sky blue gradient hydrangea dome with warm LED micro-lights on a circular polished base.',
    base_price: 580.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    is_sold_out: true,
    ready_made_stock: 0,
    display_order: 15,
    category: { id: 'cat-4', name: 'Bloom Boxes & Gifts', slug: 'gift-boxes' },
    product_photos: [
      {
        id: 'photo-15-1',
        url: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=800&q=80',
        storage_path: 'hydrangea-dome-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-16',
    name: 'Custom Dried Botanical Coaster Pair',
    slug: 'custom-dried-botanical-coaster-pair',
    description: 'Pair of hexagonal resin drink coasters preserving genuine dried gold baby’s breath and fern fronds with gold metallic edge gilding.',
    base_price: 360.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 4,
    display_order: 16,
    category: { id: 'cat-3', name: 'Resin Keepsakes', slug: 'resin' },
    product_photos: [
      {
        id: 'photo-16-1',
        url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
        storage_path: 'botanical-coaster-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-17',
    name: 'Vintage Rose & Baby Breath Wrap',
    slug: 'vintage-rose-baby-breath-wrap',
    description: 'Dusty vintage rose arrangement made with plush chenille stems, paired with white dried florals and English newspaper wrapper.',
    base_price: 420.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: false,
    is_sold_out: true,
    ready_made_stock: 0,
    display_order: 17,
    category: { id: 'cat-1', name: 'Bouquets & Flowers', slug: 'bouquets' },
    product_photos: [
      {
        id: 'photo-17-1',
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80',
        storage_path: 'vintage-rose-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-18',
    name: 'Grand Bloom Artistry Celebration Set',
    slug: 'grand-bloom-artistry-celebration-set',
    description: 'Our deluxe signature gift package featuring a large multi-flower bouquet, potted amigurumi mascot, and personalized resin card.',
    base_price: 1250.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: false,
    display_order: 18,
    category: { id: 'cat-4', name: 'Bloom Boxes & Gifts', slug: 'gift-boxes' },
    product_photos: [
      {
        id: 'photo-18-1',
        url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
        storage_path: 'grand-celebration-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-19',
    name: 'Mini Potted Tulip Crochet Quartet',
    slug: 'mini-potted-tulip-crochet-quartet',
    description: 'Four mini pastel tulips crocheted with soft yarn nestled together in a textured knit ceramic-style pot. Perfect for brightening desks or nightstands.',
    base_price: 420.00,
    pricing_method: 'manual',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 3,
    display_order: 19,
    category: { id: 'cat-2', name: 'Crochet Art', slug: 'crochet' },
    product_photos: [
      {
        id: 'photo-19-1',
        url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=800&q=80',
        storage_path: 'tulip-quartet-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
  {
    id: 'prod-20',
    name: 'Custom Rose Petal Resin Pocket Mirror',
    slug: 'custom-rose-petal-resin-pocket-mirror',
    description: 'Dual-magnification compact foldable vanity mirror featuring real pressed dried rose petals and gold metallic foil encased in crystal-clear resin.',
    base_price: 260.00,
    pricing_method: 'markup',
    is_available: true,
    is_ready_made: true,
    ready_made_stock: 5,
    display_order: 20,
    category: { id: 'cat-3', name: 'Resin Keepsakes', slug: 'resin' },
    product_photos: [
      {
        id: 'photo-20-1',
        url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        storage_path: 'resin-mirror-1.jpg',
        is_cover: true,
        display_order: 1,
      },
    ],
  },
];

export const MOCK_ORDERS = [
  {
    id: 'ord-001',
    reference_code: 'LK-260908-001',
    customer_name: 'Maria Clarissa Santos',
    customer_phone: '0917 123 4567',
    order_type: 'delivery',
    status: 'confirmed',
    subtotal: 700.00,
    delivery_fee: 50.00,
    total_amount: 750.00,
    total_cost: 295.00,
    preferred_date: '2026-09-10',
    notes: 'Please add extra ribbon and deliver before 3 PM if possible. Thank you!',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago (Confirmed)
    delivery_location: {
      address: 'Brackett St, Poblacion, Carigara, Leyte',
      landmark_notes: 'Blue gate across the parish church',
      latitude: 11.2981,
      longitude: 124.6853,
    },
    order_items: [
      {
        id: 'item-1',
        product_name: 'Fuzzy Wire Rose Bouquet',
        quantity: 1,
        unit_price: 700.00,
        unit_cost: 295.00,
        total_price: 700.00,
        total_cost: 295.00,
        options: [
          { option_name: 'Color Theme', option_value: 'Pastel Blush Pink' },
        ],
      },
    ],
  },
  {
    id: 'ord-002',
    reference_code: 'LK-260908-002',
    customer_name: 'Carlo Mendoza',
    customer_phone: '0928 987 6543',
    order_type: 'pickup',
    status: 'preparing',
    subtotal: 380.00,
    delivery_fee: 0,
    total_amount: 380.00,
    total_cost: 135.00,
    preferred_date: '2026-09-09',
    notes: 'Will pick up at the studio around 10 AM.',
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // 1.25 hours ago (Auto-transitioned to Crafting)
    order_items: [
      {
        id: 'item-2',
        product_name: 'Potted Crochet Sunflower',
        quantity: 1,
        unit_price: 380.00,
        unit_cost: 135.00,
        total_price: 380.00,
        total_cost: 135.00,
        options: [],
      },
    ],
  },
  {
    id: 'ord-003',
    reference_code: 'LK-260908-003',
    customer_name: 'Alyssa Jane Reyes',
    customer_phone: '0995 444 8811',
    order_type: 'delivery',
    status: 'confirmed',
    subtotal: 1200.00,
    delivery_fee: 50.00,
    total_amount: 1250.00,
    total_cost: 490.00,
    preferred_date: '2026-09-12',
    notes: 'For our 1st year anniversary!',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    delivery_location: {
      address: 'Real St, Barugo, Leyte',
      landmark_notes: 'Near Barugo Central School',
      latitude: 11.3032,
      longitude: 124.7365,
    },
    order_items: [
      {
        id: 'item-3',
        product_name: 'Eternal Glass Tulip Nightlight',
        quantity: 2,
        unit_price: 520.00,
        unit_cost: 210.00,
        total_price: 1040.00,
        total_cost: 420.00,
        options: [
          { option_name: 'Tulip Color', option_value: 'Sunset Coral Peach' },
        ],
      },
      {
        id: 'item-4',
        product_name: 'Custom Floral Resin Bookmark',
        quantity: 1,
        unit_price: 160.00,
        unit_cost: 70.00,
        total_price: 160.00,
        total_cost: 70.00,
        options: [
          { option_name: 'Metallic Accent', option_value: '24K Gold Flakes' },
          { option_name: 'Tassel Color', option_value: 'Champagne Gold' },
        ],
      },
    ],
  },
  {
    id: 'ord-004',
    reference_code: 'LK-260908-004',
    customer_name: 'Patricia Cruz',
    customer_phone: '0919 777 2200',
    order_type: 'pickup',
    status: 'ready',
    subtotal: 520.00,
    delivery_fee: 0,
    total_amount: 520.00,
    total_cost: 210.00,
    preferred_date: '2026-09-08',
    notes: 'Already sent proof of payment on Messenger.',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    order_items: [
      {
        id: 'item-5',
        product_name: 'Eternal Glass Tulip Nightlight',
        quantity: 1,
        unit_price: 520.00,
        unit_cost: 210.00,
        total_price: 520.00,
        total_cost: 210.00,
        options: [
          { option_name: 'Tulip Color', option_value: 'Pure Pearl White' },
        ],
      },
    ],
  },
  {
    id: 'ord-005',
    reference_code: 'LK-260907-005',
    customer_name: 'Juan Dela Cruz',
    customer_phone: '0912 333 4455',
    order_type: 'delivery',
    status: 'completed',
    subtotal: 680.00,
    delivery_fee: 50.00,
    total_amount: 730.00,
    total_cost: 270.00,
    preferred_date: '2026-09-07',
    notes: 'Order completed and delivered successfully.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    delivery_location: {
      address: 'Baybay Boulevard, Carigara, Leyte',
      landmark_notes: 'Near public market',
      latitude: 11.2995,
      longitude: 124.6890,
    },
    order_items: [
      {
        id: 'item-6',
        product_name: 'Lavender & Daisy Bloom Box',
        quantity: 1,
        unit_price: 680.00,
        unit_cost: 270.00,
        total_price: 680.00,
        total_cost: 270.00,
        options: [
          { option_name: 'Hatbox Color', option_value: 'Blush Powder Pink' },
          { option_name: 'Scent Infusion', option_value: 'Natural French Lavender (+₱30)' },
        ],
      },
    ],
  },
  {
    id: 'ord-006',
    reference_code: 'LK-260906-006',
    customer_name: 'Maria Stephanie Lim',
    customer_phone: '0917 888 1234',
    order_type: 'delivery',
    status: 'completed',
    subtotal: 540.00,
    delivery_fee: 50.00,
    total_amount: 590.00,
    total_cost: 205.00,
    preferred_date: '2026-09-06',
    notes: 'Delivered at front lobby. Customer left a 5-star review!',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    delivery_location: {
      address: 'Real St, Barugo, Leyte',
      landmark_notes: 'White gate beside barangay hall',
      latitude: 11.3032,
      longitude: 124.7365,
    },
    order_items: [
      {
        id: 'item-7',
        product_name: 'Potted Crochet Sunflower',
        quantity: 1,
        unit_price: 380.00,
        unit_cost: 135.00,
        total_price: 380.00,
        total_cost: 135.00,
        options: [
          { option_name: 'Pot Color', option_value: 'Oatmeal Beige' },
        ],
      },
      {
        id: 'item-8',
        product_name: 'Custom Floral Resin Bookmark',
        quantity: 1,
        unit_price: 160.00,
        unit_cost: 70.00,
        total_price: 160.00,
        total_cost: 70.00,
        options: [
          { option_name: 'Metallic Accent', option_value: 'Rose Gold Shimmer' },
        ],
      },
    ],
  },
  {
    id: 'ord-007',
    reference_code: 'LK-260905-007',
    customer_name: 'Joshua Daniel Tan',
    customer_phone: '0928 333 7788',
    order_type: 'pickup',
    status: 'completed',
    subtotal: 700.00,
    delivery_fee: 0,
    total_amount: 700.00,
    total_cost: 295.00,
    preferred_date: '2026-09-05',
    notes: 'Studio pickup completed on time.',
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    order_items: [
      {
        id: 'item-9',
        product_name: 'Fuzzy Wire Rose Bouquet',
        quantity: 1,
        unit_price: 700.00,
        unit_cost: 295.00,
        total_price: 700.00,
        total_cost: 295.00,
        options: [
          { option_name: 'Rose Color', option_value: 'Crimson Velvet Red' },
          { option_name: 'Arrangement Size', option_value: '6-Rose Deluxe Bloom (+₱450)' },
        ],
      },
    ],
  },
  {
    id: 'ord-008',
    reference_code: 'LK-260904-008',
    customer_name: 'Angela Mae Navarro',
    customer_phone: '0939 111 4422',
    order_type: 'delivery',
    status: 'completed',
    subtotal: 580.00,
    delivery_fee: 50.00,
    total_amount: 630.00,
    total_cost: 240.00,
    preferred_date: '2026-09-04',
    notes: 'Delivered for birthday celebration.',
    created_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    delivery_location: {
      address: 'Brackett St, Carigara, Leyte',
      landmark_notes: 'Yellow 2-storey house',
      latitude: 11.2981,
      longitude: 124.6853,
    },
    order_items: [
      {
        id: 'item-10',
        product_name: 'Eternal Glass Tulip Nightlight',
        quantity: 1,
        unit_price: 580.00,
        unit_cost: 240.00,
        total_price: 580.00,
        total_cost: 240.00,
        options: [
          { option_name: 'Tulip Color', option_value: 'Pure Pearl White' },
          { option_name: 'Base Engraving', option_value: 'Custom Name Engraving (+₱60)' },
        ],
      },
    ],
  },
  {
    id: 'ord-009',
    reference_code: 'LK-260903-009',
    customer_name: 'Christian Paul Perez',
    customer_phone: '0998 555 3344',
    order_type: 'delivery',
    status: 'completed',
    subtotal: 1250.00,
    delivery_fee: 50.00,
    total_amount: 1300.00,
    total_cost: 510.00,
    preferred_date: '2026-09-03',
    notes: 'Anniversary gift set. Successfully handed over to recipient.',
    created_at: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    delivery_location: {
      address: 'Baybay Boulevard, Carigara, Leyte',
      landmark_notes: 'Near beach resort',
      latitude: 11.2995,
      longitude: 124.6890,
    },
    order_items: [
      {
        id: 'item-11',
        product_name: 'Grand Bloom Artistry Celebration Set',
        quantity: 1,
        unit_price: 1250.00,
        unit_cost: 510.00,
        total_price: 1250.00,
        total_cost: 510.00,
        options: [
          { option_name: 'Package Theme', option_value: 'Romantic Pastel Pink' },
        ],
      },
    ],
  },
  {
    id: 'ord-010',
    reference_code: 'LK-260902-010',
    customer_name: 'Bea Rodriguez',
    customer_phone: '0915 222 9900',
    order_type: 'pickup',
    status: 'completed',
    subtotal: 240.00,
    delivery_fee: 0,
    total_amount: 240.00,
    total_cost: 85.00,
    preferred_date: '2026-09-02',
    notes: 'Friend gift pair. Picked up in afternoon.',
    created_at: new Date(Date.now() - 144 * 3600 * 1000).toISOString(),
    order_items: [
      {
        id: 'item-12',
        product_name: 'Crochet Amigurumi Couple Keychain',
        quantity: 1,
        unit_price: 240.00,
        unit_cost: 85.00,
        total_price: 240.00,
        total_cost: 85.00,
        options: [
          { option_name: 'Character Duo', option_value: 'Bunny & Bear Duo' },
        ],
      },
    ],
  },
];

export const MOCK_MATERIALS = [
  { id: 'mat-1', name: 'Chenille Fuzzy Wire (Blush Pink)', unit: 'pcs', current_stock: 18, minimum_stock: 50, current_unit_cost: 2.50 },
  { id: 'mat-2', name: 'Satin Ribbon Roll (Blush 2.5cm)', unit: 'rolls', current_stock: 4, minimum_stock: 10, current_unit_cost: 45.00 },
  { id: 'mat-3', name: 'Milk Cotton Yarn (Yellow)', unit: 'rolls', current_stock: 6, minimum_stock: 2, current_unit_cost: 65.00 },
  { id: 'mat-4', name: 'Korean Matte Wrapping Paper', unit: 'pcs', current_stock: 35, minimum_stock: 10, current_unit_cost: 15.00 },
  { id: 'mat-5', name: 'Epoxy Resin Clear Kit (A+B)', unit: 'sets', current_stock: 3, minimum_stock: 2, current_unit_cost: 320.00 },
  { id: 'mat-6', name: 'Hot Glue Sticks (11mm)', unit: 'pcs', current_stock: 12, minimum_stock: 20, current_unit_cost: 6.00 },
];

export const MOCK_CUSTOM_REQUESTS = [
  {
    id: 'cr-001',
    reference_code: 'LK-CR-260908-001',
    customer_name: 'Bianca Gonzales',
    customer_phone: '0917 555 9988',
    description: 'Custom bridal keepsake bouquet: 12 ivory white pipe-cleaner calla lilies with sage green leaves and pearls.',
    budget: 1500.00,
    quantity: 1,
    preferred_date: '2026-09-25',
    status: 'pending',
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'cr-002',
    reference_code: 'LK-CR-260907-002',
    customer_name: 'Mark Vincent Tan',
    customer_phone: '0908 222 1133',
    description: 'Crochet capybara wearing an orange hat as graduation gift.',
    budget: 450.00,
    quantity: 1,
    preferred_date: '2026-09-18',
    status: 'quoted',
    quoted_price: 480.00,
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
];

// Initial Mock Reviews
export const MOCK_REVIEWS = [
  {
    id: 'rev-001',
    productSlug: 'fuzzy-wire-rose-bouquet',
    productId: 'a1111111-1111-1111-1111-111111111111',
    customer_name: 'Camille Santos',
    rating: 5,
    comment: 'Sobrang ganda at pulido ng pagkakagawa! Tuwang-tuwa yung ate ko nung natanggap niya. Everlasting talaga at maayos din ang packaging. Salamat M&M Artsy! 💖🌹',
    is_verified_buyer: true,
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 'rev-002',
    productSlug: 'fuzzy-wire-rose-bouquet',
    productId: 'a1111111-1111-1111-1111-111111111111',
    customer_name: 'Joshua Alcantara',
    rating: 5,
    comment: 'Gift ko para sa anniversary namin. Nagulat gf ko ang lambot at ang vibrant ng kulay. Super aesthetic pwedeng display sa table. 10/10!',
    is_verified_buyer: true,
    created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: 'rev-003',
    productSlug: 'fuzzy-wire-rose-bouquet',
    productId: 'a1111111-1111-1111-1111-111111111111',
    customer_name: 'Bea Mae R.',
    rating: 5,
    comment: 'Safe na safe yung box pagdating, walang damage. Ang bilis din mag-update ni seller. Will order again next time!',
    is_verified_buyer: true,
    created_at: new Date(Date.now() - 9 * 86400 * 1000).toISOString(),
  },
  {
    id: 'rev-004',
    productSlug: 'potted-crochet-sunflower',
    productId: 'a2222222-2222-2222-2222-222222222222',
    customer_name: 'Ella Marie Perez',
    rating: 5,
    comment: 'Super cute sa work desk ko! Nagbibigay ng good vibes araw-araw. Pulido ang tahi ng crochet.',
    is_verified_buyer: true,
    created_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
];

export const MOCK_FEEDBACKS = [
  {
    id: 'fb-001',
    rating: 5,
    topic: 'Website Experience',
    message: 'Super dali mag-order at napakabilis ng checkout!',
    customer_name: 'Dion G.',
    created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  },
];

// In-memory storage for active session submissions
let localReviews = [...MOCK_REVIEWS];
let localFeedbacks = [...MOCK_FEEDBACKS];

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

// In-memory storage for active session products
let localProducts = [...MOCK_PRODUCTS];

export function getMockProducts(categorySlug = 'all') {
  let list = [...localProducts];
  if (categorySlug && categorySlug !== 'all') {
    if (categorySlug === 'ready-made') {
      list = list.filter((p) => p.is_ready_made);
    } else {
      list = list.filter((p) => p.category?.slug === categorySlug);
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
  const existingIdx = localProducts.findIndex((p) => p.id === productData.id);
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

export function getMockCategories() {
  return MOCK_CATEGORIES;
}

let localOrders = [...MOCK_ORDERS];

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
  return (
    localOrders.find((o) => {
      const oRef = o.reference_code?.toUpperCase() || '';
      return (
        oRef === clean ||
        oRef.replace(/^LK-/, 'M&M-') === clean ||
        oRef.replace(/^M&M-/, 'LK-') === clean
      );
    }) || null
  );
}

export function getMockDashboardData() {
  const lowStock = MOCK_MATERIALS.filter((m) => m.current_stock <= m.minimum_stock);
  const pendingOrders = localOrders.filter((o) => ['pending', 'for_confirmation'].includes(o.status));
  const completedOrders = localOrders.filter((o) => o.status === 'completed');

  const monthRevenue = 14250.00; // Realistic month-to-date sales
  const monthCOGS = 5820.00;
  const monthProfit = monthRevenue - monthCOGS;

  return {
    monthRevenue,
    monthProfit,
    pendingCount: pendingOrders.length,
    lowStockCount: lowStock.length,
    pendingCustomRequests: MOCK_CUSTOM_REQUESTS.filter((r) => r.status === 'pending').length,
    lowStockMaterials: lowStock,
    recentOrders: localOrders.slice(0, 5),
  };
}

