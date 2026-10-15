/**
 * AdminOrdersPage – /admin/orders
 *
 * Features:
 * - Status filter tabs: New, Ordered from supplier, Shipped, Delivered, Cancelled, All.
 *   Default: paid orders only (all statuses included, "New" tab selected by default since
 *   those are the actionable ones — "All" shows everything).
 * - Each order card: order number, date, customer name, phone, full address,
 *   items (snapshot name + variant + qty + line total + clickable supplier link),
 *   subtotal, shipping, total.
 * - Status dropdown: saves immediately with optimistic UI + error rollback.
 *   Selecting "Cancelled" requires a window.confirm confirmation first.
 * - Tracking number field: free text input, "Save" button, saves on click.
 *   Optimistic UI: shows the new value immediately, rolls back on error.
 *
 * Security: supplier links are only visible here (admin area). RLS enforces
 * is_admin on product_supplier_info; never shown on customer pages.
 */

import { useEffect, useRef, useState } from 'react'
import {
  fetchAdminOrders,
  updateOrderStatus,
  updateTrackingNumber,
  type AdminOrder,
  type OrderStatus,
} from '../../lib/adminOrders'
import { formatINR } from '../../lib/money'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorMessage } from '../../components/ui/ErrorMessage'

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'new',
  'ordered_from_supplier',
  'shipped',
  'delivered',
  'cancelled',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  ordered_from_supplier: 'Ordered from supplier',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  new: 'bg-brand-50 text-brand-700 border-brand-200',
  ordered_from_supplier: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

type TabFilter = OrderStatus | 'all'

const TAB_LABELS: { filter: TabFilter; label: string }[] = [
  { filter: 'new', label: 'New' },
  { filter: 'ordered_from_supplier', label: 'Ordered' },
  { filter: 'shipped', label: 'Shipped' },
  { filter: 'delivered', label: 'Delivered' },
  { filter: 'cancelled', label: 'Cancelled' },
  { filter: 'all', label: 'All' },
]

// ── Date formatter ─────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(iso: string): string {
  try { return dateFormatter.format(new Date(iso)) } catch { return iso }
}

// ── TrackingField ──────────────────────────────────────────────────────────────

function TrackingField({
  orderId,
  initialValue,
  onSaved,
}: {
  orderId: string
  initialValue: string | null
  onSaved: (orderId: string, value: string) => void
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (saving) return
    setError(null)
    setSaving(true)
    const prev = initialValue ?? ''
    try {
      await updateTrackingNumber(orderId, value)
      onSaved(orderId, value.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setValue(prev) // rollback
      setError(err instanceof Error ? err.message : 'Could not save tracking number.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`tracking-${orderId}`}
        className="text-xs font-medium text-neutral-500 uppercase tracking-wide"
      >
        Tracking number
      </label>
      <div className="flex gap-2">
        <input
          id={`tracking-${orderId}`}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          disabled={saving}
          placeholder="Enter tracking number"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-neutral-50 disabled:cursor-not-allowed"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
          aria-label={`Save tracking number for order`}
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      {error && <p className="text-xs text-error" role="alert">{error}</p>}
    </div>
  )
}

// ── StatusDropdown ─────────────────────────────────────────────────────────────

function StatusDropdown({
  orderId,
  currentStatus,
  onChange,
}: {
  orderId: string
  currentStatus: OrderStatus
  onChange: (orderId: string, newStatus: OrderStatus) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevRef = useRef(currentStatus)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OrderStatus
    if (newStatus === currentStatus) return

    // Confirm cancellation
    if (newStatus === 'cancelled') {
      const ok = window.confirm(
        `Are you sure you want to cancel order? This cannot be undone.`,
      )
      if (!ok) return
    }

    // Optimistic update
    prevRef.current = currentStatus
    onChange(orderId, newStatus)
    setSaving(true)
    setError(null)

    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (err) {
      // Rollback
      onChange(orderId, prevRef.current)
      setError(err instanceof Error ? err.message : 'Could not update status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`status-${orderId}`}
        className="text-xs font-medium text-neutral-500 uppercase tracking-wide"
      >
        Status
      </label>
      <select
        id={`status-${orderId}`}
        value={currentStatus}
        onChange={handleChange}
        disabled={saving}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error" role="alert">{error}</p>}
    </div>
  )
}

// ── OrderCard ──────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onStatusChange,
  onTrackingSaved,
}: {
  order: AdminOrder
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  onTrackingSaved: (orderId: string, value: string) => void
}) {
  return (
    <article
      className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      aria-label={`Order ${order.order_number}`}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-neutral-50 px-5 py-4 border-b border-neutral-100">
        <div>
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Order number</p>
          <p className="mt-0.5 text-base font-bold text-neutral-900 tracking-wide">
            {order.order_number}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{formatDate(order.created_at)}</p>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE[order.status]}`}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
        {/* ── Left: customer + items ── */}
        <div className="flex flex-col gap-5">

          {/* Customer info */}
          <section aria-label="Customer details">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
              Customer
            </p>
            <p className="font-semibold text-neutral-900">{order.ship_name}</p>
            <p className="text-sm text-neutral-600">{order.ship_phone}</p>
            <address className="mt-1 not-italic text-sm text-neutral-600 leading-relaxed">
              {order.ship_address},{' '}
              {order.ship_city}, {order.ship_state} – {order.ship_pincode}
            </address>
          </section>

          {/* Items */}
          <section aria-label="Order items">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
              Items
            </p>
            <ul role="list" className="flex flex-col gap-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-neutral-500">
                      {item.variant ? `${item.variant} · ` : ''}
                      Qty: {item.quantity} · {formatINR(item.unit_price)} each
                    </p>
                    {/* Supplier link — admin only */}
                    {item.supplier_url ? (
                      <a
                        href={item.supplier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                        aria-label={`Supplier link for ${item.product_name}`}
                      >
                        Supplier link
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="mt-0.5 text-xs text-neutral-400">No supplier link</span>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-neutral-900">
                    {formatINR(item.unit_price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Totals */}
          <dl className="flex flex-col gap-1.5 text-sm border-t border-neutral-100 pt-4">
            <div className="flex justify-between text-neutral-600">
              <dt>Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-neutral-600">
              <dt>Shipping</dt>
              <dd className={order.shipping_fee === 0 ? 'text-green-600 font-medium' : ''}>
                {order.shipping_fee === 0 ? 'Free' : formatINR(order.shipping_fee)}
              </dd>
            </div>
            <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-200 pt-1.5">
              <dt>Total</dt>
              <dd className="text-base">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* ── Right: controls ── */}
        <div className="flex flex-col gap-4 border-t border-neutral-100 pt-5 md:border-t-0 md:border-l md:pl-5 md:pt-0">
          <StatusDropdown
            orderId={order.id}
            currentStatus={order.status}
            onChange={onStatusChange}
          />
          <TrackingField
            orderId={order.id}
            initialValue={order.tracking_number}
            onSaved={onTrackingSaved}
          />
        </div>
      </div>
    </article>
  )
}

// ── AdminOrdersPage ────────────────────────────────────────────────────────────

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabFilter>('new')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    fetchAdminOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load orders. Please try again.',
          )
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  /** Optimistic status update in local state. */
  function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    )
  }

  /** Optimistic tracking number update in local state. */
  function handleTrackingSaved(orderId: string, value: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, tracking_number: value || null } : o,
      ),
    )
  }

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter((o) => o.status === activeTab)

  return (
    <>
      <title>Orders – Ecomverse Admin</title>
      <meta name="description" content="Manage customer orders." />

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Orders</h1>
          {!loading && !error && (
            <p className="text-sm text-neutral-500">
              {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
            </p>
          )}
        </div>

        {/* Status filter tabs */}
        <div
          className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none"
          role="tablist"
          aria-label="Filter by status"
        >
          {TAB_LABELS.map(({ filter, label }) => {
            const count = filter === 'all'
              ? orders.length
              : orders.filter((o) => o.status === filter).length
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={activeTab === filter}
                onClick={() => setActiveTab(filter)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === filter
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === filter
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Loading */}
        {loading && <Spinner label="Loading orders…" />}

        {/* Error */}
        {!loading && error && (
          <ErrorMessage title="Could not load orders" message={error} />
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center">
            <p className="text-neutral-500">
              {activeTab === 'all'
                ? 'No paid orders yet.'
                : `No orders with status "${TAB_LABELS.find((t) => t.filter === activeTab)?.label}".`}
            </p>
          </div>
        )}

        {/* Order list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-6">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                onTrackingSaved={handleTrackingSaved}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
