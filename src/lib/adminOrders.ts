/**
 * adminOrders.ts – Supabase query and mutation helpers for the admin orders page.
 *
 * Query from AGENTS.md Gotchas (admin only):
 *   orders(*, order_items(*, products(name, product_supplier_info(supplier_url))))
 *   filtered by payment_status = 'paid'
 *
 * Rules:
 * - product_supplier_info is ONLY used here (admin context). Never on customer pages.
 * - RLS enforces is_admin on product_supplier_info; the anon key will return nothing
 *   for non-admins, so this is safe even if the frontend is inspected.
 */

import { supabase } from './supabase'
import type { Enums } from '../types/database'

export type OrderStatus = Enums<'order_status'>

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AdminOrderItem {
  id: string
  product_id: string
  product_name: string   // snapshot
  unit_price: number     // snapshot
  quantity: number
  variant: string | null
  image_path: string | null
  /** Supplier URL from product_supplier_info (admin only). May be null. */
  supplier_url: string | null
}

export interface AdminOrder {
  id: string
  order_number: string
  created_at: string
  status: OrderStatus
  payment_status: string
  subtotal: number
  shipping_fee: number
  total: number
  tracking_number: string | null
  // Snapshot shipping address
  ship_name: string
  ship_phone: string
  ship_address: string
  ship_city: string
  ship_state: string
  ship_pincode: string
  items: AdminOrderItem[]
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

/** Fetch ALL paid orders for the admin, newest first. */
export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  // Exact query from AGENTS.md Gotchas section
  const { data, error } = await supabase
    .from('orders')
    .select(
      `*,
       order_items(
         *,
         products(
           name,
           product_supplier_info( supplier_url )
         )
       )`,
    )
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Could not load orders. Please try again.')

  return (data ?? []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status as OrderStatus,
    payment_status: order.payment_status,
    subtotal: Number(order.subtotal),
    shipping_fee: Number(order.shipping_fee),
    total: Number(order.total),
    tracking_number: order.tracking_number,
    ship_name: order.ship_name,
    ship_phone: order.ship_phone,
    ship_address: order.ship_address,
    ship_city: order.ship_city,
    ship_state: order.ship_state,
    ship_pincode: order.ship_pincode,
    items: (order.order_items ?? []).map(
      (item: {
        id: string
        product_id: string
        product_name: string
        unit_price: number
        quantity: number
        variant: string | null
        image_path: string | null
        products: { name: string; product_supplier_info: { supplier_url: string | null } | null } | null
      }) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
        variant: item.variant,
        image_path: item.image_path,
        supplier_url:
          item.products?.product_supplier_info?.supplier_url ?? null,
      }),
    ),
  }))
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/** Update the status of an order. Admin only (RLS). */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  if (error) throw new Error('Could not update status. Please try again.')
}

/** Update the tracking number of an order. Admin only (RLS). */
export async function updateTrackingNumber(
  orderId: string,
  trackingNumber: string,
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ tracking_number: trackingNumber.trim() || null })
    .eq('id', orderId)
  if (error) throw new Error('Could not save tracking number. Please try again.')
}
