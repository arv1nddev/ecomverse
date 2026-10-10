-- ============================================================
-- PLACEHOLDER SAMPLE DATA - for development only.
-- Delete before launch:
--   delete from public.products   where slug like 'sample-%';
--   delete from public.categories where slug like 'sample-%';
-- Run in the SQL Editor (or automatically by `supabase db reset` locally).
-- ============================================================

insert into public.categories (name, slug, sort_order) values
  ('Sample Home',     'sample-home',     1),
  ('Sample Fashion',  'sample-fashion',  2),
  ('Sample Gadgets',  'sample-gadgets',  3);

insert into public.products
  (category_id, name, slug, short_description, details, variant_options, price, in_stock)
values
  ((select id from public.categories where slug = 'sample-home'),
   'Sample Ceramic Mug', 'sample-ceramic-mug',
   'A simple placeholder mug.',
   array['Placeholder feature one', 'Placeholder feature two'],
   '{}', 299, true),

  ((select id from public.categories where slug = 'sample-home'),
   'Sample Table Lamp', 'sample-table-lamp',
   'A placeholder lamp priced above the free-shipping line.',
   array['Placeholder feature one', 'Placeholder feature two', 'Placeholder feature three'],
   '{}', 649, true),

  ((select id from public.categories where slug = 'sample-fashion'),
   'Sample T-Shirt', 'sample-t-shirt',
   'Placeholder product with size variants.',
   array['Placeholder feature one'],
   array['S', 'M', 'L', 'XL'], 449, true),

  ((select id from public.categories where slug = 'sample-fashion'),
   'Sample Cap', 'sample-cap',
   'Placeholder product that is out of stock, for testing.',
   array['Placeholder feature one'],
   '{}', 199, false),

  ((select id from public.categories where slug = 'sample-gadgets'),
   'Sample Phone Stand', 'sample-phone-stand',
   'Cheap placeholder item for testing the Rs 70 shipping fee.',
   array['Placeholder feature one', 'Placeholder feature two'],
   '{}', 149, true),

  ((select id from public.categories where slug = 'sample-gadgets'),
   'Sample Earbuds', 'sample-earbuds',
   'Placeholder product with color variants.',
   array['Placeholder feature one', 'Placeholder feature two'],
   array['Black', 'White'], 999, true);

-- Fake supplier info so the admin screens can be tested
insert into public.product_supplier_info (product_id, supplier_url, supplier_cost)
select id, 'https://example.com/supplier/' || slug, round(price * 0.6)
from public.products
where slug like 'sample-%';
