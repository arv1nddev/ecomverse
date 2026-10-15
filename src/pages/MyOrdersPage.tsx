/**
 * MyOrdersPage – /orders (RequireAuth)
 *
 * Lists the signed-in customer's paid orders, newest first.
 * Items are shown from order_items snapshots (product_name, unit_price, image_path, variant).
 * Never joins to products – we use the snapshot. (Hard Rule re: RLS / stale data)
 *
 * Shows: order number, date, status badge, tracking number (when available),
 * item list with image/name/variant/qty, shipping fee and order total.
 * Friendly labels for all five order statuses.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchMyOrders,
  STATUS_LABELS,
  STATUS_COLORS,
  type CustomerOrder,
} from '../lib/orders'
import { formatINR } from '../lib/money'
import { Spinner } from '../components/ui/Spinner'
import { ErrorMessage } from '../components/ui/ErrorMessage'

// ── Date formatter ─────────────────────────────────────────────────────────────

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso))
  } catch {
    return iso
  }
}

// ── OrderCard ──────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: CustomerOrder }) {
  const statusLabel = STATUS_LABELS[order.status]
  const statusColor = STATUS_COLORS[order.status]

  return (
    <article
      className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      aria-label={`Order ${order.order_number}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-neutral-100 bg-neutral-50">
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Order</p>
          <p
            className="mt-0.5 text-base font-bold tracking-wide text-neutral-900"
            id={`order-${order.order_number}`}
          >
            {order.order_number}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{formatDate(order.created_at)}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Status badge */}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
            aria-label={`Status: ${statusLabel}`}
          >
            {statusLabel}
          </span>

          {/* Tracking number */}
          {order.tracking_number && (
            <div className="text-right">
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                Tracking
              </p>
              <p className="text-xs font-mono font-semibold text-neutral-700">
                {order.tracking_number}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <ul role="list" className="divide-y divide-neutral-100 px-5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-4">
            {/* Image */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.product_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-neutral-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {item.product_name}
              </p>
              {item.variant && (
                <p className="text-xs text-neutral-500">{item.variant}</p>
              )}
              <p className="text-xs text-neutral-500 mt-0.5">
                {formatINR(item.unit_price)} × {item.quantity}
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold text-neutral-900">
              {formatINR(item.unit_price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {/* Footer: totals */}
      <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <dt>Subtotal</dt>
            <dd>{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-neutral-600">
            <dt>Shipping</dt>
            <dd className={order.shipping_fee === 0 ? 'text-success font-medium' : ''}>
              {order.shipping_fee === 0 ? 'Free' : formatINR(order.shipping_fee)}
            </dd>
          </div>
          <div className="flex justify-between font-semibold text-neutral-900 border-t border-neutral-200 pt-1.5">
            <dt>Total</dt>
            <dd className="text-base font-bold">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

// ── MyOrdersPage ───────────────────────────────────────────────────────────────

export function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    fetchMyOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your orders. Please try again.',
          )
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <title>My Orders – Ecomverse</title>
      <meta name="description" content="View your order history and delivery tracking." />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">My orders</h1>

        {/* Loading */}
        {loading && (
          <div className="mt-12">
            <Spinner label="Loading your orders…" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8">
            <ErrorMessage title="Could not load orders" message={error} />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-neutral-800">No orders yet</p>
              <p className="mt-1 text-sm text-neutral-500">
                Your completed orders will appear here.
              </p>
            </div>
            <Link
              to="/shop"
              id="orders-empty-shop-link"
              className="mt-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Start shopping
            </Link>
          </div>
        )}

        {/* Order list */}
        {!loading && !error && orders.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
