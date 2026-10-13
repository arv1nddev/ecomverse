/**
 * ProductImageGallery – main image + up to 5 thumbnails.
 *
 * Rules:
 * - Images come from product_images (storage_path), not product_supplier_info.
 * - Main image has sort_order = 0; thumbnails appear in sort_order order.
 * - Shows a placeholder when no images are available.
 * - Up to 5 images shown (task spec).
 */

import { useState } from 'react'
import { getImageUrl } from '../../lib/catalog'
import type { ProductImage } from '../../lib/catalog'

interface ProductImageGalleryProps {
  images: ProductImage[]
  productName: string
}

const MAX_IMAGES = 5

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-neutral-200 bg-neutral-100" role="img" aria-label="No image available">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const displayImages = images.slice(0, MAX_IMAGES)
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (displayImages.length === 0) {
    return (
      <div className="aspect-square w-full rounded-xl overflow-hidden border border-neutral-200">
        <ImagePlaceholder />
      </div>
    )
  }

  const selectedImage = displayImages[selectedIndex]
  const selectedUrl = getImageUrl(selectedImage.storage_path)

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-square w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
        <img
          key={selectedUrl}
          src={selectedUrl}
          alt={`${productName} – image ${selectedIndex + 1}`}
          className="h-full w-full object-cover transition-opacity duration-200"
          loading="eager"
        />
      </div>

      {/* Thumbnails – only shown when there are 2+ images */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Product images">
          {displayImages.map((img, idx) => {
            const thumbUrl = getImageUrl(img.storage_path)
            const isActive = idx === selectedIndex
            return (
              <button
                key={img.id}
                role="listitem"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-pressed={isActive}
                className={`shrink-0 h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                  isActive ? 'border-brand-500' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
