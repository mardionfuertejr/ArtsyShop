import Link from 'next/link';
import { formatCurrencyCompact } from '@/lib/utils/formatCurrency';

export default function ProductCard({ product, className = '', style = {} }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const coverPhoto = product.product_photos?.find((p) => p.is_cover) || product.product_photos?.[0];
  const photoUrl = coverPhoto?.url
    ? coverPhoto.url
    : (coverPhoto?.storage_path && supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder'))
      ? `${supabaseUrl}/storage/v1/object/public/product-photos/${coverPhoto.storage_path}`
      : 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80';

  const isSoldOut = product.is_sold_out || (product.is_ready_made && product.ready_made_stock === 0);

  // Uniform discount percent calculation (e.g. 15% OFF)
  const discountPercent = (product.is_on_sale && product.sale_price && product.base_price && Number(product.base_price) > Number(product.sale_price))
    ? Math.round(((Number(product.base_price) - Number(product.sale_price)) / Number(product.base_price)) * 100)
    : null;

  const saleBadgeText = discountPercent ? `${discountPercent}% OFF` : (product.sale_tag || 'Sale');

  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`product-card${isSoldOut ? ' is-sold-out' : ''} ${className}`}
      style={{ textDecoration: 'none', ...style }}
    >
      <div className="product-card-image-wrap">
        {isSoldOut ? (
          <span className="product-badge-soldout">
            Sold Out
          </span>
        ) : product.is_on_sale && product.sale_price ? (
          <span className="product-badge-sale">
            {saleBadgeText}
          </span>
        ) : product.is_bestseller ? (
          <span className="product-badge-bestseller">
            Bestseller
          </span>
        ) : product.is_ready_made ? (
          <span className="product-badge-onhand">
            On Hand
          </span>
        ) : null}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="product-card-image"
            src={photoUrl}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="product-card-image-placeholder">
            <i className="fa-solid fa-gift"></i>
          </div>
        )}
      </div>
      <div className="product-card-body">
        <h3 className="product-card-name" title={product.name}>{product.name}</h3>
        <div className="product-card-price-wrap">
          {product.is_on_sale && product.sale_price ? (
            <div className="product-card-price-row is-sale">
              <span className="product-card-price-current">
                {formatCurrencyCompact(product.sale_price)}
              </span>
              <span className="product-card-price-original">
                {formatCurrencyCompact(product.base_price)}
              </span>
            </div>
          ) : isSoldOut ? (
            <div className="product-card-price-row is-sold-out">
              <span className="product-card-price-prefix">From</span>
              <span className="product-card-price-current">
                {formatCurrencyCompact(product.base_price)}
              </span>
            </div>
          ) : (
            <div className="product-card-price-row">
              <span className="product-card-price-prefix">From</span>
              <span className="product-card-price-current">
                {formatCurrencyCompact(product.base_price)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
