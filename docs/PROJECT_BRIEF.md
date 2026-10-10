# Ecomverse: Project Brief

## 1. Overview
Ecomverse is a simple online store for a friend ("the client"). He sells ~20 products from suppliers (dropshipping). When a customer pays, the order appears in an admin portal and the client orders from the supplier himself, by hand. There is no automation with suppliers.

Goals: look secure and professional, work reliably, cost nothing to run, stay simple.

## 2. Client constraints
- As simple and manual as possible: no supplier APIs, no CSV import.
- Everything free (hosting, database, auth). No phone OTP, no paid email service.
- Orders are viewed in a portal only (no email alerts). No urgency; 1 to 2 admin users.
- India only. No cash on delivery. Payments via Razorpay (client has set up the account).
- Not GST registered: no tax lines or GST invoices; prices are final.

## 3. Customer flow
1. Browse home, shop (category filter + search), product pages. No login needed.
2. Add to cart (kept in localStorage). Free shipping from Rs 500, else Rs 70.
3. Checkout requires Google sign-in. If the delivery address is incomplete, the customer fills it in on the Account page (name, phone, address, city, state, pincode).
4. Customer reviews the order summary (items, shipping, total) and pays with Razorpay.
5. After successful payment, the page shows the order number on screen. No email is sent.
6. "My orders" shows each order's status and tracking number as the client updates them.

## 4. Admin flow (email + password)
- **Orders:** list of paid orders (default). Filter by status. For each order show customer name, phone, full address, items (with variant and quantity), supplier link for each item, total. Change status (`new` > `ordered_from_supplier` > `shipped` > `delivered`, or `cancelled`) and type the tracking number.
- **Products:** add and edit products: name, category, price, short description, key feature bullets, variant options (or none), supplier link, supplier cost, 3 images (compressed in the browser to WebP about 1000 px before upload), in-stock toggle, active toggle. Hide products instead of deleting them.
- **Categories:** add, rename, reorder.
- Shipping threshold, shipping fee and delivery text can be changed in `store_settings` (SQL for now; no UI needed).

## 5. Pages
Customer: Home, Shop, Product, Cart, Login, Account (address), Checkout, Order success, My orders, About, Contact (shows ecomversee@gmail.com), Shipping, Returns and refunds, Privacy, Terms.
Admin: Login, Orders, Products (list + form), Categories.

Show "Delivery in 9-10 days" on product pages, checkout and the Shipping page.

## 6. Data model (summary; see migrations for truth)
`profiles` (address + is_admin), `store_settings`, `categories`, `products`, `product_images`, `product_supplier_info` (admin only), `orders`, `order_items`. Storage bucket `product-images` (public read, admin write).

## 7. Payment flow
1. Browser calls `create-order` with `{ product_id, quantity, variant }` items.
2. Server validates stock and active flags, takes prices from the database, applies the shipping rule, saves a pending order, creates the Razorpay order and returns checkout details.
3. Browser opens Razorpay Checkout. On success it calls `verify-payment` with Razorpay's response; the server checks the signature and marks the order paid.
4. `razorpay-webhook` (events `order.paid`, `payment.failed`) is the backup if the tab closes after paying.
Test mode first; live keys only after a full end-to-end test.

## 8. Policies (owner decisions so far)
- Refund only if a payment was charged but failed. No refund after delivery.
- Shipping: free above Rs 500, otherwise Rs 70; delivery in 9-10 days.
- Still undecided (mark as `TODO(owner)`, do not invent): what happens if the supplier is out of stock after payment; damaged or wrong item; whether 9-10 days means calendar or business days; whether to name a grievance contact beyond the email.
- Policy pages are needed before Razorpay live approval. Drafts must be reviewed by the owner; they are not legal advice.

## 9. Content still needed from the client
- Sheet with 20 products: name, category, selling price, short description, key features, variants, in stock, supplier link, supplier cost.
- Drive folder with 3 images per product (P01-1, P01-2, P01-3), no watermarks.
- Theme/colors (logo is available). Until decided: neutral palette taken from the logo.
Until then use `supabase/seed.sql` placeholders.

## 10. Known risks and open items
- Vercel's free Hobby plan is meant for non-commercial use; a live store may need a different plan or host. Keep the frontend portable (plain Vite SPA, payment logic in Supabase functions).
- Free Supabase projects can pause after inactivity and have storage limits (60 compressed images should fit).
- Google OAuth consent screen must be set to "In production" before launch, with a privacy policy link.
- Anyone can attempt email signup; harmless because `is_admin` defaults to false and RLS blocks admin data.

## 11. Acceptance checklist
- [ ] Google login works; admin email login works; non-admin cannot open admin pages or read admin data.
- [ ] Customer cannot see supplier links or costs (check network responses).
- [ ] Cart persists after refresh; incomplete address blocks checkout with a clear message.
- [ ] Shipping: Rs 70 below Rs 500, free at Rs 500 or more; total matches Razorpay amount.
- [ ] Test payment succeeds: order is `paid`, order number shown, order appears in admin.
- [ ] Failed or abandoned payment: order is not paid and not shown in admin by default.
- [ ] Closing the tab right after paying still ends up `paid` (webhook).
- [ ] Out-of-stock and inactive products cannot be bought.
- [ ] Admin status and tracking updates show up in "My orders".
- [ ] Works well on a phone; `npm run build` passes.
