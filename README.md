# Jimmy SuperMarket POS

Mobile-first POS and stock management site backed by Supabase. The UI uses the shop's terracotta, wood, and warm-cream palette. Shared navigation and components are in `css/style.css`; POS-only rules are isolated in `css/pos.css`.

## Setup

1. Create a Supabase project.
2. Run the complete `supabase.sql` in **SQL Editor**. Re-running it is safe; it also adds the `image_urls` migration and the `product-images` / `payment-qr` buckets.
3. Create at least one email/password user in **Authentication → Users**.
4. Put the Project URL and **Publishable key** (or legacy anon key) in `js/config.js`.
5. Serve the folder over HTTPS (GitHub Pages is supported). Camera scanning will not work from plain HTTP, except on `localhost`.
6. Open `index.html` or `login.html` and sign in with the user created in step 3.

## Structure

- `css/style.css` — shared theme, navigation, forms, reports, login, and reusable components
- `css/pos.css` — POS page only
- `js/config.js` — Supabase client, formatting, safe rendering helpers, bottom navigation
- `js/scanner.js` — shared camera scanner for POS and stock receiving
- `js/product-form.js` — product editing, images, and barcode capture
- `assets/shop-front.webp` — optimized storefront reference used on the login screen

## Security notes

- Never place a `service_role` key in this repository.
- No username or password is embedded in the HTML.
- Row-level security is enabled by `supabase.sql`; authenticated users share the same store data.
