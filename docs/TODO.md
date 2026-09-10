# TODO — Technical Debt, Bugs, and Improvements

**Part of:** [[Index]] · **See also:** [[Architecture]], [[Flows-and-Workflows]], [[API-Routes-and-Models]]

> Legend: 🔴 Critical / 🟡 Important / 🟢 Nice to Have / 🔵 Refactor

---

## 🔴 Critical Issues

### ✅ [1] `actions.js` is a 1056-line God File — RESOLVED
- **Resolved:** Split into domain-specific action files. `src/app/actions.js` is now a re-export proxy.
  - `src/app/actions/product.actions.js` — 4 product actions
  - `src/app/actions/order.actions.js` — 12 order/cart actions
  - `src/app/actions/settings.actions.js` — 1 settings action
  - `src/app/actions/coupon.actions.js` — 1 coupon action
- **Backward compatibility:** All 7 existing import sites preserved via re-export proxy.

### [2] Product Text Search is `$regex`, Not Full-Text
- **Problem:** `src/app/api/search-products/route.js` and product filtering use MongoDB `$regex` on the `Name` field. This is slow at scale (no index), case-sensitive by default, and returns poor relevance ranking.
- **Fix:** Add a MongoDB Atlas Search index on `Name`, `shortDescription`, and `seoKeywords`. Replace `$regex` with `$search` aggregation stage.
- **Effort:** Medium

### ✅ [4] `actions.js` imports are all at top-level (bundle size) — RESOLVED
- **Resolved:** All Mongoose model imports across all 4 new action files now use dynamic `import()` inside each function body (e.g., `const Product = (await import('@/models/Product')).default;`). No top-level model imports remain in any action file.

---

## 🟠 Important UI Improvements

### ✅ [NEW] Fix uneven product card heights and responsive grid toggles — RESOLVED
- **Resolved:** Fixed uneven product card heights (added `h-full`, removed `line-clamp-1` overrides) and replaced desktop-only grid layout toggle icons on mobile screens with appropriate responsive toggles (`Square`/`Grid2x2` on mobile, `Grid3x3`/`LayoutGrid` on desktop).

---

## ⚡ Performance & UI UX

### ✅ [NEW] Implement dynamic imports and micro-animations — RESOLVED
- **Resolved**: Implemented dynamic imports for heavy hidden UI components (ReviewModal, QuickView dialogs), applied Mongoose `.lean()` on read queries in Server Actions, and integrated lightweight GPU-accelerated micro-animations across product cards, interactive buttons, and the Cart Drawer.

### ✅ [NEW] Home Page Auto-Slide Carousel — RESOLVED
- **Resolved**: Implemented continuous, smooth infinite loop for the Home Page product carousel using Embla Carousel (`embla-carousel-autoplay`). Auto-sliding only activates when 5 or more products exist, respects Next.js Cache Components architecture (`'use client'` wrapper), and natively pauses on user interaction/hover. Kept CSS layout structure to avoid Cumulative Layout Shift (CLS) and CPU spikes on low-end devices.

---

## 🟡 Important Issues

### [5] PascalCase Field Names in Product Model
- **Problem:** `Product.Name`, `Product.Price`, `Product.Images`, `Product.Category`, `Product.StockStatus` use PascalCase while every other model uses camelCase. This causes constant field-name confusion throughout the codebase (e.g., `item.Name || item.name || 'Untitled Product'` defensive checks everywhere).
- **Fix:** Database migration + field rename across all code. Or: expose a normalized getter. This is a breaking change.
- **Effort:** Very High (migration required)
- **Reference:** [[Architecture#Naming-Conventions]]

### [6] Wishlist Not Paginated / No Limit
- **Problem:** `User.wishlist` is a flat `[String]` array with no limit. A user could theoretically add thousands of products. No pagination on the wishlist page.
- **Fix:** Cap wishlist at N items (e.g., 100), add pagination to the wishlist API endpoint and page.

### [7] Reviews Are Auto-Approved With No Rate Limiting
- **Problem:** `Review.isApproved` defaults to `true`. Any logged-in user can spam reviews. No check for one-review-per-order or per-product limit other than `isReviewed` on order items.
- **Fix:** Enforce that a review requires a `Delivered` status order containing that product. Add rate limiting to the POST `/api/reviews` endpoint.

### [8] `data.js` is ~2400 Lines
- **Problem:** `src/lib/data.js` contains every data fetching function for both the store and admin. It's a single file with 2434 lines.
- **Fix:** Split into domain modules: `src/lib/data/products.js`, `src/lib/data/orders.js`, `src/lib/data/settings.js`, etc. Group by feature domain.
- **Effort:** Medium (low-risk refactor)

### [9] No Rate Limiting on Public API Routes
- **Problem:** `/api/tracking/meta`, `/api/stock-requests`, `/api/reviews`, `/api/search-products` are fully public with no rate limiting. A bot could spam these.
- **Fix:** Implement rate limiting via middleware (e.g., `next-rate-limit` or Vercel Edge Middleware with IP-based limits).
- **Effort:** Low

### [10] Guest Order Lookup Uses secureToken — Token Rotation Missing
- **Problem:** `Order.secureToken` is set at creation and never rotated. If a token is exposed (e.g., in browser history), anyone can access that order indefinitely.
- **Fix:** Add token expiry logic, or require secureToken + customerPhone for lookups.

### [11] Admin `page.js` Directly Imports `data.js` — No Loading Boundary for Slow Queries
- **Problem:** The admin dashboard `loadDashboardDataSafely()` is awaited inline. If MongoDB is slow, the whole page hangs before any content renders.
- **Fix:** Wrap dashboard sections in `<Suspense>` with skeletons so KPI cards load independently.

### [12] `CoverPhoto` Model is Deprecated but Still in Use
- **Problem:** `src/models/CoverPhoto.js` and the `/api/cover-photos` route still exist, but cover photos are now managed through `HomePage.sections` (hero-slider type). The old model is fetched in some RSC pages.
- **Fix:** Complete the migration — remove `CoverPhoto` model, delete old route, update all consumers.

### [13] `OrderLog` Has No Documented Schema or Query Path
- **Problem:** `src/models/OrderLog.js` exists and is imported in `actions.js`, but its schema is not visible in the main `models/` review and no admin UI surfaces order logs.
- **Fix:** Add an Order Log viewer to the admin order detail page. Document the schema.

---

## 🟢 Nice to Have

### [14] No Optimistic Updates on Admin Mutations
- **Problem:** Admin actions (toggle live, set discount, delete product) call Server Actions and wait for the full round-trip before the UI updates. No `useOptimistic` pattern in admin components.
- **Fix:** Wrap admin list mutations with `useOptimistic` for instant feedback.

### [15] Product Page Lacks Structured Data (JSON-LD)
- **Problem:** Product pages have SEO meta tags but no `application/ld+json` schema for Google's rich results (Product schema with `price`, `availability`, `rating`).
- **Fix:** Add a `<script type="application/ld+json">` component to the product detail page RSC.
- **Effort:** Very Low

### [16] No Skeleton for Cart Drawer Initial Load
- **Problem:** `CartDrawer.jsx` renders an empty state while `isInitialized` is false. A skeleton would prevent layout shift.

### [17] WhatsApp URL is Client-Formatted, Not Validated
- **Problem:** The WhatsApp URL is built in `submitOrderAction` from store settings `whatsappNumber`. If the number is incorrectly formatted, the URL silently fails.
- **Fix:** Validate `whatsappNumber` format in `saveStoreSettingsAction`.

### [18] No Automated Test Coverage
- **Problem:** Zero unit tests, zero integration tests. Core functions like `calculateCheckoutPricing`, `validateCouponLogic`, `buildOrderItemsWithSourcing`, `normalizeOrderStatus` are pure/near-pure functions that would be trivial to test.
- **Fix:** Add `vitest` + minimal test suite for business logic in `src/lib/`.

### [19] Facebook Feed XML Endpoint Lacks Pagination
- **Problem:** `/api/feeds/facebook` (the Facebook product catalog XML feed) likely fetches all products at once. At scale, this will time out or exceed memory.
- **Fix:** Add chunked/paginated feed generation.

### [20] No Dark Mode Persistence
- **Problem:** `ThemeProvider.jsx` exists but is minimal. Dark mode preference may not persist across sessions if not wired to `localStorage` or a cookie.
- **Fix:** Verify `ThemeProvider` uses `next-themes` or equivalent with `localStorage` persistence.

---

## 🔵 Refactors & Code Quality

### [21] `normalizeCartItem` and `mergeCartItems` are Duplicated
- **Problem:** Cart normalization logic exists in both `CartContext.jsx` (client) and `orderFulfillment.js` (server). The client-side version is used for UI; the server version re-resolves from DB at checkout. They can drift.
- **Fix:** Extract shared type/shape definitions. Ensure the server always wins on price (it does today, but document this explicitly).

### [22] `imagePlaceholder.js` and `imagePlaceholders.js` — Two Similar Files
- **Problem:** Two files with very similar names exist in `src/lib/`. The distinction is unclear without reading both.
- **Fix:** Merge into one file or rename clearly: `generateSingleBlurPlaceholder.js` vs `generateBatchBlurPlaceholders.js`.

### [23] `src/proxy.js` — Undocumented
- **Problem:** A `proxy.js` file exists at the root of `src/`. Its purpose is unclear.
- **Fix:** Add a comment header explaining what it does or remove if unused.

### [24] `fixPage.js` and `patch-api.js` at Root
- **Problem:** `fixPage.js` (17 KB), `patch-api.js` (1.8 KB), and `updateData.js` (3 KB) are one-off migration scripts sitting at the project root alongside production config. They're confusing and could be accidentally run.
- **Fix:** Move to a `scripts/` directory (one already exists), or delete if migrations are complete.

### [25] Environment Variable Validation on Startup
- **Problem:** Missing env vars fail at runtime (e.g., `MONGODB_URI` throws in `mongooseConnect.js`, but `RESEND_API_KEY` fails silently until an email is sent). `GOOGLE_CLIENT_ID` failure only surfaces at OAuth time.
- **Fix:** Add a startup env validation script (e.g., using `zod` to validate `process.env` at boot).

---

## Completed / Already Handled (Reference)

- ✅ Centralized Zod Input Validation & Sanitization across all actions & routes — **Issue [3]**
- ✅ `actions.js` God File split into domain modules (product, order, coupon, settings) with re-export proxy — **Issue [1]**
- ✅ All Mongoose model imports moved to dynamic `import()` inside action functions — **Issue [4]**
- ✅ Hot-reload-safe Mongoose model registration (all models)
- ✅ Soft delete + TTL index on orders (50-day auto-purge)
- ✅ `after()` hook for non-blocking email + tracking
- ✅ JWT `forceLogoutAt` immediate session invalidation
- ✅ Coupon per-user usage limit with fuzzy phone matching
- ✅ Server-side CAPI deduplication with `eventID`
- ✅ Inventory decrement on order placement (`bulkWrite`)
- ✅ Dynamic admin emails via `Settings.adminEmails`
- ✅ Demo/guest mode with mutation blocking

---

*Back to: [[Index]] · [[Architecture]] · [[API-Routes-and-Models]]*
