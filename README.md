# Ecomverse: backend setup and build plan

Stack: React (Vite) frontend on Vercel, Supabase (database, Google login, image storage, payment functions), Razorpay.

## 1. Database
1. Create a Supabase project.
2. SQL Editor > paste `supabase/migrations/20261010000000_init.sql` > Run (or, with the CLI linked, `supabase db push`). Future schema changes go in new files in `supabase/migrations/`.
   Optional for development: run `supabase/seed.sql` for placeholder products (delete them before launch).
3. Authentication > Providers > enable **Google**, paste the Client ID and Secret from your Google Cloud project, and add the redirect URL Supabase shows to the Google OAuth client.
4. Authentication > Users > Add user (client's email + password), then run:
   `update public.profiles set is_admin = true where email = 'client@example.com';`
5. Google consent screen: move it from Testing to In production before launch.

Notes
- Anyone could still try email signup; it is harmless because `is_admin` defaults to false and RLS blocks everything admin-only.
- Supplier link and cost live in `product_supplier_info`, visible only to admins.
- Shipping rule (free from Rs 500, else Rs 70) and the "9-10 days" text live in the one-row `store_settings` table.

## 2. Payment functions
Install the Supabase CLI, then from this folder:

```bash
supabase login
supabase link --project-ref <your-project-ref>

# Razorpay TEST keys first. Never put these in the frontend or in git.
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-string

supabase functions deploy create-order
supabase functions deploy verify-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Then in Razorpay Dashboard > Settings > Webhooks add:
- URL: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
- Events: `order.paid`, `payment.failed`
- Secret: the same `RAZORPAY_WEBHOOK_SECRET`

Switch to live keys only after a full test-mode run works.

## 3. Frontend payment flow (outline)
```ts
// 1) server creates the order and returns Razorpay details
const { data, error } = await supabase.functions.invoke('create-order', {
  body: { items: cart.map(i => ({ product_id: i.id, quantity: i.qty, variant: i.variant ?? null })) },
});

// 2) open Razorpay Checkout (script: https://checkout.razorpay.com/v1/checkout.js)
const rzp = new window.Razorpay({
  key: data.key_id,
  amount: data.amount,
  currency: data.currency,
  order_id: data.razorpay_order_id,
  name: 'Ecomverse',
  prefill: data.prefill,
  handler: async (res) => {
    // 3) server verifies the signature and marks the order paid
    const v = await supabase.functions.invoke('verify-payment', { body: res });
    // show on-screen order number: v.data.order_number
  },
});
rzp.open();
```

## 4. Pages
Customer: Home, Shop (category filter + search, load all ~20 products once and filter in the browser), Product, Cart (kept in localStorage), Login (Google), Account (single address), Checkout, Order success (shows order number), My orders (status + tracking number), About, Contact, Shipping, Returns, Privacy, Terms.

Admin (email + password): Orders (show only `payment_status = 'paid'` by default; status dropdown, tracking number field, supplier link per item), Products (add/edit, 3 images with in-browser compression to WebP about 1000px, supplier link and cost, in-stock toggle), Categories.

Admin orders query idea:
`orders(*, order_items(*, products(name, product_supplier_info(supplier_url))))`

## 5. Build order
1. Vite + React + Tailwind project, `vercel.json` rewrite: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
2. Supabase client + Google login + Account (address form with phone and pincode validation)
3. Catalog pages with placeholder products
4. Cart + checkout + the three functions, tested in Razorpay test mode
5. Admin portal
6. Policy pages (Razorpay needs them), then load the 20 real products and images
7. End-to-end test as a customer and as admin, then switch to live keys
