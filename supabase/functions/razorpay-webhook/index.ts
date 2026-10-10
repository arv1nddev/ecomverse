// razorpay-webhook
// Safety net: if a customer pays and then closes the tab before verify-payment
// runs, Razorpay calls this URL so the order still gets marked as paid.
//
// In the Razorpay Dashboard (Settings > Webhooks) add:
//   URL:    https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook
//   Events: order.paid, payment.failed
//   Secret: the same value you store as RAZORPAY_WEBHOOK_SECRET
//
// This function must be deployed with JWT verification OFF (Razorpay does not
// send a Supabase token). The signature check below is what protects it.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { hmacSha256Hex, safeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;
  const rawBody = await req.text(); // must be the untouched body for the signature check
  const received = req.headers.get('x-razorpay-signature') ?? '';

  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  if (!safeEqual(expected, received)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (event.event === 'order.paid') {
    const orderId: string | undefined = event.payload?.order?.entity?.id;
    const paymentId: string | undefined = event.payload?.payment?.entity?.id;
    if (orderId) {
      const update: Record<string, string> = { payment_status: 'paid' };
      if (paymentId) update.razorpay_payment_id = paymentId;
      const { error } = await admin.from('orders').update(update).eq('razorpay_order_id', orderId);
      if (error) {
        console.error('webhook: could not mark paid', error);
        return new Response('Server error', { status: 500 }); // Razorpay will retry
      }
    }
  } else if (event.event === 'payment.failed') {
    const orderId: string | undefined = event.payload?.payment?.entity?.order_id;
    if (orderId) {
      // Only downgrade pending orders; a customer may retry and pay successfully later
      const { error } = await admin
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('razorpay_order_id', orderId)
        .eq('payment_status', 'pending');
      if (error) {
        console.error('webhook: could not mark failed', error);
        return new Response('Server error', { status: 500 });
      }
    }
  }

  return new Response('ok', { status: 200 });
});
