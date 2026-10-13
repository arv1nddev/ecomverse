/**
 * catalog.ts – Supabase query helpers for the public catalog.
 *
 * Rules enforced here:
 * - Never select product_supplier_info (Hard Rule 4).
 * - Only active products are readable (RLS enforces is_active; we do not filter client-side).
 * - Image public URLs are built via Supabase Storage (never from product_supplier_info).
 */

import { supabase } from './supabase'
import type { Tables } from '../types/database'

// ── Local types ────────────────────────────────────────────────────────────────

export type Category = Tables<'categories'>

export type ProductRow = Tables<'products'>

export type ProductImage = Tables<'product_images'>

export type StoreSettings = Tables<'store_settings'>

export type CategorySnippet = Pick<Category, 'id' | 'name' | 'slug'>

export interface ProductWithImages extends ProductRow {
  product_images: ProductImage[]
  /** Supabase FK join returns an array (or null). We normalise to a single object | null. */
  categories: CategorySnippet | null
}

// ── Image URL helper ───────────────────────────────────────────────────────────

export function getImageUrl(storagePath: string): string {
  return supabase.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl
}

// ── Queries ────────────────────────────────────────────────────────────────────

/** Fetch all categories ordered by sort_order. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw new Error('Could not load categories. Please try again.')
  return data ?? []
}

/** Fetch all active products with their images and category. Max ~20. */
export async function fetchProducts(): Promise<ProductWithImages[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      category_id,
      name,
      slug,
      short_description,
      details,
      variant_options,
      price,
      in_stock,
      is_active,
      created_at,
      product_images ( id, storage_path, sort_order, product_id ),
      categories ( id, name, slug )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(50) // well above the expected ~20 products

  if (error) throw new Error('Could not load products. Please try again.')

  // Sort images by sort_order within each product.
  // Supabase returns FK many-to-one joins as an array; normalise to a single object.
  return (data ?? []).map((p) => ({
    ...p,
    product_images: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order),
    categories: Array.isArray(p.categories) ? (p.categories[0] ?? null) : p.categories,
  })) as ProductWithImages[]
}

/** Fetch a single product by slug, with its images. Returns null when not found (treat as 404). */
export async function fetchProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      category_id,
      name,
      slug,
      short_description,
      details,
      variant_options,
      price,
      in_stock,
      is_active,
      created_at,
      product_images ( id, storage_path, sort_order, product_id ),
      categories ( id, name, slug )
      `,
    )
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no rows – inactive or missing → 404
    throw new Error('Could not load product. Please try again.')
  }

  if (!data) return null

  return {
    ...data,
    product_images: [...data.product_images].sort((a, b) => a.sort_order - b.sort_order),
    categories: Array.isArray(data.categories) ? (data.categories[0] ?? null) : data.categories,
  } as ProductWithImages
}

/** Fetch the single store_settings row (id = 1). */
export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('id, delivery_estimate, free_shipping_threshold, shipping_fee')
    .eq('id', 1)
    .single()

  if (error || !data) {
    // Return safe defaults so the UI never crashes if settings are missing
    return { id: 1, delivery_estimate: '9-10 days', free_shipping_threshold: 500, shipping_fee: 70 }
  }
  return data
}
