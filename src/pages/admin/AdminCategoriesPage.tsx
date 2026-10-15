/**
 * AdminCategoriesPage – /admin/categories
 *
 * Features:
 * - List all categories ordered by sort_order.
 * - Add category (name → auto slug).
 * - Rename in-place (click name → edit input).
 * - Reorder with up/down arrow buttons.
 * - Delete only if no products use it (enforced in adminCatalog + shown as error).
 */

import { useEffect, useState } from 'react'
import {
  fetchAdminCategories,
  createCategory,
  renameCategory,
  reorderCategories,
  deleteCategory,
  type Category,
} from '../../lib/adminCatalog'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

// ── CategoryRow ────────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: {
  category: Category
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onRename: (newName: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(category.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === category.name) { setEditing(false); return }
    setSaving(true)
    setError(null)
    try {
      await onRename(trimmed)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(`Delete category "${category.name}"? This cannot be undone.`)
    if (!ok) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.')
      setDeleting(false)
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${category.name} up`}
          className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20 transition-colors"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${category.name} down`}
          className="p-1 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20 transition-colors"
        >
          ▼
        </button>
      </div>

      {/* Name / edit input */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') { setEditing(false); setNameInput(category.name) }
              }}
              autoFocus
              className="flex-1 rounded-lg border border-brand-400 px-3 py-1.5 text-sm text-neutral-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={saving}
            />
            <Button size="sm" loading={saving} onClick={handleRename} id={`save-cat-${category.id}`}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNameInput(category.name) }}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-neutral-900 hover:text-brand-700 text-left truncate"
            title="Click to rename"
            id={`rename-cat-${category.id}`}
          >
            {category.name}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-error" role="alert">{error}</p>}
        <p className="text-xs text-neutral-400 font-mono mt-0.5">{category.slug}</p>
      </div>

      {/* Delete */}
      <Button
        size="sm"
        variant="danger"
        loading={deleting}
        onClick={handleDelete}
        id={`delete-cat-${category.id}`}
        aria-label={`Delete category ${category.name}`}
      >
        Delete
      </Button>
    </li>
  )
}

// ── AdminCategoriesPage ────────────────────────────────────────────────────────

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    fetchAdminCategories()
      .then((data) => { if (!cancelled) { setCategories(data); setLoading(false) } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load categories.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setAdding(true)
    setAddError(null)
    try {
      const created = await createCategory(trimmed)
      setCategories((prev) => [...prev, created])
      setNewName('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add category.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRename(id: string, newNameStr: string) {
    await renameCategory(id, newNameStr)
    setCategories((prev) =>
      prev.map((c) => c.id === id ? { ...c, name: newNameStr } : c),
    )
  }

  async function handleDelete(id: string) {
    await deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  async function move(index: number, direction: 'up' | 'down') {
    const newList = [...categories]
    const swap = direction === 'up' ? index - 1 : index + 1
    ;[newList[index], newList[swap]] = [newList[swap], newList[index]]
    setCategories(newList)
    try {
      await reorderCategories(newList.map((c) => c.id))
    } catch {
      // Rollback
      setCategories(categories)
    }
  }

  return (
    <>
      <title>Categories – Ecomverse Admin</title>
      <meta name="description" content="Manage product categories." />

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Categories</h1>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input
            id="new-category-name"
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setAddError(null) }}
            placeholder="New category name"
            disabled={adding}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button
            id="add-category-btn"
            type="submit"
            loading={adding}
            disabled={!newName.trim() || adding}
          >
            Add
          </Button>
        </form>
        {addError && <p className="mb-4 text-sm text-error" role="alert">{addError}</p>}

        {/* Loading / error */}
        {loading && <Spinner label="Loading categories…" />}
        {!loading && error && <ErrorMessage title="Could not load categories" message={error} />}

        {/* Empty */}
        {!loading && !error && categories.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-12">
            No categories yet. Add one above.
          </p>
        )}

        {/* List */}
        {!loading && !error && categories.length > 0 && (
          <ul role="list" className="flex flex-col gap-3">
            {categories.map((cat, idx) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                index={idx}
                total={categories.length}
                onMoveUp={() => move(idx, 'up')}
                onMoveDown={() => move(idx, 'down')}
                onRename={(n) => handleRename(cat.id, n)}
                onDelete={() => handleDelete(cat.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
