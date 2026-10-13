/**
 * ShopPage – full product listing with category filter, text search, and sort.
 *
 * Data strategy:
 *   - Load ALL active products once on mount (≤ 20 expected).
 *   - Category filter, text search (name + description), and sort are client-side.
 *   - URL query param ?category=<slug> pre-selects a category (set by Home category tiles).
 *
 * Sort options:
 *   - newest (default): created_at desc (already the order from fetchProducts)
 *   - price-asc: price ascending
 *   - price-desc: price descending
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchCategories, fetchProducts } from '../lib/catalog'
import type { Category, ProductWithImages } from '../lib/catalog'
import { ProductCard } from '../components/product/ProductCard'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { EmptyState } from '../components/ui/EmptyState'

type SortKey = 'newest' | 'price-asc' | 'price-desc'

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') ?? ''

  const [allProducts, setAllProducts] = useState<ProductWithImages[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state – derive selectedCategory directly from the URL so there is no extra
  // useEffect needed for syncing (avoids the react-hooks/set-state-in-effect lint rule).
  const selectedCategory = categoryParam
  const [searchText, setSearchText] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')

  // Fetch data once on mount
  useEffect(() => {
    let cancelled = false
    // loading=true and error=null are already the initial values; no need to set them here.

    Promise.all([fetchProducts(), fetchCategories()])
      .then(([prods, cats]) => {
        if (cancelled) return
        setAllProducts(prods)
        setCategories(cats)
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

  // ── Client-side filtering + sorting ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allProducts

    // Category filter
    if (selectedCategory) {
      list = list.filter((p) => p.categories?.slug === selectedCategory)
    }

    // Text search – name and short_description
    const q = searchText.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.short_description ?? '').toLowerCase().includes(q),
      )
    }

    // Sort
    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => Number(b.price) - Number(a.price))
    }
    // 'newest': already sorted by created_at desc from the API

    return list
  }, [allProducts, selectedCategory, searchText, sort])

  function handleCategoryChange(slug: string) {
    // Update URL param – selectedCategory is derived from searchParams, no extra setState needed
    if (slug) {
      setSearchParams({ category: slug }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const filterBarLabel = selectedCategory
    ? (categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory)
    : 'All'

  return (
    <>
      <title>Shop – Ecomverse</title>
      <meta name="description" content="Browse all products. Filter by category, search, and sort by price or newest." />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Shop</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {loading ? 'Loading products…' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
            {filterBarLabel !== 'All' && ` in ${filterBarLabel}`}
          </p>
        </div>

        {/* Controls: search + sort */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="shop-search" className="sr-only">Search products</label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              id="shop-search"
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-4 text-sm text-neutral-800 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label htmlFor="shop-sort" className="text-sm text-neutral-600 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-neutral-300 bg-white py-2 pl-3 pr-8 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category filter pills */}
        {!loading && categories.length > 0 && (
          <div
            className="mb-6 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by category"
          >
            <button
              id="cat-filter-all"
              onClick={() => handleCategoryChange('')}
              aria-pressed={selectedCategory === ''}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === ''
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.slug}`}
                onClick={() => handleCategoryChange(cat.slug)}
                aria-pressed={selectedCategory === cat.slug}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === cat.slug
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* States */}
        {loading && <Spinner label="Loading products…" />}

        {!loading && error && (
          <ErrorMessage title="Could not load products" message={error} />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title="No products found"
            description={
              searchText
                ? `No results for "${searchText}". Try a different search term or clear the filter.`
                : 'No products in this category yet.'
            }
            action={
              (searchText || selectedCategory) ? (
                <button
                  onClick={() => {
                    setSearchText('')
                    handleCategoryChange('')
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
