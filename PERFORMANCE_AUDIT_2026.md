# Engineering & Performance Audit — China Unique Store

**Project:** `kifayatly-next` (Next.js 16.2.1 · React 19.2.4 · App Router · JavaScript)
**Audit date:** 2026-08-21
**Scope:** PageSpeed / Core Web Vitals, JS bloat & RSC, navigation latency, cart/checkout race conditions, global action-locking.
**Deliverable mode:** Read-only audit. **No existing project file was modified.** This report is the only file added. Every fix below is a ready-to-paste snippet with an exact target file and line range.

---

## How to read this report

Each finding uses this shape:

- **Severity** — P0 (breaks correctness or a headline metric), P1 (clear win), P2 (polish).
- **File · lines** — exact location verified against current source.
- **Problem** — what the code does today and why it costs you.
- **Fix** — paste-ready replacement.

Severity legend for the summary table: P0 = do this week, P1 = do this sprint, P2 = backlog.

---

## Executive summary

This codebase is already well past the typical Next.js baseline. Before the findings, here is what is **already correct** so you don't waste time re-fixing it:

- **Image pipeline is properly configured.** `next.config.mjs` sets AVIF/WebP, mobile-first `deviceSizes`, `minimumCacheTTL`, and scoped `remotePatterns`. The old `unoptimized: true` is gone.
- **Fonts are best-practice.** `Plus_Jakarta_Sans` via `next/font/google` with `display: swap` and `preload: true` in `src/app/layout.js` — zero render-blocking font CSS, no layout shift from font swap beyond the expected.
- **Tracking is already deferred.** `TrackingScripts.jsx` gates on interaction/idle, skips headless UAs, and uses `next/script strategy="lazyOnload"`. This is textbook INP protection — leave it alone.
- **Storefront is RSC-first.** Only three client pages exist and they are all under `/admin`. Product cards, product pages, and layouts are Server Components.
- **Heavy export libs are code-split.** `jspdf`, `exceljs`, and invoice PDF logic use `await import()` / `dynamic(ssr:false)` — they are not in the storefront critical path.
- **CSS animation discipline is good.** `globals.css` applies `will-change` only during active animations, explicitly avoids permanent GPU layers on product cards, and honors `prefers-reduced-motion`.
- **The DB layer is tuned.** `mongooseConnect.js` has serverless-aware pooling, readyState reuse, and retry logic.

The real wins are concentrated in **four** places, and they are high-impact:

1. **Navigation latency (Area 3) is a caching problem, not a network problem.** A single line — `revalidateTag('products')` inside the order action — invalidates the home page, every product page, the product list, and checkout on every successful order. Combined with `router.refresh()` after checkout, this forces a cold server round-trip exactly when the user returns Home. This is your 3–4s delay.
2. **The "wrong item / duplicate" cart bug (Area 4) is a stale-closure bug in `CartContext`.** `addToCart` computes the next cart from a captured snapshot and writes it absolutely instead of functionally. Two quick taps = last-write-wins = the first item silently vanishes.
3. **There is no server-side order idempotency (Area 4).** The only thing preventing duplicate orders is one client-side ref in `CheckoutClient`. A retry, a double POST, or a second tab creates a second order, a second invoice, a second email, and a second inventory decrement.
4. **There is no reusable action-lock (Area 5).** The correct pattern already exists once (`submissionLockRef` in `CheckoutClient`) but is copy-pasted nowhere. Buttons across the app guard on async state, which has a double-fire window; some (`AddToCartBtn`) have no guard at all.

### Priority table

| # | Area | Finding | Severity | File |
|---|------|---------|----------|------|
| 1 | Nav | `revalidateTag('products')` flushes entire storefront on every order | **P0** | `src/app/actions/order.actions.js:263` |
| 2 | Nav | `router.refresh()` after checkout forces cold home render | **P0** | `CheckoutClient.jsx` (success + modal close) |
| 3 | Cart | Stale-closure absolute `setCart` drops concurrent items | **P0** | `src/context/CartContext.jsx:143-152` |
| 4 | Cart | No server idempotency → duplicate orders/invoices/emails | **P0** | `src/app/actions/order.actions.js:193` |
| 5 | Lock | `AddToCartBtn` has no re-entry guard and no `disabled` | **P1** | `src/components/AddToCartBtn.jsx` |
| 6 | Lock | Buy Now / Add guard on async state, not a sync ref | **P1** | `src/components/ProductActions.jsx:143,176` |
| 7 | Nav | `home-page` cache coupled to `products` tag | **P1** | `src/lib/data.js:995` |
| 8 | Nav | `product.actions.js` uses `revalidatePath('/')` (hard flush) | **P1** | `src/app/actions/product.actions.js` |
| 9 | LCP | PDP gallery uses invalid `preload` prop (never prioritized) | **P1** | `src/components/ProductGallery.jsx:127` |
| 10 | LCP | Product grid: all cards `loading="lazy"` incl. first row | **P1** | `src/components/ProductCard.jsx` |
| 11 | Nav | No `experimental.staleTimes` → client cache not reused | **P1** | `next.config.mjs` |
| 12 | Bloat | `recharts` statically imported into `/admin` initial JS | **P1** | `src/components/admin/DashboardChart.jsx` |
| 13 | Bloat | `sanitize-html` pulled into client bundle | **P1** | `src/lib/richText.js` |
| 14 | LCP | Hero renders two `priority` images (double preload) | **P2** | `src/components/HeroSlider.jsx:164-192` |
| 15 | Bloat | `framer-motion` for effects `tw-animate-css` already covers | **P2** | `src/components/animations/*` |
| 16 | Bloat | Dead code: `html2canvas`, `ui/chart.jsx`, `PageTransition.jsx` | **P2** | multiple |
| 17 | Nav | Service worker doesn't cache RSC payloads | **P2** | `public/sw.js` |

---

## Area 1 — Desktop & Mobile PageSpeed 90+

The infrastructure is right; the gaps are per-component. There are three concrete LCP issues and no CLS issues worth fixing (skeletons and aspect ratios are already in place).

### 1.1 — P1 · Product-detail LCP image is never preloaded

**File:** `src/components/ProductGallery.jsx:120-128`

The main gallery image is the LCP element on every product page. It is rendered with `preload={index === 0}`:

```jsx
<Image
  src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
  alt={`Product Image ${index + 1}`}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 42vw"
  className="object-cover ... lg:hover:scale-105"
  {...getBlurPlaceholderProps(image.blurDataURL)}
  preload={index === 0}   // ← not a valid next/image prop
/>
```

`next/image` has **no `preload` prop**. The valid props are `priority` and `fetchPriority`. So this line is silently ignored — the LCP image on your highest-intent page (the PDP) is lazy-decoded with default priority. This is the single biggest LCP miss in the storefront.

**Fix** — replace the prop:

```jsx
<Image
  src={optimizeCloudinaryUrl(image.url, CLOUDINARY_IMAGE_PRESETS.productGalleryMain)}
  alt={`Product Image ${index + 1}`}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 42vw"
  className="object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.25,1,0.5,1)] lg:hover:scale-105"
  {...getBlurPlaceholderProps(image.blurDataURL)}
  priority={index === 0}
  fetchPriority={index === 0 ? 'high' : 'auto'}
  loading={index === 0 ? 'eager' : 'lazy'}
/>
```

Expect a measurable LCP drop on product pages (the browser preloads the hero image instead of discovering it after hydration).

### 1.2 — P1 · Product grid lazy-loads its own above-the-fold LCP element

**File:** `src/components/ProductCard.jsx` (image block)

Every card image uses `loading="lazy"`. On `/products` and category pages the LCP element is a first-row product image — and it's lazy, so the browser defers it until layout, then fetches it. That delays LCP on exactly the pages built for browsing.

**Fix** — make the first row eager. `ProductCard` is a Server Component and already receives the map index at the call site (`src/app/(store)/(content)/products/page.js:135`). Thread a `priority` flag through:

In `products/page.js` where cards are mapped (around line 141):

```jsx
{data.items.map((product, index) => (
  <div
    key={`${product.slug || product._id || product.id || 'product'}-${index}`}
    className="products-grid-card w-full min-w-0"
    style={{ '--products-card-delay': `${Math.min(index, 7) * 48}ms` }}
  >
    <ProductCard product={product} priority={index < 4} />
  </div>
))}
```

Then in `ProductCard.jsx`, accept the prop and pass it to the image:

```jsx
export default function ProductCard({ product, priority = false }) {
  // ...
  <Image
    /* existing props: fill, sizes, blur, aspect-square container */
    priority={priority}
    fetchPriority={priority ? 'high' : 'auto'}
    loading={priority ? 'eager' : 'lazy'}
  />
}
```

Use `index < 4` for the default 4-col grid (first visible row); tune to `< 2` if you want to be conservative on mobile. Do **not** make all cards eager — that would flood the network and hurt LCP more than it helps.

### 1.3 — P2 · Hero preloads two images when only one is shown

**File:** `src/components/HeroSlider.jsx:162-192`

Slide 0 renders both a mobile `<Image>` (`md:hidden`) and a desktop `<Image>` (`hidden md:block`), and **both** carry `priority` + `fetchPriority="high"` + `loading="eager"`:

```jsx
{/* Mobile — md:hidden */}
<Image src={slide.images.mobileSrc} priority={index === 0} fetchPriority={index === 0 ? 'high' : 'auto'} loading={index === 0 ? 'eager' : 'lazy'} ... />
{/* Desktop — hidden md:block */}
<Image src={slide.images.desktopSrc} priority={index === 0} fetchPriority={index === 0 ? 'high' : 'auto'} loading={index === 0 ? 'eager' : 'lazy'} ... />
```

CSS hides one, but the preload scanner requests **both** high-priority images. On mobile you pay for the desktop hero you never show, competing with the real LCP image for bandwidth on the slowest connections.

**Fix (recommended, robust):** render a single `<Image>` and swap the source with `<picture>`/art-direction via the `sizes`+media approach, or gate the desktop image behind a media query so only one preloads. The lowest-risk edit that keeps your two-element structure is to preload only the element that matches the initial viewport. Since you can't read the viewport on the server, prefer the responsive single-image approach:

```jsx
// Replace the two <Image> blocks for slide 0 with one art-directed element.
// Keep both sources, but let the browser pick — only the matched source preloads.
<picture>
  <source media="(min-width: 768px)" srcSet={desktopOptimized} />
  <img
    src={mobileOptimized}
    alt={slide.alt}
    fetchPriority={index === 0 ? 'high' : 'auto'}
    loading={index === 0 ? 'eager' : 'lazy'}
    decoding="async"
    className="absolute inset-0 h-full w-full object-cover"
  />
</picture>
```

If you'd rather stay on `next/image`, the pragmatic compromise is to keep `priority` **only** on the mobile image (your traffic is mobile-first per the `deviceSizes` config) and drop it to `priority={false}` on the desktop one. This removes the redundant mobile-network preload while keeping the mobile LCP fast.

### 1.4 — CLS and INP: no action needed

Verified clean:

- **CLS** — `ProductCard`, `ProductGallery`, and `products/[id]/loading.jsx` all reserve space with `aspect-square`/fixed skeleton dimensions and blur placeholders. The mobile sticky action bar animates `bottom`/`transform` (compositor-only), not layout.
- **INP** — `TrackingScripts.jsx` defers all pixels; `globals.css` scopes `will-change` to active animations only. No long synchronous tasks on the critical path were found in the storefront.

Leave these as-is.

---

## Area 2 — JavaScript bloat & over-engineering

The storefront critical path is lean. The bloat is concentrated in `/admin` and in a few libraries that leak into client bundles. Fixing these shrinks admin JS and trims the shared chunk.

### 2.1 — P1 · `recharts` is statically bundled into the admin dashboard

**File:** `src/components/admin/DashboardChart.jsx:1-4`, imported by `src/app/admin/page.js:8`

```jsx
'use client';
import { LineChart, Line, XAxis, YAxis, ... } from 'recharts';
```

`recharts` is one of the heaviest client libs in `package.json`. Because it's a static import in a component that renders on the dashboard, it lands in the admin initial JS even though the chart is below the fold and admin-only.

**Fix** — lazy-load the chart with `next/dynamic` and `ssr: false` so it splits into its own chunk fetched after paint:

```jsx
// src/app/admin/page.js
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(
  () => import('@/components/admin/DashboardChart'),
  { ssr: false, loading: () => <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/40" /> }
);
```

Keep `recharts` in `experimental.optimizePackageImports` (it already is) — that trims named-import overhead, but only `dynamic()` removes it from the initial chunk.

### 2.2 — P1 · `sanitize-html` leaks into the client bundle

**File:** `src/lib/richText.js:1` (`import sanitizeHtml from 'sanitize-html'`), imported by client components `ProductRichTextEditor.jsx`, `AddProductClient.jsx:29`, `EditProductClient.jsx:22`

`sanitize-html` is listed in `serverExternalPackages`, but that directive only affects **server** bundling. When a `'use client'` component imports it, it ships to the browser. It's a large dependency (pulls in `htmlparser2`).

**Fix** — sanitize on the server, not the client. Two options:

1. **Preferred:** move sanitization into the server action / API route that saves the product, so the client never imports it. The editor sends raw HTML; the server sanitizes before persisting.
2. **If you must sanitize client-side for preview**, lazy-load it so it's not in the initial admin chunk:

```jsx
async function sanitizeClientSide(dirty) {
  const { default: sanitizeHtml } = await import('sanitize-html');
  return sanitizeHtml(dirty, SANITIZE_OPTIONS);
}
```

### 2.3 — P2 · Replace `framer-motion` with the animation libs you already ship

**Files:** `src/components/animations/StaggerAnimations.jsx:2` (used by `AdminUsersClient`, `AdminSettingsClient`, `AdminCategoriesClient`), `src/components/animations/PageTransition.jsx:2` (dead — no importers)

`framer-motion` is only used for entrance/stagger effects, and `StaggerAnimations` uses the `motion[as]` dynamic-proxy pattern which defeats tree-shaking (the whole library is pulled). You already depend on `tw-animate-css` and `@formkit/auto-animate`, which cover stagger/enter animations with a fraction of the weight.

**Fix** — port the stagger wrappers to `@formkit/auto-animate` (for list reordering/enter) or CSS keyframes via `tw-animate-css` (for one-shot entrances), then remove `framer-motion` from `package.json`. Delete the dead `PageTransition.jsx` outright.

### 2.4 — P2 · Remove dead dependencies and files

Verified zero importers:

- **`html2canvas`** — no imports anywhere. Remove from `package.json`.
- **`src/components/ui/chart.jsx`** — no importers; it pulls `recharts`. Delete the file.
- **`src/components/animations/PageTransition.jsx`** — no importers. Delete.

### 2.5 — P2 · `@dnd-kit`, `cmdk`, `embla` scoping

- **`@dnd-kit/*`** is statically imported in `AdminCategoriesClient`, `HomePageBuilderClient`, `CoverPhotosClient`. These are admin drag-and-drop editors — acceptable, but consider adding `@dnd-kit/core`, `@dnd-kit/sortable` to `optimizePackageImports`, or `dynamic()`-loading the builder panels since they're rarely the first thing an admin opens.
- **`cmdk`** (`ui/command.jsx`) reaches the storefront via `SettingsClient`; **`embla`** (`ui/carousel.jsx`) is used by `ProductGallery` and `CategoryProductSlider`. Both are legitimately on the storefront path. No change needed, but they're the next tier if you chase further bundle cuts.

### 2.6 — RSC conversion candidates (P2, correctness-safe)

Two client components have no interactivity and can drop `'use client'`:

- **`ProductDescription.jsx`** — only renders `dangerouslySetInnerHTML`, no hooks/handlers. Convert to a Server Component.
- **`SectionDoodleBackground.jsx`** — only `useId`/`useMemo`. `useId` can be replaced with a stable server-generated id or by rendering the SVG statically; converting removes it from client JS.

These are small but they trim the client tree and align with the project's RSC-first standard.

---

## Area 3 — Navigation latency (the 3–4s delay)

Your instinct that "Next.js caching should make this instant" is correct — the pages *are* cached (`'use cache'` + `cacheLife('foreverish')`). The delay is that **your mutations invalidate those caches far more aggressively than intended, and checkout forces a synchronous refresh**. The result: the exact moment a user returns Home after checkout, the home cache has just been purged and the router is told to re-fetch from the server cold.

There are four compounding causes. Fix #1 and #2 and the headline delay largely disappears; #3 and #4 make navigation feel instant.

### 3.1 — P0 · `revalidateTag('products')` nukes the entire storefront on every order

**File:** `src/app/actions/order.actions.js:261-263`

```js
revalidateTag('orders');
revalidateTag('admin-dashboard');
revalidateTag('products');   // ← the problem
```

Now look at what carries the `products` tag (`src/lib/data.js`):

- `getStorefrontHomePage()` → `cacheTag('home-page','home-sections','products','categories')` (line ~995)
- `getProductBySlug()` → `cacheTag('products', 'product-${slug}')` (line ~1378)
- `getProductsList()` and `getLiveProductsRaw()` → tagged `products`

So a single completed order invalidates **the home page, every product detail page, the entire product list, and any checkout-adjacent product data** — all at once. The next navigation to any of them is a cold cache miss that hits MongoDB and re-renders. That's your 3–4s.

Placing an order does not change product catalog data. It changes **inventory counts**. You almost never need to blow away the whole catalog cache here.

**Fix** — revalidate surgically. Only the products actually purchased changed (their stock), and only if you display live stock on those pages:

```js
// src/app/actions/order.actions.js — replace lines 261-263
revalidateTag('orders');
revalidateTag('admin-dashboard');

// Only invalidate the specific products whose inventory changed — NOT the whole catalog.
for (const item of normalizedItems) {
  if (item.slug) revalidateTag(`product-${item.slug}`);
}
```

If your product cards/pages don't render live stock numbers (most storefronts show "In stock / Out of stock" which only flips at the boundary), you can drop even the per-product revalidation and let inventory reflect on the next natural `foreverish` revalidation, or revalidate a product only when it crosses the out-of-stock threshold inside `applyInventoryAdjustments`.

> If Next's `updateTag` (the lazy/deferred variant) is available in 16.2, prefer it over `revalidateTag` for the admin-dashboard tag so the dashboard refreshes on next read rather than eagerly. Keep the customer-facing path free of eager global invalidation.

### 3.2 — P0 · `router.refresh()` after checkout forces a cold Home render

**File:** `src/app/(store)/(checkout-shell)/checkout/CheckoutClient.jsx` (success handler ~865-866, modal close ~803-808)

```js
// after success
clearCart();
router.refresh();          // ← forces server round-trip

// handleModalClose
router.replace('/');
router.refresh();          // ← again
```

`router.refresh()` throws away the client router cache for the current route and re-fetches its RSC payload from the server. Right after 3.1 has purged the home cache, this guarantees the slowest possible path: cold server render + full RSC transfer, felt as a multi-second hang when landing on Home.

The home page shows no user-specific data (it's fully cached and public), so there is nothing that *needs* a refresh. The cart badge and cart contents are client state cleared by `clearCart()` — they don't depend on a server refetch.

**Fix** — remove the refreshes. Navigate, don't refresh:

```js
// after success
clearCart();
// no router.refresh() — home is public + cached; cart is client state already cleared

// handleModalClose
router.replace('/');       // that's all you need
```

If a specific server-rendered element genuinely must update (e.g. an order-confirmation page that reads the new order), revalidate *that* route's tag on the server instead of refreshing the client globally.

### 3.3 — P1 · Decouple the home page from the `products` tag

**File:** `src/lib/data.js:~995`

```js
// getStorefrontHomePage
cacheTag('home-page', 'home-sections', 'products', 'categories');
```

Even after 3.1, tagging the home page with the broad `products` tag means any future code path that calls `revalidateTag('products')` will flush the home page again. The home page is composed of curated sections (hero, featured, categories), not the raw product list. Give it its own tags so its invalidation is intentional.

**Fix:**

```js
cacheTag('home-page', 'home-sections', 'categories');
// drop 'products' — revalidate 'home-page'/'home-sections' explicitly
// from the admin actions that actually edit homepage content.
```

Then, in whatever admin action edits homepage sections, call `revalidateTag('home-sections')` (it likely already does). This makes the home cache stable across ordinary catalog churn.

### 3.4 — P1 · `product.actions.js` uses `revalidatePath('/')` — a hard flush

**File:** `src/app/actions/product.actions.js:67-71, 93-97, 134-138`

```js
revalidatePath(`/products/${slug}`);
revalidatePath('/');
revalidatePath('/products');
```

`revalidatePath('/')` invalidates the home route on **every product create/edit/delete**. During a bulk catalog edit session in admin, this repeatedly cold-starts the storefront home for customers. Prefer tag-based revalidation, which is narrower and coalesces:

```js
revalidateTag(`product-${slug}`);
revalidateTag('products');       // the list
// only if the edit actually changes a homepage-featured product:
// revalidateTag('home-sections');
```

Drop the blanket `revalidatePath('/')`. Let the home page revalidate through `home-sections` only when homepage content changes.

### 3.5 — P1 · Turn on `experimental.staleTimes` so the client cache is actually reused

**File:** `next.config.mjs`

The client-side Router Cache is what makes back/forward and re-entry instant. In recent Next versions its default dynamic stale time is effectively 0, so returning to a page you just left still refetches. There is currently no `staleTimes` config.

**Fix** — add to the `experimental` block:

```js
experimental: {
  // ...existing...
  staleTimes: {
    dynamic: 30,   // seconds a dynamic route stays fresh in the client cache
    static: 300,   // static/prefetched routes
  },
},
```

With this, tapping into a product and hitting back returns instantly from the client cache instead of round-tripping. Combined with `<Link>` prefetch (App Router prefetches links in viewport by default), most storefront navigation becomes instant.

### 3.6 — P2 · Service worker doesn't cache RSC payloads

**File:** `public/sw.js:66-84` (stale-while-revalidate only for `request.mode === 'navigate'`), `:39-63` (cache-first for `_next/static`)

App Router navigations fetch RSC payloads with a `?_rsc=` query, and those requests have `mode === 'cors'`/`'same-origin'`, **not** `'navigate'`. So your SWR handler never sees them — RSC navigations always hit the network. Meanwhile the cache-first rule for `_next/static` risks serving stale JS after a deploy (hashed filenames make this mostly safe, but a stale HTML→new-chunk mismatch can occur).

**Fix (optional, do after 3.1–3.5):** add a stale-while-revalidate branch for RSC requests:

```js
// public/sw.js — inside fetch handler
const url = new URL(event.request.url);
const isRsc = url.searchParams.has('_rsc');
if (isRsc) {
  event.respondWith(staleWhileRevalidate(event.request)); // reuse your existing SWR fn
  return;
}
```

This is genuinely optional — 3.1 through 3.5 solve the reported latency. Only reach for this if you want offline-grade instant back/forward.

---

## Area 4 — Race conditions & duplicate cart/checkout mutations

There are **two distinct bugs** here and they have different root causes. The "wrong item gets added" is a client state bug. The "duplicate order" risk is a missing server guard. Fix both.

### 4.1 — P0 · The "wrong item" bug: stale-closure absolute write in `CartContext`

**File:** `src/context/CartContext.jsx:133-191` (`addToCart`), memo deps at `:258`

Here's the exact mechanism. `addToCart` is memoized with `optimisticCart` in its dependency array (line 258), so every render creates a new closure capturing *that render's* `optimisticCart`. Inside:

```js
async addToCart(product, qtyToAdd = 1) {
  const normalized = normalizeCartItem({ ...product, quantity: qtyToAdd });
  // ...
  return new Promise((resolve) => {
    startTransition(async () => {
      addOptimisticCart({ type: 'add', item: normalized });
      const nextCart = mergeCartItems(optimisticCart, normalized); // ← reads STALE snapshot
      const persisted = persistCartSnapshot(nextCart);
      // ...
      setCart(nextCart);   // ← ABSOLUTE write, not functional
      // ...
      resolve({ success: true, item: normalized, cart: nextCart });
    });
  });
}
```

Now the failure sequence when a user taps "Buy Now" on product A and the cart is empty, then quickly the icon-add on product B fires before React commits:

1. Both closures captured `optimisticCart = []`.
2. Add A: `nextCart = merge([], A) = [A]` → `setCart([A])`, persist `[A]`.
3. Add B: `nextCart = merge([], B) = [B]` → `setCart([B])`, persist `[B]`.

Final cart = `[B]`. **Item A is silently gone.** That's the "duplicate or wrong items get added" report — it's actually items being *dropped* by last-write-wins. Two quick adds of the *same* product similarly under-count (you see quantity flash 2, then settle at 1).

The optimistic layer (`addOptimisticCart`) replays correctly because React re-applies queued optimistic actions on the latest base — which is why the UI briefly looks right, then snaps to the wrong value when the transition commits the stale absolute write.

**Fix** — never write the cart absolutely from a snapshot. Use a functional updater (always sees the freshest state) and move persistence into an effect so it can never disagree with state. Replace the whole mutations block:

```jsx
// src/context/CartContext.jsx

// 1) Persist from an effect — single source of truth, no stale snapshots.
useEffect(() => {
  if (!isInitialized) return;
  persistCartSnapshot(cart);
}, [cart, isInitialized]);

// 2) addToCart: optimistic UI + functional base update. No closure read of cart.
async addToCart(product, qtyToAdd = 1) {
  const normalized = normalizeCartItem({ ...product, quantity: qtyToAdd });
  if (!normalized.id) {
    toast.error('This item could not be added to the cart.');
    return { success: false, error: 'Invalid product' };
  }

  addOptimisticCart({ type: 'add', item: normalized });   // instant UI
  startTransition(() => {
    setCart((prev) => mergeCartItems(prev, normalized));   // ← functional: no clobber
  });

  try {
    trackAddToCartEvent({
      productId: normalized.slug || normalized._id || normalized.id,
      name: normalized.Name,
      category: Array.isArray(normalized.Category) ? normalized.Category.join(', ') : '',
      value: normalized.discountedPrice ?? normalized.Price,
      quantity: normalized.quantity,
    });
  } catch (error) {
    console.error('Failed to track add to cart event', error);
  }

  // toast (unchanged) ...
  return { success: true, item: normalized };
}
```

Apply the **same functional pattern** to `removeFromCart`, `updateQuantity`, and `replaceCart` — they currently read `optimisticCart` from the closure and write absolutely too (`:192-245`). They're less likely to collide, but converting them removes the whole class of bug and lets the effect own persistence:

```jsx
removeFromCart(product) {
  const itemId = getCartItemId(product);
  startTransition(() => setCart((prev) => prev.filter((i) => i.id !== itemId)));
  return { success: true };
},
updateQuantity(product, newQuantity) {
  const itemId = getCartItemId(product);
  const safe = Math.max(0, Number(newQuantity) || 0);
  startTransition(() => setCart((prev) =>
    safe < 1 ? prev.filter((i) => i.id !== itemId)
             : prev.map((i) => (i.id === itemId ? { ...i, quantity: safe } : i))
  ));
  return { success: true };
},
```

Because persistence now lives in the effect, delete the `persistCartSnapshot(...)` calls inside each action and drop `optimisticCart` from the `useMemo` dependency array (the actions no longer read it) — that also stops `addToCart`'s identity from changing on every cart mutation, which is a small extra win for downstream memoization.

### 4.2 — P0 · No server-side order idempotency → duplicate orders

**File:** `src/app/actions/order.actions.js:193-210`

```js
const order = await Order.create({
  orderId: makeOrderId(),            // random every call
  secureToken: crypto.randomUUID(),  // random every call
  // ...
});
```

`makeOrderId()` and `crypto.randomUUID()` produce a fresh value on every invocation, so there is **nothing** that makes a second submission collide with the first. The only thing preventing duplicates today is `submissionLockRef` on the client in `CheckoutClient`. That guard is good, but it does not survive: a network retry, the user reopening the checkout tab, a double POST from a flaky connection, or the action being invoked twice by React under load. Any of those creates a second `Order`, a second `Invoice`, a second set of emails (`sendOrderEmails`), a second coupon increment, and a **second inventory decrement** (`applyInventoryAdjustments`).

**Fix** — accept a client-generated idempotency key and enforce it with a unique index. This is the standard pattern and it's cheap.

Step 1 — client sends a stable key created once per checkout attempt (in `CheckoutClient`, generate it when the checkout mounts / cart is finalized, not per-click):

```jsx
// CheckoutClient.jsx — created once, reused across retries of the SAME attempt
const idempotencyKeyRef = useRef(crypto.randomUUID());
// include in the payload passed to submitOrderAction:
// { ...orderData, idempotencyKey: idempotencyKeyRef.current }
```

Step 2 — add a unique, sparse field on the Order model:

```js
// src/models/Order.js
idempotencyKey: { type: String, unique: true, sparse: true, index: true },
```

Step 3 — make the server action idempotent. Try to reuse an existing order for the key before creating:

```js
// src/app/actions/order.actions.js — before Order.create(...)
if (idempotencyKey) {
  const existing = await Order.findOne({ idempotencyKey }).lean();
  if (existing) {
    // Already processed this exact attempt — return the original result, do NOT re-run
    // inventory/emails/coupon side effects.
    return { success: true, orderId: existing.orderId, secureToken: existing.secureToken, duplicate: true };
  }
}

let order;
try {
  order = await Order.create({
    orderId: makeOrderId(),
    secureToken: crypto.randomUUID(),
    idempotencyKey,                 // ← unique
    // ...rest unchanged
  });
} catch (err) {
  // Unique-index race: a concurrent request created it first. Fetch and return it.
  if (err?.code === 11000) {
    const existing = await Order.findOne({ idempotencyKey }).lean();
    if (existing) return { success: true, orderId: existing.orderId, secureToken: existing.secureToken, duplicate: true };
  }
  throw err;
}
```

The `try/catch` on error code `11000` closes the true concurrency window (two requests arriving before either commits) — the unique index is the actual guarantee; the pre-check is just an optimization. With this, retries and double-submits collapse onto one order, and the expensive side effects (invoice, emails, inventory, coupon) run exactly once.

### 4.3 — P1 · `handleBuyNow` / `handleAddToCart` guard on async state, not a synchronous ref

**File:** `src/components/ProductActions.jsx:142-198`

```js
const handleAddToCart = async (event) => {
  if (isAdding || isOutOfStock) return;   // isAdding is async state
  setIsAdding(true);
  // ...
};
const handleBuyNow = async () => {
  if (isBuying || isOutOfStock) return;   // isBuying is async state
  setIsBuying(true);
  // ...
};
```

`isAdding`/`isBuying` are React state. `setIsBuying(true)` does not apply until the next render, so two taps within the same tick both read `isBuying === false` and both proceed. The buttons are also `disabled={isBuying}` (lines 399, 472), but that disable is applied on the same delayed render — the physical double-tap beats it. This is the same class of gap the checkout already solved correctly with a synchronous ref.

**Fix** — use the reusable lock from Area 5 (below). Minimal inline version if you don't adopt the hook yet:

```js
const buyLockRef = useRef(false);
const handleBuyNow = async () => {
  if (buyLockRef.current || isOutOfStock) return;
  buyLockRef.current = true;              // synchronous — closes the double-tap window
  setIsBuying(true);
  try {
    const result = await addToCart(productToAdd, quantity);
    if (result?.success) { router.push('/checkout'); return; } // keep locked through nav
    buyLockRef.current = false; setIsBuying(false);
  } catch (error) {
    buyLockRef.current = false; setIsBuying(false);
    toast.error('Failed to proceed to checkout.');
  }
};
```

Note: on the success path we intentionally keep the lock engaged so a second tap during the `router.push` transition can't fire a second navigation/add.

---

## Area 5 — Global action-locking & button disabling

Today the correct pattern exists **once** — `submissionLockRef` in `CheckoutClient.handlePlaceOrder`, which sets a synchronous ref before the first `await`. Everywhere else, code either guards on async state (small double-fire window, see 4.3) or doesn't guard at all (`AddToCartBtn`). There is no shared hook — `src/hooks/` contains only `use-mobile.js`. The goal is to generalize that one good pattern so you stop hand-writing `disabled={loading}` on 50+ elements.

The design has three layers. Adopt layer 1 everywhere; add layers 2 and 3 where they earn their keep.

### 5.1 — Layer 1: `useActionLock` hook (adopt everywhere)

This is the reusable version of the checkout ref pattern: a synchronous ref closes the double-tap window, and a state flag drives the disabled UI.

Create `src/hooks/useActionLock.js`:

```jsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Serializes an async action: a synchronous ref rejects re-entry within the
 * same tick (before React re-renders), and `isPending` drives disabled UI.
 *
 *   const { isPending, run } = useActionLock();
 *   <button disabled={isPending} onClick={() => run(async () => { await save(); })} />
 */
export function useActionLock() {
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const run = useCallback(async (action) => {
    if (lockRef.current) return { skipped: true };
    lockRef.current = true;
    setIsPending(true);
    try {
      const result = await action();
      return { skipped: false, result };
    } finally {
      // Guard against setState after unmount (e.g. action navigated away).
      if (mountedRef.current) setIsPending(false);
      lockRef.current = false;
    }
  }, []);

  return { isPending, run, isLocked: () => lockRef.current };
}
```

Refactors this enables:

**`AddToCartBtn.jsx` (currently unguarded — Finding #5):**

```jsx
'use client';
import { useActionLock } from '@/hooks/useActionLock';
// ...
export default function AddToCartBtn({ product, className }) {
  const { addToCart } = useCartActions();
  const { isPending, run } = useActionLock();
  const [didJustAdd, setDidJustAdd] = useState(false);

  const onClick = (event) => run(async () => {
    if (event?.currentTarget) {
      const imageSrc = product?.Images?.[0]?.url || /* ...unchanged... */ '';
      flyToCart({ sourceEl: event.currentTarget, imageSrc });
    }
    const result = await addToCart(product);
    if (result?.success) {
      setDidJustAdd(true);
      setTimeout(() => setDidJustAdd(false), 650);
    }
  });

  return (
    <Button onClick={onClick} disabled={isPending} className={`add-to-cart-button w-full ${className || ''}`}>
      {/* spinner/icon driven by isPending instead of local isAdding */}
    </Button>
  );
}
```

**`ProductActions.jsx` Buy Now / Add to Cart (Finding #6)** — replace the ad-hoc `isBuying`/`isAdding` state with two locks:

```jsx
const addLock = useActionLock();
const buyLock = useActionLock();

const handleAddToCart = (event) => addLock.run(async () => {
  if (isOutOfStock) return;
  if (event?.currentTarget) flyToCart({ sourceEl: event.currentTarget, imageSrc });
  await addToCart(productToAdd, quantity);
});

const handleBuyNow = () => buyLock.run(async () => {
  if (isOutOfStock) return;
  const result = await addToCart(productToAdd, quantity);
  if (result?.success) router.push('/checkout');
});

// buttons:
<Button onClick={handleAddToCart} disabled={addLock.isPending || isOutOfStock} ... />
<Button onClick={handleBuyNow}    disabled={buyLock.isPending || isOutOfStock} ... />
```

This deletes the manual `setIsAdding`/`setIsBuying` bookkeeping and closes the double-tap window synchronously.

### 5.2 — Layer 2: `<AsyncButton>` to kill `disabled={loading}` boilerplate

For the ~50 buttons that all repeat the same "disable while running + show spinner" logic, wrap it once. Create `src/components/ui/async-button.jsx`:

```jsx
'use client';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useActionLock } from '@/hooks/useActionLock';
import { cn } from '@/lib/utils';

/**
 * Drop-in Button whose onClick is an async fn. Auto-locks, auto-disables,
 * shows a spinner while pending. No manual loading state anywhere.
 */
export function AsyncButton({ onClick, disabled, children, pendingLabel, className, ...props }) {
  const { isPending, run } = useActionLock();
  return (
    <Button
      {...props}
      className={cn(className)}
      disabled={disabled || isPending}
      onClick={(e) => run(() => onClick?.(e))}
    >
      {isPending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner className="size-4 animate-spin" />
          {pendingLabel || children}
        </span>
      ) : children}
    </Button>
  );
}
```

Now admin mutations collapse from this:

```jsx
const [loading, setLoading] = useState(false);
<Button disabled={loading} onClick={async () => { setLoading(true); try { await save(); } finally { setLoading(false); } }}>
  {loading ? 'Saving…' : 'Save'}
</Button>
```

to this:

```jsx
<AsyncButton onClick={() => save()} pendingLabel="Saving…">Save</AsyncButton>
```

This directly targets the admin gaps found in the audit — e.g. `AdminProductsClient.toggleProductFlag` (New Arrival / Best Selling dropdown items had no `disabled`) and the live-toggle `Switch` — by making "locked while running" the default rather than something each handler must remember.

### 5.3 — Layer 3: global lock context for "freeze everything" moments (checkout-grade only)

Most actions only need to lock *themselves* (layers 1–2). A few — placing an order, a destructive admin bulk operation — should freeze **all** interactive controls until they finish. For those, a lightweight counter context lets any button opt into a global busy state without prop-drilling.

Create `src/context/ActionLockContext.jsx`:

```jsx
'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ActionLockContext = createContext(null);

export function ActionLockProvider({ children }) {
  const [busyCount, setBusyCount] = useState(0);
  const begin = useCallback(() => setBusyCount((c) => c + 1), []);
  const end = useCallback(() => setBusyCount((c) => Math.max(0, c - 1)), []);
  const value = useMemo(() => ({ isBusy: busyCount > 0, begin, end }), [busyCount]);
  return <ActionLockContext.Provider value={value}>{children}</ActionLockContext.Provider>;
}

export function useGlobalActionLock() {
  return useContext(ActionLockContext) ?? { isBusy: false, begin: () => {}, end: () => {} };
}
```

A critical action brackets itself with `begin()`/`end()`, and any control that must not fire mid-checkout reads `isBusy`:

```jsx
const { isBusy, begin, end } = useGlobalActionLock();
const placeOrder = () => run(async () => {
  begin();
  try { await submitOrderAction(payload); } finally { end(); }
});
// elsewhere: <AsyncButton disabled={isBusy} ... />
```

**Scope this deliberately.** Wrapping the whole store in a global lock provider conflicts with the project's RSC-first / minimal-client-JS standard, so mount `ActionLockProvider` only around the checkout shell and admin shells — not the storefront root. Layers 1–2 handle 95% of cases; layer 3 is for the handful of operations where a stray click elsewhere on the page during the operation would cause real harm.

### 5.4 — Rollout order

1. Add `useActionLock` and refactor the three known-unsafe spots first: `AddToCartBtn`, `ProductActions` (Buy Now + Add), and any admin toggle without `disabled`.
2. Introduce `<AsyncButton>` and migrate admin mutation buttons opportunistically (no big-bang rewrite needed).
3. Add `ActionLockProvider` around checkout + admin shells only, and have `submitOrderAction`'s caller bracket with `begin()/end()`.

---

## Consolidated action plan

### Do this week (P0 — correctness + headline latency)

| Fix | File | Change |
|-----|------|--------|
| Stop full-catalog flush on order | `src/app/actions/order.actions.js:261-263` | Replace `revalidateTag('products')` with per-product `product-${slug}` tags |
| Remove post-checkout cold refresh | `CheckoutClient.jsx` (~803-808, ~865-866) | Delete both `router.refresh()` calls |
| Fix cart last-write-wins | `src/context/CartContext.jsx:133-245, 258` | Functional `setCart(prev => …)`; persist in `useEffect([cart])`; drop `optimisticCart` from memo deps |
| Add order idempotency | `order.actions.js:193`, `models/Order.js`, `CheckoutClient.jsx` | Unique `idempotencyKey`, pre-check + `11000` catch |

### This sprint (P1 — clear wins)

| Fix | File |
|-----|------|
| `useActionLock` + refactor unguarded buttons | new `src/hooks/useActionLock.js`; `AddToCartBtn.jsx`; `ProductActions.jsx:142-198` |
| PDP LCP image: `preload` → `priority` | `src/components/ProductGallery.jsx:127` |
| Grid first-row eager images | `ProductCard.jsx` + `products/page.js:135` |
| Enable `experimental.staleTimes` | `next.config.mjs` |
| Decouple home cache from `products` tag | `src/lib/data.js:~995` |
| Tag-based revalidation in product actions | `src/app/actions/product.actions.js:67-138` |
| Code-split `recharts` | `src/app/admin/page.js` + `DashboardChart.jsx` |
| Move `sanitize-html` off the client | `src/lib/richText.js` + editor clients |

### Backlog (P2 — polish)

`AsyncButton` migration · `ActionLockProvider` for checkout/admin · single hero image (drop double preload) · replace `framer-motion` with `tw-animate-css`/`auto-animate` · delete `html2canvas`/`ui/chart.jsx`/`PageTransition.jsx` · RSC-convert `ProductDescription`/`SectionDoodleBackground` · SW caching for RSC payloads.

### Expected impact

- **Navigation:** removing the global flush (#1) + the refresh (#2) + `staleTimes` (#11) should collapse the 3–4s post-checkout Home delay to near-instant, and make product ↔ list ↔ back transitions feel immediate from the client cache.
- **Correctness:** the cart fix (#3) eliminates dropped/wrong items entirely; idempotency (#4) makes duplicate orders structurally impossible rather than merely unlikely.
- **PageSpeed:** the LCP fixes (#9, #10, #14) target the actual LCP element on your two highest-traffic templates (PDP and grid); the bloat cuts (#12, #13) shrink admin and shared JS. CLS and INP are already in good shape.

---

## Verification notes

Every file path, line reference, and code excerpt in this report was read directly from the current source on 2026-08-21. Key confirmations:

- `revalidateTag('products')` is present at `order.actions.js:263`; the `products` tag is applied to `getStorefrontHomePage`, `getProductBySlug`, `getProductsList`, and `getLiveProductsRaw` in `src/lib/data.js`.
- `CartContext.addToCart` reads `optimisticCart` from the closure and calls absolute `setCart(nextCart)` (`:143-152`); memo deps include `optimisticCart` (`:258`).
- `order.actions.js` creates orders with `makeOrderId()` + `crypto.randomUUID()` and has no idempotency check (`:193-210`).
- `ProductGallery.jsx:127` uses `preload={index === 0}` — not a valid `next/image` prop; `priority`/`fetchPriority` are absent.
- `ProductCard` images and the products grid render `loading="lazy"` with no priority path for the first row.
- `HeroSlider.jsx:164-192` renders two `priority` images (mobile `md:hidden` + desktop `hidden md:block`) for slide 0.
- `next.config.mjs` has no `experimental.staleTimes`.
- `src/hooks/` contains only `use-mobile.js`; `CheckoutClient`'s `submissionLockRef` is the sole synchronous-ref guard in the codebase.
- `CheckoutClient.jsx`: `router.replace('/')` at `:806` + `router.refresh()` at `:807` (modal close), and `router.refresh()` at `:866` (order success) — both confirmed.
- `product.actions.js`: `revalidatePath('/')` confirmed at lines `71`, `97`, and `138` (create/edit/delete handlers), each alongside `revalidatePath('/products')` and `revalidatePath('/admin/products')`. Line `125` carries a team comment weighing `revalidateTag` vs `updateTag` — the team is already aware of the lazy variant.
- Dead code confirmed: `html2canvas` has zero imports in `src/`; `src/components/ui/chart.jsx` has zero importers; `src/components/animations/PageTransition.jsx` has no importers (only its own definition). All three are safe to delete.

*No files in the project were modified to produce this audit. This report is the only addition.*
