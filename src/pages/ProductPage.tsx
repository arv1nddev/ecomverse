/**
 * ProductPage – /shop/:slug
 *
 * Shows:
 *  - Image gallery (up to 5 images, placeholder when none)
 *  - Name, price, short description
 *  - Feature bullets (details array)
 *  - Variant picker (when variant_options is non-empty)
 *  - Quantity selector
 *  - "Add to cart" button (disabled + labelled "Out of stock" when in_stock is false)
 *  - Delivery estimate and shipping rule text, both read from store_settings
 *
 * Rules enforced:
 *  - Never queries product_supplier_info (Hard Rule 4).
 *  - Inactive product (RLS returns no row) → treats as 404.
 *  - Variant required when variant_options is non-empty; button stays disabled until one is chosen.
 *  - addToCart is called on the CartContext stub (real logic in Task 4).
 */

import { useEffect, useReducer } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchProductBySlug, fetchStoreSettings } from '../lib/catalog'
import type { ProductWithImages, StoreSettings } from '../lib/catalog'
import { formatINR } from '../lib/money'
import { useCart } from '../context/CartContext'
import { ProductImageGallery } from '../components/product/ProductImageGallery'
import { VariantPicker } from '../components/product/VariantPicker'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Button } from '../components/ui/Button'

// ── Reducer – all page state in one place ──────────────────────────────────────

interface PageState {
  // Fetch state
  loading: boolean
  error: string | null
  notFound: boolean
  product: ProductWithImages | null
  settings: StoreSettings | null
  // UI state (reset when slug changes)
  selectedVariant: string | null
  quantity: number
  addedMessage: string | null
}

type PageAction =
  | { type: 'RESET' }
  | { type: 'NOT_FOUND' }
  | { type: 'SUCCESS'; product: ProductWithImages; settings: StoreSettings }
  | { type: 'ERROR'; message: string }
  | { type: 'SET_VARIANT'; variant: string | null }
  | { type: 'SET_QUANTITY'; quantity: number }
  | { type: 'SET_ADDED_MESSAGE'; message: string | null }

const initialPageState: PageState = {
  loading: true,
  error: null,
  notFound: false,
  product: null,
  settings: null,
  selectedVariant: null,
  quantity: 1,
  addedMessage: null,
}

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'RESET':           return { ...initialPageState }
    case 'NOT_FOUND':       return { ...state, loading: false, notFound: true }
    case 'SUCCESS':         return { ...state, loading: false, product: action.product, settings: action.settings }
    case 'ERROR':           return { ...state, loading: false, error: action.message }
    case 'SET_VARIANT':     return { ...state, selectedVariant: action.variant }
    case 'SET_QUANTITY':    return { ...state, quantity: action.quantity }
    case 'SET_ADDED_MESSAGE': return { ...state, addedMessage: action.message }
    default:                return state
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addToCart } = useCart()

  const [
    { loading, error, notFound, product, settings, selectedVariant, quantity, addedMessage },
    dispatch,
  ] = useReducer(pageReducer, initialPageState)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    // Single dispatch resets all page state when the slug changes.
    dispatch({ type: 'RESET' })

    Promise.all([fetchProductBySlug(slug), fetchStoreSettings()])
      .then(([prod, s]) => {
        if (cancelled) return
        if (!prod) {
          dispatch({ type: 'NOT_FOUND' })
          return
        }
        dispatch({ type: 'SUCCESS', product: prod, settings: s })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Could not load product. Please try again.' })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <>
        <title>Product Not Found – Ecomverse</title>
        <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <p className="text-6xl font-bold text-neutral-200">404</p>
          <h1 className="mt-4 text-2xl font-semibold text-neutral-800">Product not found</h1>
          <p className="mt-2 text-neutral-500">This product may have been removed or is no longer available.</p>
          <Link
            to="/shop"
            className="mt-8 inline-flex items-center rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Back to shop
          </Link>
        </div>
      </>
    )
  }

  // ── Add to cart handler ────────────────────────────────────────────────────
  function handleAddToCart() {
    if (!product) return

    const hasVariants = product.variant_options.length > 0
    if (hasVariants && !selectedVariant) return // guard: button is also disabled

    const mainImage = product.product_images.find((img) => img.sort_order === 0) ?? product.product_images[0]

    addToCart({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      price: Number(product.price),
      variant: hasVariants ? selectedVariant : null,
      imagePath: mainImage ? mainImage.storage_path : null,
      quantity,
    })

    const msg = `${product.name}${selectedVariant ? ` (${selectedVariant})` : ''} added to cart!`
    dispatch({ type: 'SET_ADDED_MESSAGE', message: msg })
    setTimeout(() => dispatch({ type: 'SET_ADDED_MESSAGE', message: null }), 3000)
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const hasVariants = (product?.variant_options ?? []).length > 0
  const isAddDisabled = !product?.in_stock || (hasVariants && !selectedVariant)

  const deliveryText = settings ? `Delivery in ${settings.delivery_estimate}` : 'Delivery in 9-10 days'
  const shippingThreshold = settings ? Number(settings.free_shipping_threshold) : 500
  const shippingFee = settings ? Number(settings.shipping_fee) : 70
  const shippingText =
    `Free shipping on orders above ${formatINR(shippingThreshold)}. Below that, flat ${formatINR(shippingFee)} delivery charge.`

  const pageTitle = product ? `${product.name} – Ecomverse` : 'Product – Ecomverse'
  const pageDesc = product?.short_description ?? 'Product details on Ecomverse.'

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-neutral-700 transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="hover:text-neutral-700 transition-colors">Shop</Link>
          {product && (
            <>
              <span aria-hidden="true">/</span>
              {product.categories && (
                <>
                  <Link to={`/shop?category=${product.categories.slug}`} className="hover:text-neutral-700 transition-colors">
                    {product.categories.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
              <span className="text-neutral-800 font-medium truncate max-w-[200px]">{product.name}</span>
            </>
          )}
        </nav>

        {/* Loading */}
        {loading && <Spinner label="Loading product…" />}

        {/* Error */}
        {!loading && error && (
          <ErrorMessage title="Could not load product" message={error} />
        )}

        {/* Product layout */}
        {!loading && !error && product && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Image gallery */}
            <div>
              <ProductImageGallery
                images={product.product_images}
                productName={product.name}
              />
            </div>

            {/* Right: Product info */}
            <div className="flex flex-col gap-5">
              {/* Category badge */}
              {product.categories && (
                <Link
                  to={`/shop?category=${product.categories.slug}`}
                  className="self-start rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  {product.categories.name}
                </Link>
              )}

              {/* Name */}
              <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <p className="text-3xl font-bold text-neutral-900">
                {formatINR(Number(product.price))}
              </p>

              {/* Out of stock notice */}
              {!product.in_stock && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3">
                  <p className="text-sm font-medium text-neutral-600">Currently out of stock</p>
                  <p className="text-xs text-neutral-500 mt-0.5">We're working on restocking this item.</p>
                </div>
              )}

              {/* Short description */}
              {product.short_description && (
                <p className="text-base text-neutral-600 leading-relaxed">
                  {product.short_description}
                </p>
              )}

              {/* Feature bullets */}
              {product.details.length > 0 && (
                <ul className="flex flex-col gap-2" aria-label="Key features">
                  {product.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {detail}
                    </li>
                  ))}
                </ul>
              )}

              {/* Variant picker */}
              {hasVariants && (
                <VariantPicker
                  options={product.variant_options}
                  selected={selectedVariant}
                  onSelect={(v) => dispatch({ type: 'SET_VARIANT', variant: v })}
                  label="Select option"
                />
              )}

              {/* Quantity selector */}
              {product.in_stock && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="qty-input" className="text-sm font-medium text-neutral-700">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      id="qty-decrease-btn"
                      type="button"
                      onClick={() => dispatch({ type: 'SET_QUANTITY', quantity: Math.max(1, quantity - 1) })}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      −
                    </button>
                    <input
                      id="qty-input"
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(99, Number(e.target.value)))
                        dispatch({ type: 'SET_QUANTITY', quantity: isNaN(v) ? 1 : v })
                      }}
                      className="w-14 rounded-lg border border-neutral-300 bg-white py-1.5 text-center text-sm font-medium text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      id="qty-increase-btn"
                      type="button"
                      onClick={() => dispatch({ type: 'SET_QUANTITY', quantity: Math.min(99, quantity + 1) })}
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              <Button
                id="add-to-cart-btn"
                size="lg"
                disabled={isAddDisabled}
                onClick={handleAddToCart}
                className="w-full sm:w-auto"
                aria-label={
                  !product.in_stock
                    ? 'Out of stock'
                    : hasVariants && !selectedVariant
                      ? 'Select an option to add to cart'
                      : `Add ${quantity} × ${product.name} to cart`
                }
              >
                {!product.in_stock
                  ? 'Out of stock'
                  : hasVariants && !selectedVariant
                    ? 'Select an option'
                    : 'Add to cart'}
              </Button>

              {/* Variant reminder */}
              {hasVariants && !selectedVariant && product.in_stock && (
                <p className="text-sm text-neutral-500">Please select an option above to add to cart.</p>
              )}

              {/* Success message */}
              {addedMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
                >
                  ✓ {addedMessage}
                </div>
              )}

              {/* Delivery & shipping info */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col gap-2 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{deliveryText}</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{shippingText}</span>
                </div>
              </div>

              {/* Image attribution – show image count */}
              {product.product_images.length > 0 && (
                <p className="text-xs text-neutral-400">
                  {product.product_images.length} image{product.product_images.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Related / back link */}
        {!loading && !error && product && (
          <div className="mt-12 border-t border-neutral-200 pt-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Continue shopping
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
