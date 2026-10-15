/**
 * orders.ts – Supabase query helpers for the customer My Orders page.
 *
 * Rules enforced:
 * - Only paid orders are fetched (payment_status = 'paid').
 * - Order items use the snapshot columns (product_name, unit_price, image_path, variant).
 *   We NEVER join to products on customer-facing queries.
 * - Never selects product_supplier_info (Hard Rule 4).
 */

import { supabase } from './supabase'
import { getImageUrl } from './catalog'
import type { Tables, Enums } from '../types/database'

export type OrderStatus = Enums<'order_status'>

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrderItemSnapshot {
  id: string
  product_name: string
  unit_price: number
  quantity: number
  variant: string | null
  image_path: string | null
  imageUrl: string | null
}

export interface CustomerOrder {
  id: string
  order_number: string
  created_at: string
  status: OrderStatus
  payment_status: Tables<'orders'>['payment_status']
  subtotal: number
  shipping_fee: number
  total: number
  tracking_number: string | null
  items: OrderItemSnapshot[]
}

// ── Status label map ───────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Order placed',
  ordered_from_supplier: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-brand-50 text-brand-700',
  ordered_from_supplier: 'bg-yellow-50 text-yellow-700',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

// ── Query ──────────────────────────────────────────────────────────────────────

/** Fetch the signed-in customer's paid orders, newest first. */
export async function fetchMyOrders(): Promise<CustomerOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id,
       order_number,
       created_at,
       status,
       payment_status,
       subtotal,
       shipping_fee,
       total,
       tracking_number,
       order_items ( id, product_name, unit_price, quantity, variant, image_path )`,
    )
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Could not load your orders. Please try again.')

  return (data ?? []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    payment_status: order.payment_status,
    subtotal: Number(order.subtotal),
    shipping_fee: Number(order.shipping_fee),
    total: Number(order.total),
    tracking_number: order.tracking_number,
    items: (order.order_items ?? []).map((item) => ({
      id: item.id,
      product_name: item.product_name,
      unit_price: Number(item.unit_price),
      quantity: item.quantity,
      variant: item.variant,
      image_path: item.image_path,
      imageUrl: item.image_path ? getImageUrl(item.image_path) : null,
    })),
  }))
}

/** Fetch store delivery estimate for the success page. */
export async function fetchDeliveryEstimate(): Promise<string> {
  const { data } = await supabase
    .from('store_settings')
    .select('delivery_estimate')
    .eq('id', 1)
    .single()
  return data?.delivery_estimate ?? '9-10 days'
}
