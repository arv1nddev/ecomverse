# Owner checklist (the things only you can do)

## Part A: before the agent starts (once)
- [ ] Create `.env` from `.env.example` with your Supabase project URL and anon key (Project Settings > API). Never commit it.
- [ ] Put the client's logo in `public/` (for example `public/logo.svg` or `logo.png`).
- [ ] Supabase > Authentication > URL Configuration: Site URL = your Vercel URL; add Redirect URLs for `http://localhost:5173/**` and your Vercel URL.
- [ ] Google Cloud OAuth client: Authorized JavaScript origins include `http://localhost:5173` and your Vercel URL (the redirect URI stays the Supabase callback URL).
- [ ] Create the admin user (Authentication > Users > Add user) and run: `update public.profiles set is_admin = true where email = 'ADMIN_EMAIL';`
- [ ] Optional: run `supabase/seed.sql` for placeholder products.
- [ ] Vercel > Project > Settings > Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] Turn on 2-factor login for GitHub, Vercel, Supabase and Razorpay.

## Part B: after Task 1
- [ ] Generate DB types: `npx supabase gen types typescript --project-id <ref> > src/types/database.ts` and commit.

## Part C: after Task 5 (payment tests, Razorpay TEST mode)
Use Razorpay's documented test card and UPI test IDs.
- [ ] **Auto-capture ON** (Razorpay Dashboard > Account & Settings > Payment Capture, in Test AND Live mode). Our site marks an order paid when the payment is authorized; if capture is not automatic, Razorpay refunds the uncaptured payment after a few days and you would ship an order that was refunded.
- [ ] Successful payment: order becomes `paid`, order number shown, order appears in admin.
- [ ] Failed payment: order never becomes `paid`.
- [ ] Close the tab right after paying: the order still becomes `paid` (webhook).
- [ ] Cart under Rs 500 charges items + Rs 70; Rs 500 or more charges items only.
- [ ] Edit a price in browser dev tools: the charged amount does not change.
- [ ] If something fails: Supabase Dashboard > Edge Functions > (function) > Logs.

## Part D: content (needs the client)
- [ ] Product sheet (20 products) and Drive folder (3 images each).
- [ ] Add the real products in the admin portal; then delete placeholders:
  `delete from public.products where slug like 'sample-%'; delete from public.categories where slug like 'sample-%';`
- [ ] Theme colors decided (or keep the neutral palette).

## Part E: before launch
- [ ] Resolve every open policy decision, then check nothing is left: `grep -rn "OWNER TO CONFIRM\|TODO(owner)" src docs`
- [ ] Decide hosting: Vercel's free Hobby plan is meant for non-commercial use; upgrade or move the frontend host if the store goes live commercially. Keep the app a plain Vite SPA so moving is easy.
- [ ] Google OAuth consent screen set to "In production" (with the privacy policy link).
- [ ] Replace `*` in `supabase/functions/_shared/cors.ts` with the live site URL, then redeploy the three functions.
- [ ] Auto-capture is also ON in Live mode.
- [ ] Razorpay live account activated; create the Live Mode webhook (same URL, same secret); set live key ID and secret with `npx supabase secrets set --env-file supabase/.env.razorpay`; redeploy the functions.
- [ ] One small real payment, then refund it from the Razorpay dashboard.
- [ ] Strong admin password; only 1 to 2 admin accounts.
- [ ] You decided not to add backups or export. Free Supabase plans have limited backups, so the order list in the admin portal is the only record; decide whether you are comfortable with that.
- [ ] Final run through the acceptance checklist in `docs/PROJECT_BRIEF.md` (section 11).
