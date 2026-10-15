/**
 * adminCatalog.ts – Admin CRUD helpers for products, categories, images, and supplier info.
 *
 * Rules:
 * - Never hard-delete products; use is_active toggle (AGENTS.md).
 * - product_supplier_info is admin-only. Never expose to customers.
 * - Images stored at products/<product_id>/<uuid>.webp in the product-images bucket.
 * - All queries go through the anon key with the admin's JWT. RLS enforces is_admin.
 */

import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'
import type { Tables } from '../types/database'

export type Category = Tables<'categories'>

// ── Product types ──────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string
  product_id: string
  storage_path: string
  sort_order: number
}

export interface SupplierInfo {
  supplier_url: string | null
  supplier_cost: number | null
}

export interface AdminProduct {
  id: string
  name: string
  slug: string
  category_id: string | null
  short_description: string | null
  details: string[]
  variant_options: string[]
  price: number
  in_stock: boolean
  is_active: boolean
  created_at: string
  images: ProductImage[]
  supplier: SupplierInfo | null
  category_name: string | null
}

// ── Category helpers ───────────────────────────────────────────────────────────

export async function fetchAdminCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw new Error('Could not load categories.')
  return data ?? []
}

export async function createCategory(name: string): Promise<Category> {
  const slug = slugify(name)
  const { data: existing } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = (existing?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim(), slug, sort_order })
    .select()
    .single()
  if (error) throw new Error(error.message.includes('unique') ? 'A category with that name already exists.' : 'Could not create category.')
  return data
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const slug = slugify(name)
  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim(), slug })
    .eq('id', id)
  if (error) throw new Error('Could not rename category.')
}

export async function reorderCategories(ids: string[]): Promise<void> {
  // Run all updates; Supabase JS doesn't support batch update cleanly so we run sequentially
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('categories').update({ sort_order: i }).eq('id', ids[i])
  }
}

/** Delete only if no products use this category. */
export async function deleteCategory(id: string): Promise<void> {
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (count && count > 0) {
    throw new Error('Cannot delete: this category has products. Remove or reassign them first.')
  }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error('Could not delete category.')
}

// ── Product helpers ────────────────────────────────────────────────────────────

/** Fetch ALL products (including inactive) for the admin list. */
export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, category_id, short_description, details,
      variant_options, price, in_stock, is_active, created_at,
      product_images ( id, product_id, storage_path, sort_order ),
      categories ( name ),
      product_supplier_info ( supplier_url, supplier_cost )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Could not load products.')

  return (data ?? []).map((p) => {
    const sup = Array.isArray(p.product_supplier_info)
      ? (p.product_supplier_info[0] ?? null)
      : (p.product_supplier_info ?? null)
    const cat = Array.isArray(p.categories)
      ? (p.categories[0] ?? null)
      : (p.categories ?? null)

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category_id: p.category_id,
      short_description: p.short_description,
      details: p.details ?? [],
      variant_options: p.variant_options ?? [],
      price: Number(p.price),
      in_stock: p.in_stock,
      is_active: p.is_active,
      created_at: p.created_at,
      images: [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      supplier: sup ? { supplier_url: sup.supplier_url, supplier_cost: sup.supplier_cost !== null ? Number(sup.supplier_cost) : null } : null,
      category_name: cat?.name ?? null,
    }
  })
}

export interface ProductFormData {
  name: string
  slug: string
  category_id: string | null
  price: number
  short_description: string
  details: string[]          // feature bullets
  variant_options: string[]  // empty = no variants
  in_stock: boolean
  is_active: boolean
  supplier_url: string
  supplier_cost: string      // raw string; parse to number on save
}

/** Create a new product and its supplier info row. Returns the new product id. */
export async function createProduct(form: ProductFormData): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: form.name.trim(),
      slug: form.slug.trim(),
      category_id: form.category_id || null,
      price: form.price,
      short_description: form.short_description.trim() || null,
      details: form.details.filter(Boolean),
      variant_options: form.variant_options.filter(Boolean),
      in_stock: form.in_stock,
      is_active: form.is_active,
    })
    .select('id')
    .single()
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') throw new Error('A product with that slug already exists.')
    throw new Error('Could not create product: ' + error.message)
  }

  // Upsert supplier info
  await upsertSupplierInfo(data.id, form)
  return data.id
}

/** Update an existing product and its supplier info. */
export async function updateProduct(id: string, form: ProductFormData): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: form.name.trim(),
      slug: form.slug.trim(),
      category_id: form.category_id || null,
      price: form.price,
      short_description: form.short_description.trim() || null,
      details: form.details.filter(Boolean),
      variant_options: form.variant_options.filter(Boolean),
      in_stock: form.in_stock,
      is_active: form.is_active,
    })
    .eq('id', id)
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') throw new Error('A product with that slug already exists.')
    throw new Error('Could not update product.')
  }
  await upsertSupplierInfo(id, form)
}

/** Toggle in_stock or is_active directly from the list view. */
export async function patchProduct(
  id: string,
  patch: { in_stock?: boolean; is_active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw new Error('Could not update product.')
}

async function upsertSupplierInfo(productId: string, form: ProductFormData): Promise<void> {
  const cost = form.supplier_cost.trim() ? Number(form.supplier_cost) : null
  const url = form.supplier_url.trim() || null
  if (url === null && cost === null) return // nothing to save
  await supabase.from('product_supplier_info').upsert({
    product_id: productId,
    supplier_url: url,
    supplier_cost: cost,
  })
}

// ── Image helpers ──────────────────────────────────────────────────────────────

/** Compress + convert to WebP, upload to storage, insert product_images row. */
export async function uploadProductImage(
  productId: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<ProductImage> {
  onProgress(5)

  // 1. Compress to ~1000px max side, WebP
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1000,
    fileType: 'image/webp',
    useWebWorker: true,
  })
  onProgress(40)

  // 2. Generate a path: products/<product_id>/<uuid>.webp
  const uuid = crypto.randomUUID()
  const path = `products/${productId}/${uuid}.webp`

  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, compressed, { contentType: 'image/webp', upsert: false })
  if (upErr) throw new Error('Upload failed: ' + upErr.message)
  onProgress(80)

  // 3. Determine sort_order (max existing + 1; 0 if first)
  const { data: existing } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sort_order = (existing?.sort_order ?? -1) + 1

  // 4. Insert row
  const { data: imgRow, error: dbErr } = await supabase
    .from('product_images')
    .insert({ product_id: productId, storage_path: path, sort_order })
    .select()
    .single()
  if (dbErr) {
    // Best-effort cleanup
    await supabase.storage.from('product-images').remove([path])
    throw new Error('Could not save image record.')
  }
  onProgress(100)
  return imgRow
}

/** Delete a product image: removes storage object and DB row. */
export async function deleteProductImage(image: ProductImage): Promise<void> {
  await supabase.storage.from('product-images').remove([image.storage_path])
  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw new Error('Could not delete image.')
}

/** Set an image as the main image (sort_order 0) and shift others up. */
export async function setMainImage(productId: string, imageId: string): Promise<void> {
  // Get all images for this product
  const { data: images } = await supabase
    .from('product_images')
    .select('id, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  if (!images) return

  // Re-order: target image = 0, rest = 1, 2, 3…
  const others = images.filter((img) => img.id !== imageId)
  const updates = [
    { id: imageId, sort_order: 0 },
    ...others.map((img, i) => ({ id: img.id, sort_order: i + 1 })),
  ]
  for (const u of updates) {
    await supabase.from('product_images').update({ sort_order: u.sort_order }).eq('id', u.id)
  }
}

/** Reorder images to match the provided id array (index = sort_order). */
export async function reorderImages(imageIds: string[]): Promise<void> {
  for (let i = 0; i < imageIds.length; i++) {
    await supabase.from('product_images').update({ sort_order: i }).eq('id', imageIds[i])
  }
}

// ── Slug helper ────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Check if a slug is already taken (optionally excluding a product id). */
export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('products').select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (excludeId) query = query.neq('id', excludeId)
  const { count } = await query
  return (count ?? 0) > 0
}

export function getImageUrl(storagePath: string): string {
  return supabase.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl
}
