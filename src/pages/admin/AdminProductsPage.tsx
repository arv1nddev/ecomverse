/**
 * AdminProductsPage – /admin/products
 *
 * Views:
 *   "list"  – table/card list of ALL products (incl. inactive) with thumbnail,
 *             name, category, price, in-stock toggle, active toggle, Edit button.
 *             "Add product" button opens the form.
 *   "form"  – add/edit form for a product.
 *
 * Form fields:
 *   name, slug (auto from name, editable, unique check), category,
 *   price, short description, feature bullets (add/remove lines),
 *   variant options (comma-separated chips; empty = no variants),
 *   supplier URL, supplier cost, in-stock, active.
 *
 * Image manager (shown on edit, after product is created):
 *   - Upload up to 5 images. Compressed to WebP ~1000px via browser-image-compression.
 *   - Show upload progress per file.
 *   - "Make main" sets sort_order = 0.
 *   - "Delete" removes storage object + DB row.
 *   - Drag reorder NOT required by spec; arrows are used instead.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  fetchAdminProducts,
  fetchAdminCategories,
  createProduct,
  updateProduct,
  patchProduct,
  uploadProductImage,
  deleteProductImage,
  setMainImage,
  slugify,
  isSlugTaken,
  getImageUrl,
  type AdminProduct,
  type ProductFormData,
  type ProductImage,
  type Category,
} from '../../lib/adminCatalog'
import { formatINR } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({
  id,
  checked,
  onChange,
  label,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-brand-500' : 'bg-neutral-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Image Manager ──────────────────────────────────────────────────────────────

interface UploadState {
  name: string
  progress: number
  error: string | null
}

function ImageManager({
  productId,
  images,
  onImagesChanged,
}: {
  productId: string
  images: ProductImage[]
  onImagesChanged: (updated: ProductImage[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [actionError, setActionError] = useState<string | null>(null)

  const remaining = 5 - images.length

  async function handleFiles(files: FileList) {
    const toUpload = Array.from(files).slice(0, remaining)
    if (toUpload.length === 0) return

    const initialUploads: UploadState[] = toUpload.map((f) => ({
      name: f.name,
      progress: 0,
      error: null,
    }))
    setUploads(initialUploads)

    const newImages: ProductImage[] = []
    for (let i = 0; i < toUpload.length; i++) {
      try {
        const img = await uploadProductImage(productId, toUpload[i], (pct) => {
          setUploads((prev) =>
            prev.map((u, idx) => (idx === i ? { ...u, progress: pct } : u)),
          )
        })
        newImages.push(img)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, error: msg } : u)),
        )
      }
    }
    setUploads([])
    onImagesChanged([...images, ...newImages])
  }

  async function handleDelete(image: ProductImage) {
    setActionError(null)
    try {
      await deleteProductImage(image)
      onImagesChanged(images.filter((img) => img.id !== image.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleMakeMain(imageId: string) {
    setActionError(null)
    try {
      await setMainImage(productId, imageId)
      // Re-sort locally
      const reordered = images
        .map((img) => ({ ...img, sort_order: img.id === imageId ? 0 : images.findIndex((x) => x.id === imageId) === 0 ? img.sort_order : img.sort_order + 1 }))
        .sort((a, b) => a.sort_order - b.sort_order)
      onImagesChanged(reordered)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not set main image')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">
          Images ({images.length}/5)
          <span className="ml-2 text-xs text-neutral-400">First image = main image</span>
        </p>
        {remaining > 0 && (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              id="upload-images-btn"
            >
              + Add images
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {actionError && (
        <p className="text-xs text-error" role="alert">{actionError}</p>
      )}

      {/* Existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`relative rounded-xl overflow-hidden border-2 ${
                img.sort_order === 0 ? 'border-brand-400' : 'border-neutral-200'
              } bg-neutral-100`}
            >
              <img
                src={getImageUrl(img.storage_path)}
                alt={`Product image ${idx + 1}`}
                className="h-24 w-full object-cover"
              />
              {img.sort_order === 0 && (
                <span className="absolute top-1 left-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Main
                </span>
              )}
              <div className="absolute bottom-0 left-0 right-0 flex bg-black/60">
                {img.sort_order !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleMakeMain(img.id)}
                    className="flex-1 py-1 text-[10px] font-medium text-white hover:bg-brand-600/60 transition-colors"
                    aria-label="Set as main image"
                  >
                    Main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  className="flex-1 py-1 text-[10px] font-medium text-white hover:bg-red-600/60 transition-colors"
                  aria-label="Delete image"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          {uploads.map((u, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-neutral-700 truncate">{u.name}</span>
                {u.error ? (
                  <span className="text-error">{u.error}</span>
                ) : (
                  <span className="text-neutral-500">{u.progress}%</span>
                )}
              </div>
              {!u.error && (
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && uploads.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 py-8 cursor-pointer hover:border-brand-300 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload product images"
          onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
        >
          <p className="text-sm text-neutral-500">Click to upload images</p>
          <p className="text-xs text-neutral-400 mt-1">JPEG, PNG, WebP · Up to 5</p>
        </div>
      )}
    </div>
  )
}

// ── ProductForm ────────────────────────────────────────────────────────────────

const EMPTY_FORM: ProductFormData = {
  name: '',
  slug: '',
  category_id: null,
  price: 0,
  short_description: '',
  details: [''],
  variant_options: [],
  in_stock: true,
  is_active: true,
  supplier_url: '',
  supplier_cost: '',
}

function ProductForm({
  product,
  categories,
  onSaved,
  onCancel,
}: {
  product: AdminProduct | null
  categories: Category[]
  onSaved: () => void
  onCancel: () => void
}) {
  const isEdit = product !== null

  const [form, setForm] = useState<ProductFormData>(() => {
    if (!product) return EMPTY_FORM
    return {
      name: product.name,
      slug: product.slug,
      category_id: product.category_id,
      price: product.price,
      short_description: product.short_description ?? '',
      details: product.details.length > 0 ? product.details : [''],
      variant_options: product.variant_options,
      in_stock: product.in_stock,
      is_active: product.is_active,
      supplier_url: product.supplier?.supplier_url ?? '',
      supplier_cost: product.supplier?.supplier_cost != null ? String(product.supplier.supplier_cost) : '',
    }
  })

  const [variantInput, setVariantInput] = useState(
    product?.variant_options.join(', ') ?? '',
  )
  const [slugError, setSlugError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedProductId, setSavedProductId] = useState<string | null>(
    product?.id ?? null,
  )
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? [])
  const slugModifiedRef = useRef(false)

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Auto-slug from name
  useEffect(() => {
    if (!slugModifiedRef.current && !isEdit) {
      setField('slug', slugify(form.name))
    }
  }, [form.name, isEdit])

  // Validate slug uniqueness on blur
  async function validateSlug() {
    if (!form.slug) { setSlugError('Slug is required.'); return }
    const taken = await isSlugTaken(form.slug, savedProductId ?? undefined)
    setSlugError(taken ? 'This slug is already in use.' : null)
  }

  function addBullet() {
    setField('details', [...form.details, ''])
  }
  function removeBullet(i: number) {
    setField('details', form.details.filter((_, idx) => idx !== i))
  }
  function setBullet(i: number, v: string) {
    setField('details', form.details.map((d, idx) => (idx === i ? v : d)))
  }

  function handleVariantInput(raw: string) {
    setVariantInput(raw)
    setField(
      'variant_options',
      raw.split(',').map((s) => s.trim()).filter(Boolean),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaveError(null)

    if (!form.name.trim()) { setSaveError('Name is required.'); return }
    if (!form.slug.trim()) { setSaveError('Slug is required.'); return }
    if (form.price <= 0) { setSaveError('Price must be greater than 0.'); return }
    if (slugError) { setSaveError('Fix the slug error first.'); return }

    setSaving(true)
    try {
      if (!isEdit) {
        const newId = await createProduct(form)
        setSavedProductId(newId)
        // Stay on form so admin can upload images
      } else {
        await updateProduct(product.id, form)
        onSaved()
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
          aria-label="Back to products list"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-neutral-900">
          {isEdit ? `Edit: ${product.name}` : 'Add product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* ── Basic info ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">Basic info</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                id="product-name"
                label="Name"
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Wireless Earbuds"
                disabled={saving}
              />
            </div>

            <div>
              <Input
                id="product-slug"
                label="Slug (URL)"
                required
                value={form.slug}
                onChange={(e) => {
                  slugModifiedRef.current = true
                  setField('slug', e.target.value)
                  setSlugError(null)
                }}
                onBlur={validateSlug}
                placeholder="wireless-earbuds"
                error={slugError}
                disabled={saving}
                hint="Auto-generated from name; must be unique."
              />
            </div>

            <div>
              <label htmlFor="product-category" className="text-sm font-medium text-neutral-700 block mb-1">
                Category
              </label>
              <select
                id="product-category"
                value={form.category_id ?? ''}
                onChange={(e) => setField('category_id', e.target.value || null)}
                disabled={saving}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Input
                id="product-price"
                label="Price (₹)"
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.price || ''}
                onChange={(e) => setField('price', Number(e.target.value))}
                placeholder="299"
                disabled={saving}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="product-desc" className="text-sm font-medium text-neutral-700 block mb-1">
              Short description
            </label>
            <textarea
              id="product-desc"
              value={form.short_description}
              onChange={(e) => setField('short_description', e.target.value)}
              rows={2}
              disabled={saving}
              placeholder="One or two sentences shown on the product card."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
            />
          </div>
        </section>

        {/* ── Feature bullets ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-700">Feature bullets</h2>
            <Button type="button" size="sm" variant="ghost" onClick={addBullet} id="add-bullet-btn">
              + Add
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {form.details.map((bullet, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => setBullet(i, e.target.value)}
                  placeholder={`Bullet ${i + 1}`}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeBullet(i)}
                  disabled={form.details.length <= 1}
                  className="p-1.5 text-neutral-400 hover:text-error disabled:opacity-30 transition-colors"
                  aria-label={`Remove bullet ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Variants ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">
            Variant options
            <span className="ml-2 text-xs font-normal text-neutral-400">
              Leave empty if no variants (e.g. "S, M, L" or "Red, Blue")
            </span>
          </h2>
          <Input
            id="product-variants"
            value={variantInput}
            onChange={(e) => handleVariantInput(e.target.value)}
            placeholder="S, M, L  or  Red, Blue, Green"
            disabled={saving}
            hint={
              form.variant_options.length > 0
                ? `Options: ${form.variant_options.join(' · ')}`
                : 'No variants – customers will not see a picker.'
            }
          />
        </section>

        {/* ── Supplier info ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700 mb-1">Supplier info</h2>
          <p className="text-xs text-neutral-400 mb-4">
            Admin only. Never shown to customers.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="supplier-url"
              label="Supplier URL"
              type="url"
              value={form.supplier_url}
              onChange={(e) => setField('supplier_url', e.target.value)}
              placeholder="https://aliexpress.com/..."
              disabled={saving}
            />
            <Input
              id="supplier-cost"
              label="Supplier cost (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.supplier_cost}
              onChange={(e) => setField('supplier_cost', e.target.value)}
              placeholder="120"
              disabled={saving}
            />
          </div>
        </section>

        {/* ── Toggles ── */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">Availability</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">In stock</p>
                <p className="text-xs text-neutral-400">Customers can add this product to cart.</p>
              </div>
              <Toggle
                id="toggle-in-stock"
                checked={form.in_stock}
                onChange={(v) => setField('in_stock', v)}
                label="Toggle in stock"
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">Active (visible)</p>
                <p className="text-xs text-neutral-400">Inactive products are hidden from customers.</p>
              </div>
              <Toggle
                id="toggle-is-active"
                checked={form.is_active}
                onChange={(v) => setField('is_active', v)}
                label="Toggle active"
                disabled={saving}
              />
            </div>
          </div>
        </section>

        {/* ── Images (shown only after product is saved / on edit) ── */}
        {savedProductId && (
          <section className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4">Images</h2>
            <ImageManager
              productId={savedProductId}
              images={images}
              onImagesChanged={setImages}
            />
          </section>
        )}

        {/* ── Save error + actions ── */}
        {saveError && (
          <div role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {saveError}
          </div>
        )}

        {/* New product: show "Saved! Now upload images" after first save */}
        {!isEdit && savedProductId && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Product created! Upload images above, then click Done when finished.
          </div>
        )}

        <div className="flex gap-3 justify-end pb-8">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            {!isEdit && savedProductId ? 'Done' : 'Cancel'}
          </Button>
          <Button
            id="save-product-btn"
            type="submit"
            loading={saving}
            disabled={saving || !!slugError}
          >
            {isEdit ? 'Save changes' : savedProductId ? 'Update details' : 'Create product'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── ProductRow (list item) ─────────────────────────────────────────────────────

function ProductRow({
  product,
  onEdit,
  onToggleStock,
  onToggleActive,
}: {
  product: AdminProduct
  onEdit: () => void
  onToggleStock: () => void
  onToggleActive: () => void
}) {
  const mainImage = product.images.find((i) => i.sort_order === 0) ?? product.images[0]

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      {/* Thumbnail */}
      <td className="py-3 pl-4 pr-3">
        <div className="h-12 w-12 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden shrink-0">
          {mainImage ? (
            <img
              src={getImageUrl(mainImage.storage_path)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300 text-lg">
              📦
            </div>
          )}
        </div>
      </td>

      {/* Name + slug */}
      <td className="py-3 pr-3">
        <p className="text-sm font-medium text-neutral-900 truncate max-w-[180px]">{product.name}</p>
        <p className="text-xs text-neutral-400 font-mono">{product.slug}</p>
      </td>

      {/* Category */}
      <td className="py-3 pr-3 text-sm text-neutral-600 hidden sm:table-cell">
        {product.category_name ?? <span className="text-neutral-400">—</span>}
      </td>

      {/* Price */}
      <td className="py-3 pr-3 text-sm font-semibold text-neutral-900 hidden sm:table-cell">
        {formatINR(product.price)}
      </td>

      {/* In stock toggle */}
      <td className="py-3 pr-3">
        <Toggle
          id={`stock-${product.id}`}
          checked={product.in_stock}
          onChange={onToggleStock}
          label={`Toggle in-stock for ${product.name}`}
        />
      </td>

      {/* Active toggle */}
      <td className="py-3 pr-3">
        <Toggle
          id={`active-${product.id}`}
          checked={product.is_active}
          onChange={onToggleActive}
          label={`Toggle active for ${product.name}`}
        />
      </td>

      {/* Edit */}
      <td className="py-3 pr-4 text-right">
        <Button size="sm" variant="secondary" onClick={onEdit} id={`edit-${product.id}`}>
          Edit
        </Button>
      </td>
    </tr>
  )
}

// ── AdminProductsPage ──────────────────────────────────────────────────────────

export function AdminProductsPage() {
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([fetchAdminProducts(), fetchAdminCategories()])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true)
      setError(null)
      loadData()
    })
  }, [loadData])

  function openAdd() {
    setEditProduct(null)
    setView('form')
  }

  function openEdit(p: AdminProduct) {
    setEditProduct(p)
    setView('form')
  }

  function handleSaved() {
    setView('list')
    loadData()
  }

  async function handleToggle(
    id: string,
    field: 'in_stock' | 'is_active',
    currentValue: boolean,
  ) {
    // Optimistic
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: !currentValue } : p)),
    )
    try {
      await patchProduct(id, { [field]: !currentValue })
    } catch {
      // Rollback
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: currentValue } : p)),
      )
    }
  }

  if (view === 'form') {
    return (
      <>
        <title>{editProduct ? `Edit ${editProduct.name}` : 'Add product'} – Ecomverse Admin</title>
        <ProductForm
          product={editProduct}
          categories={categories}
          onSaved={handleSaved}
          onCancel={() => setView('list')}
        />
      </>
    )
  }

  return (
    <>
      <title>Products – Ecomverse Admin</title>
      <meta name="description" content="Manage product catalogue." />

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
          <Button id="add-product-btn" onClick={openAdd}>
            + Add product
          </Button>
        </div>

        {loading && <Spinner label="Loading products…" />}
        {!loading && error && <ErrorMessage title="Could not load products" message={error} />}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center">
            <p className="text-neutral-500 mb-4">No products yet.</p>
            <Button onClick={openAdd}>Add your first product</Button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-neutral-100 bg-neutral-50">
                  <tr>
                    <th className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 w-16">
                      Image
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Name
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 hidden sm:table-cell">
                      Category
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 hidden sm:table-cell">
                      Price
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Stock
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Active
                    </th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Edit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {products.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onEdit={() => openEdit(p)}
                      onToggleStock={() => handleToggle(p.id, 'in_stock', p.in_stock)}
                      onToggleActive={() => handleToggle(p.id, 'is_active', p.is_active)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
