/**
 * ProductCard – compact card shown in the product grid on Home and Shop pages.
 *
 * Shows: main image (or placeholder), name, price, out-of-stock badge, link to product page.
 * Add-to-cart is intentionally omitted from the card; the full picker is on the product page.
 */

import { Link } from 'react-router-dom'
import { formatINR } from '../../lib/money'
import { getImageUrl } from '../../lib/catalog'
import type { ProductWithImages } from '../../lib/catalog'

interface ProductCardProps {
  product: ProductWithImages
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.product_images.find((img) => img.sort_order === 0) ?? product.product_images[0]
  const imageUrl = mainImage ? getImageUrl(mainImage.storage_path) : null

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      aria-label={product.name}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Out-of-stock badge */}
        {!product.in_stock && (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-800/80 px-2 py-0.5 text-[11px] font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-3 gap-1">
        <p className="text-sm font-medium text-neutral-800 line-clamp-2 leading-snug">{product.name}</p>
        {product.short_description && (
          <p className="text-xs text-neutral-500 line-clamp-1">{product.short_description}</p>
        )}
        <p className="mt-auto pt-2 text-base font-semibold text-neutral-900">{formatINR(Number(product.price))}</p>
      </div>
    </Link>
  )
}
