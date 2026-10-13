# Agent prompts: run in order, one task per session

How to use
1. Do `docs/OWNER_CHECKLIST.md` Part A once (env file, logo, redirect URLs, admin user).
2. For each task: start a NEW agent session, paste the **Common prefix**, then ONE task prompt.
3. Test the result yourself (each task ends with how), then `git commit`. Only then move on.
4. If a session stops halfway, start a new one with the same prompt plus: "Continue where docs/PROGRESS.md and the git diff show we stopped."

## Common prefix (paste first, every time)
```
Read AGENTS.md, docs/PROJECT_BRIEF.md, docs/PROGRESS.md and README.md fully before doing anything. Follow the Boundaries and Hard rules in AGENTS.md exactly. Do ONLY the task below, nothing extra. If something is undecided, follow "Undecided items" in AGENTS.md and keep going. When finished: run npm run build and npm run lint and fix problems, append an entry to docs/PROGRESS.md, then reply with: (1) files changed, (2) what you did NOT touch, (3) OWNER TO CONFIRM / TODO(owner) items, (4) Human actions needed with exact commands or dashboard steps, (5) how I can test it.
```

---

## Task 1: Project scaffold and foundations
```
Create the frontend inside this existing folder: Vite + React + TypeScript, Tailwind CSS, React Router, ESLint (Vite template defaults) and Prettier. Do NOT overwrite or delete AGENTS.md, CLAUDE.md, README.md, docs/, supabase/, .gitignore, .env.example or vercel.json (if the Vite generator wants to, scaffold in a temp folder and copy files across, merging .gitignore). Then:
- src/lib/supabase.ts (client from VITE_ env vars, with a clear error if missing), src/lib/money.ts, src/lib/validation.ts (phone and pincode rules from AGENTS.md).
- Theme tokens in src/index.css / Tailwind theme (neutral palette, one accent; easy to change in one place). Use public/logo.* if present, otherwise a text wordmark "Ecomverse".
- Layout with Header (logo, Shop, Cart with item count badge, Login or Account), mobile menu, Footer (policy links, contact email ecomversee@gmail.com). Shared UI components: Button, Input, Spinner, ErrorMessage, EmptyState.
- Routes for every page in docs/PROJECT_BRIEF.md section 5 as simple placeholder pages, plus a 404 page. Admin routes live under /admin.
- Add package.json scripts: dev, build, lint, format. Update README with run instructions.
Do not build any real features yet.
```
Test: `npm install && npm run dev` opens a styled shell; every route loads; `npm run build` passes.
Human actions: create `.env` (see checklist); generate DB types after this task.

## Task 2: Auth and Account
```
Build authentication and the Account page.
- AuthContext: session, user, profile (from public.profiles), isAdmin, loading, signInWithGoogle(returnPath), signOut. Remember the page the user came from (sessionStorage) and navigate back after Google login. Handle the brief delay before the profile row exists (retry a few times).
- Login page: one "Continue with Google" button, friendly error handling.
- RequireAuth route guard (redirect to /login and come back afterwards). Header shows Login or the user's name with menu: Account, My orders, Logout.
- Account page: form for the single delivery address (name, phone, address, city, state with an Indian state dropdown, pincode) with validation from src/lib/validation.ts, save with a profile update that sends ONLY the allowed columns, success and error messages.
Do not build checkout or admin yet.
```
Test: Google login works on localhost and the Vercel URL; saving an address persists after refresh; bad phone/pincode show clear messages.

## Task 3: Catalog (Home, Shop, Product)
```
Build the public catalog using real Supabase queries (seed products are fine).
- Home: hero with brand line and a "Shop now" button, category tiles, a grid of latest products.
- Shop: load all active products once (about 20), category filter, text search (client-side, name and description), sort by price low/high and newest, loading/empty/error states.
- ProductCard and Product page (/product/:slug): image gallery with up to 5 images (placeholder when none), name, price, short description, feature bullets, variant picker when variant_options is not empty, quantity selector, "Add to cart" (disabled and labelled "Out of stock" when in_stock is false), delivery text "Delivery in <store_settings.delivery_estimate>", and the shipping rule text (free above Rs 500, else Rs 70) read from store_settings.
- Never query product_supplier_info here.
Cart contents are wired in the next task; for now Add to cart may call a stub from CartContext.
```
Test: shop filters and search work; out-of-stock sample product cannot be added; page works on a phone.

## Task 4: Cart
```
Build the cart.
- CartContext persisted in localStorage storing only product_id, quantity (1 to 10) and variant. Prices and names are re-fetched from Supabase for display so they are never stale. Remove items that are no longer active, and tell the user.
- Cart page: list items with image, name, variant, quantity stepper, remove, line total; summary with subtotal, shipping (free at Rs 500 or more, else Rs 70, from store_settings), total, and a "Proceed to checkout" button (goes to /checkout; the guard handles login). Empty-cart state. Header badge updates.
- Show a helpful hint such as "Add Rs X more for free shipping".
```
Test: cart survives refresh; shipping changes at the Rs 500 line (use seed products Rs 149 and Rs 649).

## Task 5: Checkout, Razorpay, Order success, My orders
```
Build checkout using the existing Edge Functions (do not modify them).
- /checkout (RequireAuth): show delivery address (with link to Account; block payment with a clear message until the address is complete), order summary, and a Pay button.
- On Pay: call supabase.functions.invoke('create-order', { body: { items } }) with items [{ product_id, quantity, variant }]. Show friendly messages from error.context.json().error. Load Razorpay Checkout.js dynamically, open it with key_id, amount, currency, order_id and prefill exactly as returned. In the handler call verify-payment with the full Razorpay response, then clear the cart and go to /order-success/:orderNumber. Follow every Razorpay rule in AGENTS.md "Gotchas" (disable button while processing, payment.failed, dismissal, verify failure after payment).
- /order-success/:orderNumber: shows the order number, a thank-you, the delivery text, and a link to My orders. Only the owner of the order can see it (RLS).
- /orders (My orders, RequireAuth): list the customer's PAID orders newest first with order number, date, status label, tracking number if present, items (from order_items snapshots), shipping and total. Friendly labels for the five statuses.
Use test mode only.
```
Test with Razorpay test credentials (see docs/OWNER_CHECKLIST.md Part C): success, failure, closing the tab right after paying (webhook), and Rs 70 shipping vs free.

## Task 6: Admin shell, login and Orders
```
Build the admin area under /admin.
- /admin/login: email + password (supabase.auth.signInWithPassword). After login, load the profile; if not is_admin, sign out and show "You are not authorized". RequireAdmin guard for all other /admin routes (non-admins go to the home page). Simple admin layout with nav: Orders, Products, Categories, Logout.
- /admin/orders: paid orders only by default, newest first, status filter tabs (New, Ordered from supplier, Shipped, Delivered, Cancelled, All). Each order card shows order number, date, customer name, phone, full shipping address, items with variant and quantity, a clickable supplier link per item (opens in a new tab), subtotal, shipping, total. Controls: status dropdown (saves immediately, with a confirmation when choosing Cancelled) and a tracking number field with Save. Optimistic UI with error rollback.
Use the query in AGENTS.md "Gotchas". Do not build products or categories yet.
```
Test: a test-paid order appears; status and tracking updates show on the customer's My orders; non-admin cannot reach /admin pages or read supplier data.

## Task 7: Admin Products and Categories (with image upload)
```
Build admin catalog management.
- /admin/products: table/list of all products (including inactive) with image, name, category, price, in-stock and active toggles, Edit and "Add product" buttons. Never hard-delete; use the Active toggle.
- Product form (add/edit): name, slug (auto from name, editable, unique), category, price, short description, feature bullets (add/remove lines), variant options (comma separated or chips; empty = none), supplier URL, supplier cost (saved to product_supplier_info), in-stock, active.
- Image upload: up to 5 images per product (3 expected). Compress in the browser with browser-image-compression to WebP, about 1000 px max side, then upload to the product-images bucket at products/<product_id>/<random-uuid>.webp and insert a product_images row. Allow reorder / "make main" (sort_order 0) and delete (remove storage object and row). Show upload progress and errors.
- /admin/categories: add, rename, reorder, delete only if no products use it.
Admin-only, all via RLS-protected queries.
```
Test: create a product with 3 images; it shows up in the shop with the right main image; supplier fields never appear in customer network calls.

## Task 8: Static and policy pages
```
Build About, Contact, Shipping, Returns and refunds, Privacy and Terms pages using the text in docs/POLICIES_DRAFT.md. Keep every [OWNER TO CONFIRM: ...] marker visible in the source and list them in your report; do not invent or remove policy content. Contact page shows ecomversee@gmail.com as a mailto link (no contact form, no emails sent). Footer links to all of them. Set page titles and meta descriptions.
```

## Task 9: Polish and robustness
```
Review the whole app for quality without adding features: mobile layout at 360 px wide, loading/empty/error states everywhere, a React error boundary, 404 page, consistent spacing and typography, button disabled states, form validation messages, image alt text, keyboard focus, page titles, favicon and social preview meta, and performance basics (lazy-load images and routes). Fix console errors and warnings. Remove dead code. Make sure no secret or service key is referenced anywhere in src/.
```

## Task 10: Full verification and security pass
```
Do a verification pass, changing code only to fix real bugs. Walk through every item of the acceptance checklist in docs/PROJECT_BRIEF.md section 11 and report PASS/FAIL/NOT TESTABLE for each, with reasons. Then audit: (a) grep src/ for any use of service role keys, Razorpay secrets or product_supplier_info outside admin pages; (b) confirm no customer page selects supplier data; (c) confirm profile updates send only allowed columns; (d) confirm the browser never sends prices or totals to create-order; (e) confirm npm run build and npm run lint pass; (f) list every remaining OWNER TO CONFIRM / TODO(owner). Write the results to docs/VERIFICATION.md.
```

---

## Recovery prompts
- **Build or lint fails and the agent loops:** "Stop. Show me the exact error and the last three changes. Fix only the root cause; do not disable lint rules or loosen TypeScript."
- **Agent wants to change the schema or payment functions:** "Do not edit existing migrations or functions. Explain the problem and propose a NEW migration or the exact change, and wait."
- **Agent adds an out-of-scope feature:** "Remove it. Re-read the Out of scope list in AGENTS.md."
- **Agent asks about an undecided policy:** "Follow Undecided items in AGENTS.md: simplest option, mark it OWNER TO CONFIRM, continue."
