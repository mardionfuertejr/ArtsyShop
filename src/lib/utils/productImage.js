/**
 * Universal Product Image Resolver & Fallback Utility
 * Ensures that product images never show broken icons (404s, invalid relative paths, etc.)
 */

export const DEFAULT_PLACEHOLDER_IMAGES = {
  bouquets: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
  'fuzzy-crafts': 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  fuzzy: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  crochet: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  'resin-art': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  resin: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  'custom-gifts': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
};

export function getSmartFallbackImage(categorySlugOrName = '', productName = '') {
  const text = `${categorySlugOrName} ${productName}`.toLowerCase();
  if (text.includes('resin')) return DEFAULT_PLACEHOLDER_IMAGES['resin-art'];
  if (text.includes('fuzzy') || text.includes('wire') || text.includes('chenille') || text.includes('crochet') || text.includes('craft') || text.includes('keychain') || text.includes('mirror')) {
    return DEFAULT_PLACEHOLDER_IMAGES['fuzzy-crafts'];
  }
  if (text.includes('bouquet') || text.includes('flower') || text.includes('tulip') || text.includes('rose') || text.includes('sunflower')) {
    return DEFAULT_PLACEHOLDER_IMAGES.bouquets;
  }
  if (text.includes('gift') || text.includes('box')) {
    return DEFAULT_PLACEHOLDER_IMAGES['custom-gifts'];
  }
  return DEFAULT_PLACEHOLDER_IMAGES.default;
}

export function resolveProductPhoto(productOrPhoto, fallbackCategory = '') {
  const fallback = getSmartFallbackImage(
    fallbackCategory || productOrPhoto?.category?.slug || productOrPhoto?.category?.name,
    productOrPhoto?.name || productOrPhoto?.productName
  );

  if (!productOrPhoto) return fallback;

  // Direct string input
  if (typeof productOrPhoto === 'string') {
    const raw = productOrPhoto.trim();
    if (!raw || raw.startsWith('placeholders/') || raw.startsWith('/placeholders/')) {
      return fallback;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') || raw.startsWith('data:')) {
      return raw;
    }
    return fallback;
  }

  // Object input (Product, CartItem, etc.)
  const photo = productOrPhoto.photo || productOrPhoto.photoUrl || productOrPhoto.primary_image;
  if (typeof photo === 'string' && photo.trim()) {
    const raw = photo.trim();
    if (!raw.startsWith('placeholders/') && !raw.startsWith('/placeholders/')) {
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') || raw.startsWith('data:')) {
        return raw;
      }
    }
  }

  // Check product_photos array
  const photos = productOrPhoto.product_photos || productOrPhoto.photos;
  if (Array.isArray(photos) && photos.length > 0) {
    const coverPhoto = photos.find((p) => p.is_cover) || photos[0];
    if (coverPhoto) {
      if (coverPhoto.url && (coverPhoto.url.startsWith('http://') || coverPhoto.url.startsWith('https://')) && !coverPhoto.url.includes('/placeholders/')) {
        return coverPhoto.url;
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (
        coverPhoto.storage_path &&
        !coverPhoto.storage_path.startsWith('placeholders/') &&
        supabaseUrl &&
        supabaseUrl.startsWith('http')
      ) {
        return `${supabaseUrl}/storage/v1/object/public/product-photos/${coverPhoto.storage_path}`;
      }
    }
  }

  return fallback;
}
