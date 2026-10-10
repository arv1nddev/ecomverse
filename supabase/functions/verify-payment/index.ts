// verify-payment
// Called by the browser right after Razorpay Checkout succeeds.
// Request body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { hmacSha256Hex, safeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Please sign in first.' }, 401);

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: 'Missing payment details.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // The order must exist and belong to the signed-in customer
  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, user_id')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();
  if (!order || order.user_id !== userData.user.id) {
    return json({ error: 'Order not found.' }, 404);
  }

  // Razorpay signs "order_id|payment_id" with your key secret
  const expected = await hmacSha256Hex(razorpayKeySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!safeEqual(expected, razorpay_signature)) {
    console.error('invalid payment signature for order', order.order_number);
    return json({ error: 'Payment could not be verified.' }, 400);
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ payment_status: 'paid', razorpay_payment_id })
    .eq('id', order.id);
  if (updateError) {
    console.error('could not mark order paid', updateError);
    return json({ error: 'Payment received but order update failed. Please contact support.' }, 500);
  }

  return json({ order_number: order.order_number });
});
