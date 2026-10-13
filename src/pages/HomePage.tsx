/**
 * HomePage – Hero + Category tiles + Latest products grid.
 *
 * Data fetched once on mount:
 *   - categories (for the tile row)
 *   - latest products (first 8 by created_at desc, with images)
 *   - store_settings (not used on home; fetched here only if needed later)
 *
 * All three have loading, empty, and error states.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../lib/catalog'
import type { Category, ProductWithImages } from '../lib/catalog'
import { ProductCard } from '../components/product/ProductCard'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

const LATEST_COUNT = 8

export function HomePage() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductWithImages[]>([])
  const [loading, setLoading] = useState(true) // true on mount; set to false after first fetch
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // loading=true and error=null are already the initial values; no need to set them here.

    Promise.all([fetchCategories(), fetchProducts()])
      .then(([cats, prods]) => {
        if (cancelled) return
        setCategories(cats)
        setProducts(prods.slice(0, LATEST_COUNT))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <title>Ecomverse – Shop Online</title>
      <meta name="description" content="Shop quality products online. Fast delivery across India in 9-10 days. Browse all categories." />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Great finds,<br />delivered to you
            </h1>
            <p className="mt-5 text-lg text-brand-100 sm:text-xl">
              Curated products shipped across India in 9–10 days. No hassle, no surprises.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                to="/shop"
                id="hero-shop-now-btn"
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-md hover:bg-brand-50 transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                Shop now
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-400/20" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-brand-800/30" aria-hidden="true" />
      </section>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {loading && (
          <div className="py-20">
            <Spinner label="Loading…" />
          </div>
        )}

        {!loading && error && (
          <div className="py-16">
            <ErrorMessage title="Could not load catalog" message={error} />
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Category tiles ── */}
            {categories.length > 0 && (
              <section className="py-12" aria-labelledby="categories-heading">
                <h2
                  id="categories-heading"
                  className="text-xl font-bold text-neutral-900 sm:text-2xl"
                >
                  Shop by category
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      id={`category-tile-${cat.slug}`}
                      onClick={() => navigate(`/shop?category=${cat.slug}`)}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm hover:border-brand-400 hover:shadow-md transition-all group cursor-pointer"
                    >
                      {/* Generic icon placeholder – real icons can be added later */}
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition-colors" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-neutral-700 group-hover:text-brand-700 leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                  {/* "All products" tile */}
                  <button
                    id="category-tile-all"
                    onClick={() => navigate('/shop')}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm hover:border-brand-400 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-neutral-700 group-hover:text-brand-700">
                      All products
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* ── Latest products ── */}
            <section className="pb-16" aria-labelledby="latest-heading">
              <div className="flex items-center justify-between">
                <h2
                  id="latest-heading"
                  className="text-xl font-bold text-neutral-900 sm:text-2xl"
                >
                  Latest arrivals
                </h2>
                <Link
                  to="/shop"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  View all →
                </Link>
              </div>

              {products.length === 0 ? (
                <p className="mt-8 text-center text-neutral-500">No products yet — check back soon!</p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
