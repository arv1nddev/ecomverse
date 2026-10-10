// create-order
// Called from the checkout page. Prices, shipping and totals are calculated
// HERE from the database, never trusted from the browser.
//
// Request body: { items: [{ product_id: string, quantity: number, variant?: string | null }] }
// Needs the customer to be signed in (JWT sent automatically by supabase.functions.invoke).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const MAX_QTY_PER_ITEM = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CartItem = { product_id: string; quantity: number; variant?: string | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

  // 1. Who is calling?
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Please sign in first.' }, 401);
  const user = userData.user;

  const admin = createClient(supabaseUrl, serviceKey);

  // 2. Validate the cart shape
  let body: { items?: CartItem[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return json({ error: 'Your cart is empty.' }, 400);
  }
  for (const it of items) {
    if (
      typeof it.product_id !== 'string' ||
      !UUID_RE.test(it.product_id) ||
      !Number.isInteger(it.quantity) ||
      it.quantity < 1 ||
      it.quantity > MAX_QTY_PER_ITEM
    ) {
      return json({ error: 'Invalid cart item.' }, 400);
    }
  }

  // 3. Delivery address must be complete
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, phone, address_line, city, state, pincode')
    .eq('id', user.id)
    .single();
  if (
    !profile ||
    !profile.full_name || !profile.phone || !profile.address_line ||
    !profile.city || !profile.state || !profile.pincode
  ) {
    return json({ error: 'Please complete your delivery address first.' }, 400);
  }

  // 4. Load products from the database (prices come from here)
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, name, price, in_stock, is_active, variant_options, product_images(storage_path, sort_order)')
    .in('id', ids);
  if (productsError || !products) {
    console.error('products query failed', productsError);
    return json({ error: 'Could not load products. Please try again.' }, 500);
  }
  const byId = new Map(products.map((p) => [p.id, p]));

  // 5. Build order lines; work in paise (integers) to avoid rounding errors
  let subtotalPaise = 0;
  const lines: {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    variant: string | null;
    image_path: string | null;
  }[] = [];

  for (const it of items) {
    const p = byId.get(it.product_id);
    if (!p || !p.is_active || !p.in_stock) {
      return json({ error: `"${p?.name ?? 'An item'}" is no longer available.` }, 409);
    }
    const options: string[] = p.variant_options ?? [];
    const variant = it.variant ?? null;
    const variantOk = options.length > 0 ? variant !== null && options.includes(variant) : variant === null;
    if (!variantOk) return json({ error: `Please choose a valid option for "${p.name}".` }, 400);

    const unitPaise = Math.round(Number(p.price) * 100);
    subtotalPaise += unitPaise * it.quantity;

    const firstImage = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    lines.push({
      product_id: p.id,
      product_name: p.name,
      unit_price: unitPaise / 100,
      quantity: it.quantity,
      variant,
      image_path: firstImage?.storage_path ?? null,
    });
  }

  // 6. Shipping rule from store_settings (free above threshold, otherwise flat fee)
  const { data: settings } = await admin
    .from('store_settings')
    .select('free_shipping_threshold, shipping_fee')
    .eq('id', 1)
    .single();
  if (!settings) return json({ error: 'Store settings missing.' }, 500);

  const thresholdPaise = Math.round(Number(settings.free_shipping_threshold) * 100);
  const shippingPaise = subtotalPaise >= thresholdPaise ? 0 : Math.round(Number(settings.shipping_fee) * 100);
  const totalPaise = subtotalPaise + shippingPaise;

  // 7. Save the order as "pending" first (gives us the order number)
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      user_id: user.id,
      subtotal: subtotalPaise / 100,
      shipping_fee: shippingPaise / 100,
      total: totalPaise / 100,
      ship_name: profile.full_name,
      ship_phone: profile.phone,
      ship_address: profile.address_line,
      ship_city: profile.city,
      ship_state: profile.state,
      ship_pincode: profile.pincode,
    })
    .select('id, order_number')
    .single();
  if (orderError || !order) {
    console.error('order insert failed', orderError);
    return json({ error: 'Could not create your order. Please try again.' }, 500);
  }

  const { error: itemsError } = await admin
    .from('order_items')
    .insert(lines.map((l) => ({ ...l, order_id: order.id })));
  if (itemsError) {
    console.error('order_items insert failed', itemsError);
    await admin.from('orders').delete().eq('id', order.id); // never paid, safe to remove
    return json({ error: 'Could not create your order. Please try again.' }, 500);
  }

  // 8. Create the Razorpay order (amount is in paise)
  const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
    },
    body: JSON.stringify({
      amount: totalPaise,
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id },
    }),
  });
  if (!rzpResponse.ok) {
    console.error('razorpay order failed', rzpResponse.status, await rzpResponse.text());
    await admin.from('orders').delete().eq('id', order.id);
    return json({ error: 'Could not start the payment. Please try again.' }, 502);
  }
  const rzpOrder = await rzpResponse.json();

  const { error: linkError } = await admin
    .from('orders')
    .update({ razorpay_order_id: rzpOrder.id })
    .eq('id', order.id);
  if (linkError) {
    console.error('linking razorpay order failed', linkError);
    return json({ error: 'Could not start the payment. Please try again.' }, 500);
  }

  // 9. Everything the browser needs to open Razorpay Checkout
  return json({
    order_number: order.order_number,
    razorpay_order_id: rzpOrder.id,
    amount: totalPaise,
    currency: 'INR',
    key_id: razorpayKeyId, // public key id only, never the secret
    prefill: { name: profile.full_name, email: user.email ?? '', contact: profile.phone },
  });
});
