/**
 * CartContext – Task 4 implementation.
 *
 * Storage format in localStorage key "ecomverse_cart":
 *   Array<{ product_id: string; quantity: number; variant: string | null }>
 *
 * Only product_id, quantity and variant are persisted. Prices and names are
 * always re-fetched from Supabase so they are never stale.
 *
 * Rules:
 * - Quantity is clamped 1..10 per line.
 * - Items whose products are no longer active (RLS hides them) are removed on
 *   the next sync and the user is notified.
 * - Store settings (shipping threshold + fee) are read once on mount.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { getImageUrl } from '../lib/catalog'

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ecomverse_cart'
const MAX_QTY = 10
const MIN_QTY = 1

// ── Types ──────────────────────────────────────────────────────────────────────

/** What we persist to localStorage – minimal, price-free. */
export interface StoredCartItem {
  product_id: string
  quantity: number
  variant: string | null
}

/** A fully hydrated cart line (after re-fetch from Supabase). */
export interface CartLine extends StoredCartItem {
  name: string
  price: number       // rupees
  imagePath: string | null
  slug: string
}

export interface StoreSettingsSnapshot {
  freeShippingThreshold: number
  shippingFee: number
}

interface CartContextValue {
  /** Lines hydrated from Supabase (may be empty while loading). */
  lines: CartLine[]
  /** Total number of units (for badge). Updated immediately from localStorage. */
  itemCount: number
  /** True while the initial hydration from Supabase is in progress. */
  hydrating: boolean
  /** Store settings needed to show shipping totals on the cart page. */
  settings: StoreSettingsSnapshot
  /** Add or merge a new item. Triggers a re-hydration. */
  addToCart: (item: { product_id: string; quantity: number; variant: string | null }) => void
  /** Update the quantity of an existing line. Clamps to 1..10. */
  updateQuantity: (product_id: string, variant: string | null, quantity: number) => void
  /** Remove a line from the cart. */
  removeItem: (product_id: string, variant: string | null) => void
  /** Clear every item in the cart (call after successful payment). */
  clearCart: () => void
  /** Names of products removed because they are no longer active. */
  removedNames: string[]
  /** Dismiss the removed-products banner. */
  clearRemovedNames: () => void
}

// ── Context ────────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null)

// ── Helpers ────────────────────────────────────────────────────────────────────

function readStorage(): StoredCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Normalise: keep only items with a valid product_id and positive quantity
    return parsed
      .filter(
        (i): i is StoredCartItem =>
          typeof i === 'object' &&
          i !== null &&
          typeof i.product_id === 'string' &&
          typeof i.quantity === 'number' &&
          i.quantity > 0,
      )
      .map((i) => ({
        product_id: i.product_id,
        quantity: Math.max(MIN_QTY, Math.min(MAX_QTY, Math.round(i.quantity))),
        variant: typeof i.variant === 'string' ? i.variant : null,
      }))
  } catch {
    return []
  }
}

function writeStorage(items: StoredCartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // quota exceeded or private mode – silently ignore
  }
}

function countItems(items: StoredCartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

/** Key that uniquely identifies a cart line (product + variant combo). */
function lineKey(product_id: string, variant: string | null): string {
  return `${product_id}::${variant ?? ''}`
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredCartItem[]>(() => readStorage())
  const [lines, setLines] = useState<CartLine[]>([])
  const [hydrating, setHydrating] = useState(false)
  const [settings, setSettings] = useState<StoreSettingsSnapshot>({
    freeShippingThreshold: 500,
    shippingFee: 70,
  })
  const [removedNames, setRemovedNames] = useState<string[]>([])

  // ── Persist to localStorage whenever `stored` changes ─────────────────────
  useEffect(() => {
    writeStorage(stored)
  }, [stored])

  // ── Re-hydrate from Supabase whenever `stored` changes ────────────────────
  useEffect(() => {
    const items = stored
    if (items.length === 0) {
      queueMicrotask(() => {
        setLines([])
        setHydrating(false)
      })
      return
    }

    const cancelled = { value: false }
    queueMicrotask(() => setHydrating(true))

    const productIds = [...new Set(items.map((i) => i.product_id))]

    // Fetch live product data (RLS will hide inactive products automatically)
    supabase
      .from('products')
      .select(
        'id, name, slug, price, in_stock, is_active, product_images ( storage_path, sort_order )',
      )
      .in('id', productIds)
      .then(({ data, error }) => {
        if (cancelled.value) return
        if (error) {
          // Network error – keep existing lines rather than clearing
          setHydrating(false)
          return
        }

        const productMap = new Map(
          (data ?? []).map((p) => [
            p.id,
            {
              ...p,
              product_images: [...p.product_images].sort(
                (a, b) => a.sort_order - b.sort_order,
              ),
            },
          ]),
        )

        // Identify products that have disappeared (inactive or deleted)
        const removed: string[] = []
        const activeItems: StoredCartItem[] = []

        for (const item of items) {
          const product = productMap.get(item.product_id)
          if (!product) {
            // Product hidden by RLS or deleted
            removed.push('a product')
          } else {
            activeItems.push(item)
          }
        }

        // Build hydrated lines
        const hydratedLines: CartLine[] = activeItems
          .map((item) => {
            const product = productMap.get(item.product_id)!
            const mainImage =
              product.product_images.find((img) => img.sort_order === 0) ??
              product.product_images[0] ??
              null
            return {
              product_id: item.product_id,
              quantity: item.quantity,
              variant: item.variant,
              name: product.name,
              price: Number(product.price),
              slug: product.slug,
              imagePath: mainImage ? getImageUrl(mainImage.storage_path) : null,
            }
          })

        if (removed.length > 0) {
          setRemovedNames((prev) => [...prev, ...removed])
          // Update storage to only active items
          setStored(activeItems)
          writeStorage(activeItems)
        }

        setLines(hydratedLines)
        setHydrating(false)
      })

    return () => {
      cancelled.value = true
    }
  }, [stored])

  // ── Fetch store settings once on mount ────────────────────────────────────
  useEffect(() => {
    supabase
      .from('store_settings')
      .select('free_shipping_threshold, shipping_fee')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            freeShippingThreshold: Number(data.free_shipping_threshold),
            shippingFee: Number(data.shipping_fee),
          })
        }
      })
  }, [])

  // ── Listen for storage events from other tabs ──────────────────────────────
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setStored(readStorage())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  const addToCart = useCallback(
    (item: { product_id: string; quantity: number; variant: string | null }) => {
      setStored((prev) => {
        const key = lineKey(item.product_id, item.variant)
        const existingIdx = prev.findIndex(
          (l) => lineKey(l.product_id, l.variant) === key,
        )
        if (existingIdx >= 0) {
          // Merge: add qty, clamp to MAX_QTY
          const updated = [...prev]
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: Math.min(MAX_QTY, updated[existingIdx].quantity + item.quantity),
          }
          return updated
        }
        // New line
        return [
          ...prev,
          {
            product_id: item.product_id,
            quantity: Math.max(MIN_QTY, Math.min(MAX_QTY, item.quantity)),
            variant: item.variant,
          },
        ]
      })
    },
    [],
  )

  const updateQuantity = useCallback(
    (product_id: string, variant: string | null, quantity: number) => {
      const clamped = Math.max(MIN_QTY, Math.min(MAX_QTY, Math.round(quantity)))
      setStored((prev) =>
        prev.map((item) =>
          lineKey(item.product_id, item.variant) === lineKey(product_id, variant)
            ? { ...item, quantity: clamped }
            : item,
        ),
      )
    },
    [],
  )

  const removeItem = useCallback((product_id: string, variant: string | null) => {
    setStored((prev) =>
      prev.filter(
        (item) => lineKey(item.product_id, item.variant) !== lineKey(product_id, variant),
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setStored([])
  }, [])

  const clearRemovedNames = useCallback(() => setRemovedNames([]), [])

  const itemCount = countItems(stored)

  return (
    <CartContext.Provider
      value={{
        lines,
        itemCount,
        hydrating,
        settings,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        removedNames,
        clearRemovedNames,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
