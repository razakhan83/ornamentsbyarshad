# Architecture

**Part of:** [[Index]] · **See also:** [[Skills-and-TechStack]], [[Flows-and-Workflows]], [[API-Routes-and-Models]]

---

## System Overview

China Unique Store is a **monolithic Next.js 16 App Router** application — one codebase serves the store frontend, admin panel, and all API endpoints. There is no separate backend server, no microservices.

```
┌─────────────────────────────────────────────────────┐
│                  Next.js 16 App                      │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Store UI   │  │ Admin Panel │  │  API Routes │ │
│  │ (RSC+Client)│  │ (RSC+Client)│  │(Route Hdlrs)│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         └────────────────┴────────────────┘         │
│                          │                          │
│              ┌───────────▼───────────┐              │
│              │    Server Actions     │              │
│              │   (src/app/actions.js)│              │
│              └───────────┬───────────┘              │
│                          │                          │
│              ┌───────────▼───────────┐              │
│              │    Data Layer         │              │
│              │  (src/lib/data.js)    │              │
│              └───────────┬───────────┘              │
└──────────────────────────┼──────────────────────────┘
                           │
           ┌───────────────▼───────────────┐
           │         MongoDB Atlas          │
           │    (via mongoose + cached      │
           │     global connection)         │
           └───────────────────────────────┘
```

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout: fonts, Toaster, meta defaults
│   ├── globals.css               # Design tokens, Tailwind base, dark mode
│   ├── actions.js                # ALL Server Actions (1056 lines, 'use server')
│   │
│   ├── (store)/                  # Route group: store-facing pages
│   │   ├── layout.js             # 'use cache' shell: wraps AuthProvider, CartProvider,
│   │   │                         #   WishlistProvider, LayoutWrapper, TrackingScripts
│   │   ├── loading.js            # Global loading fallback
│   │   │
│   │   ├── (content)/            # Pages with nav + footer
│   │   │   ├── page.js           # / — Home page (RSC)
│   │   │   ├── products/         # /products (catalog)
│   │   │   │   ├── page.js
│   │   │   │   └── [id]/         # /products/[slug] (product detail)
│   │   │   ├── orders/           # /orders (my orders)
│   │   │   │   └── [id]/         # /orders/[orderId]
│   │   │   ├── wishlist/         # /wishlist
│   │   │   ├── deals/            # /deals (discounted products)
│   │   │   ├── [slug]/           # Dynamic custom pages (About Us, etc.)
│   │   │   ├── auth/             # /auth (sign-in page)
│   │   │   ├── about-us/         # Static redirect → Settings customPage
│   │   │   ├── privacy-policy/
│   │   │   ├── refund-policy/
│   │   │   └── shipping-policy/
│   │   │
│   │   └── (checkout-shell)/     # Separate layout for checkout (no nav/footer)
│   │       └── checkout/         # /checkout
│   │
│   ├── admin/                    # Admin panel (protected by requireAdmin)
│   │   ├── layout.js             # Admin layout shell
│   │   ├── page.js               # /admin — Dashboard with KPI cards + chart
│   │   ├── AdminLayoutShell.jsx  # Full admin sidebar + navigation
│   │   ├── login/                # /admin/login
│   │   ├── products/             # /admin/products
│   │   ├── orders/               # /admin/orders + /admin/orders/[id]
│   │   ├── categories/           # /admin/categories
│   │   ├── analytics/            # /admin/analytics
│   │   ├── home-page/            # /admin/home-page (drag-and-drop builder)
│   │   ├── marketing/            # /admin/marketing (coupons, cover photos)
│   │   ├── users/                # /admin/users
│   │   ├── vendors/              # /admin/vendors
│   │   ├── reviews/              # /admin/reviews
│   │   ├── notifications/        # /admin/notifications
│   │   ├── settings/             # /admin/settings (store branding, shipping)
│   │   ├── shipping/             # /admin/shipping
│   │   ├── stock/                # /admin/stock (stock requests)
│   │   ├── roles/                # /admin/roles (manage admin emails)
│   │   ├── pages/                # /admin/pages (custom page editor)
│   │   ├── website/              # /admin/website
│   │   ├── store-setup/          # /admin/store-setup
│   │   ├── deals/                # /admin/deals
│   │   ├── cover-photos/         # /admin/cover-photos
│   │   ├── custom-pages/         # /admin/custom-pages
│   │   └── top-performing-products/
│   │
│   ├── api/                      # Route Handlers (REST API)
│   │   ├── auth/[...nextauth]/   # NextAuth endpoints
│   │   ├── products/             # GET /api/products (+ [id])
│   │   ├── categories/           # GET /api/categories
│   │   ├── settings/             # GET/PUT /api/settings
│   │   ├── home-page/            # GET /api/home-page
│   │   ├── reviews/              # GET/POST /api/reviews
│   │   ├── stock-requests/       # POST /api/stock-requests
│   │   ├── wishlist/             # GET/POST/DELETE /api/wishlist
│   │   ├── user/                 # GET/PUT /api/user
│   │   ├── tracking/meta/        # POST /api/tracking/meta (CAPI relay)
│   │   ├── cloudinary-sign/      # GET /api/cloudinary-sign
│   │   ├── images/               # POST /api/images/placeholder
│   │   ├── search-products/      # GET /api/search-products
│   │   ├── cover-photos/         # GET /api/cover-photos
│   │   ├── feeds/                # XML product feed for Facebook
│   │   └── admin/                # Admin-only API routes
│   │       ├── dashboard/        # GET /api/admin/dashboard
│   │       ├── orders/           # GET /api/admin/orders (+ [id])
│   │       ├── products/         # CRUD /api/admin/products
│   │       ├── chart/            # GET /api/admin/chart
│   │       ├── coupons/          # CRUD /api/admin/coupons
│   │       ├── users/            # GET /api/admin/users
│   │       ├── vendors/          # CRUD /api/admin/vendors
│   │       ├── reviews/          # GET/DELETE /api/admin/reviews
│   │       ├── notifications/    # GET/PATCH /api/admin/notifications
│   │       ├── generate-seo/     # POST /api/admin/generate-seo (Gemini AI)
│   │       └── debug-db/         # GET /api/admin/debug-db (dev tool)
│   │
│   ├── facebook-feed.xml/        # Facebook product catalog XML feed
│   ├── robots.js                 # Dynamic robots.txt
│   ├── icon.js                   # Dynamic favicon from Settings
│   ├── opengraph-image.png       # Static OG image
│   ├── error.js                  # Global error boundary
│   └── not-found.js              # 404 page
│
├── components/                   # Shared React components
│   ├── ui/                       # shadcn/ui primitives (38 components)
│   ├── admin/                    # Admin-specific complex components
│   ├── home/                     # Home page section components
│   ├── deals/                    # Deals page components
│   └── icons/                    # Custom SVG icon components
│
├── context/                      # React Context providers
│   ├── CartContext.jsx            # Cart state (3 split contexts)
│   └── WishlistContext.jsx        # Wishlist state + DB sync
│
├── hooks/                        # Custom React hooks
│   └── use-mobile.js             # useIsMobile() — breakpoint detection
│
├── lib/                          # Server-side utilities (30 files)
│   ├── data.js                   # ALL data fetching functions (~2400 lines)
│   ├── auth.js                   # NextAuth config
│   ├── mongooseConnect.js        # DB connection singleton
│   ├── orderFulfillment.js       # Order item resolution + inventory
│   ├── checkoutPricing.js        # Shipping + discount calculation
│   ├── order-status.js           # Status enum + legacy mapping
│   ├── emailTemplates.js         # HTML email templates (~32 KB)
│   ├── trackingServer.js         # Meta CAPI + TikTok events
│   ├── clientTracking.js         # Browser-side pixel events
│   ├── cloudinaryImage.js        # URL optimization transforms
│   ├── cloudinaryUpload.js       # Signed upload flow
│   ├── invoice-generator.js      # jsPDF invoice builder
│   ├── admin.js                  # Admin email helpers
│   ├── requireAdmin.js           # Page-level admin guard
│   ├── homePageSections.js       # Section type definitions + normalizers
│   ├── customPages.js            # Custom page merge/lookup
│   ├── productCategories.js      # Category ID normalizers
│   ├── productImages.js          # Image normalizer
│   ├── siteUrl.js                # Canonical URL resolution
│   ├── richText.js               # HTML sanitizer wrapper
│   ├── vendors.js                # Vendor snapshot normalizer
│   ├── imagePlaceholder.js       # Blur placeholder generator
│   ├── imagePlaceholders.js      # Batch placeholder
│   ├── seoKeywords.js            # SEO keyword utilities
│   ├── categoryColors.js         # Category color map
│   ├── whatsapp.js               # WhatsApp URL builder
│   ├── cities.js                 # Pakistani cities list
│   ├── social.js                 # Social links
│   └── deals/                   # Deals-specific helpers
│
├── models/                       # Mongoose schemas (13 models)
│   ├── Product.js
│   ├── Order.js
│   ├── OrderLog.js
│   ├── User.js
│   ├── Category.js
│   ├── Coupon.js
│   ├── Vendor.js
│   ├── Review.js
│   ├── Notification.js
│   ├── Settings.js               # Singleton pattern
│   ├── HomePage.js               # Singleton pattern
│   ├── CoverPhoto.js
│   └── StockRequest.js
│
├── emails/                       # Email component files (if any)
└── proxy.js                      # Dev proxy configuration
```

---

## Architectural Patterns

### Pattern 1: Server Components First

All pages default to RSC (React Server Components). Client boundaries are pushed as deep as possible. The pattern:

```
page.js (RSC) — fetches data, renders static shell
  └─► SomeClientWrapper.jsx ('use client') — handles interactivity
        └─► SubComponent.jsx ('use client') — small interactive unit
```

**Examples:**
- `(store)/(content)/products/page.js` (RSC) → `ProductGridClient.jsx` (client)
- `(store)/(content)/products/[id]/page.js` (RSC) → `ProductActions.jsx` (client)

### Pattern 2: Server Actions as the Only Mutation Layer

All state mutations go through `'use server'` functions in `src/app/actions.js`. There are no client-side POST fetch calls to API routes for mutations — only Server Actions. This guarantees:
- CSRF protection by default
- Type-checked form serialization
- `revalidateTag` / `revalidatePath` co-located with the mutation

**Exception:** Image uploads and tracking events use fetch to Route Handlers (by necessity — binary data, external relay).

### Pattern 3: `'use cache'` on the Store Shell

The `(store)/layout.js` is the heaviest component (loads categories + settings). It uses `'use cache'` with `cacheLife('foreverish')` and `cacheTag('categories', 'settings')`. This means:
- The shell is rendered once and cached across all users
- `revalidateTag('settings')` immediately invalidates the cache when settings change in admin
- Categories and settings are **never** fetched on every request in production

### Pattern 4: Singleton DB Documents

`Settings` and `HomePage` use the singleton pattern:
```js
Settings.findOneAndUpdate({ singletonKey: 'site-settings' }, updates, { upsert: true })
```
There is always exactly one document. No query for "which settings doc?", no risk of orphaned docs.

### Pattern 5: Hot-Reload-Safe Model Registration

Every model file guards against Next.js HMR keeping stale Mongoose models in memory:
```js
const cached = mongoose.models.Product;
if (cached && (!cached.schema.path('newField'))) {
  delete mongoose.models.Product; // Force re-registration
}
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
```

### Pattern 6: `after()` for Non-Blocking Side Effects

`next/server`'s `after()` hook is used inside `submitOrderAction` to fire emails, tracking events, profile updates, and notifications **after** the HTTP response is returned to the client. The user sees the success screen immediately; side effects happen asynchronously.

### Pattern 7: Split Context Pattern for Cart

The `CartContext` is split into 3 separate contexts (`CartItemsContext`, `CartUiContext`, `CartActionsContext`). Components only subscribe to the slice they need. This avoids unnecessary re-renders — e.g., a button that only calls `addToCart` won't re-render when the cart item list changes.

### Pattern 8: Optimistic UI with `useOptimistic`

Cart mutations use React 19 `useOptimistic` to apply UI changes before `localStorage` persistence completes. The user sees instant feedback, and the actual state is committed immediately after.

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Page files | lowercase `page.js` / `page.jsx` | `page.js` |
| Component files | PascalCase `.jsx` | `ProductCard.jsx` |
| Library files | camelCase `.js` | `mongooseConnect.js` |
| Model files | PascalCase `.js` | `Product.js` |
| Context files | PascalCase `.jsx` | `CartContext.jsx` |
| CSS modules | N/A (Tailwind only) | — |
| Route handlers | `route.js` | `route.js` |
| Server actions | `actions.js` at `app/` root | `actions.js` |

### Field naming inconsistency (technical debt):
- Product model uses `PascalCase` fields: `Name`, `Price`, `Images`, `Category`, `StockStatus`
- All other models use `camelCase`: `storeName`, `customerEmail`, `totalAmount`
- This is a known legacy inconsistency from initial build — see [[TODO#field-naming]]

---

## Data Fetching Architecture

```
src/lib/data.js   ← CENTRAL data access layer
  │
  ├─ All functions are server-only ('server-only' import)
  ├─ Functions use cacheTag() + cacheLife() for fine-grained Next.js cache control
  ├─ Uses measureDataAccess() wrapper to log slow queries (>700ms)
  └─ Projection constants (PRODUCT_CARD_PROJECTION, PRODUCT_DETAIL_PROJECTION, etc.)
       prevent over-fetching from MongoDB
```

**Key data functions:**
- `getStoreSettings()` → singleton settings
- `getStoreCategories()` → enabled categories
- `getProducts(filters)` → paginated catalog
- `getProductBySlug(slug)` → single product with cacheTag
- `getAdminDashboardData()` → KPIs + recent orders
- `getAdminProducts(filters)` → admin product list
- `getAdminOrders(filters)` → orders with status aggregation
- `getUserOrders(email)` → customer orders

---

## 8. Security Architecture

1.  **Input Validation & Sanitization (Zod):** All user inputs across Server Actions and API Routes are strictly validated and sanitized using central Zod schemas (`src/lib/validation.js`). This enforces field types, maximum string lengths, and prevents payload inflation.
2.  **Authentication:** NextAuth.js handles session management. Protected actions verify the session via `getServerSession()`.
3.  **Admin Authorization:** Actions like `assertAdmin()` check `session.user.isAdmin`.
4.  **Demo Mode:** Read-only `session.user.isDemo` blocks state mutations safely.

| Concern | Mechanism |
|---|---|
| Admin page access | `requireAdmin()` → redirect to `/admin/login` |
| Admin API access | `assertAdmin()` in every Server Action |
| Demo mode write protection | `requireMutationAccess()` throws |
| User account banning | `User.disabled` → JWT callback returns `null` |
| Force logout | `User.forceLogoutAt` vs `token.iat` comparison |
| HTML injection | `sanitize-html` on all rich text before render |
| Cloudinary upload security | Server-signed upload signatures (never expose API secret client-side) |
| CAPI user data | SHA-256 hashed before sending to Meta/TikTok |

---

## Caching Strategy

| Data | Cache Strategy | Invalidated by |
|---|---|---|
| Categories + Settings | `'use cache'` + `cacheLife('foreverish')` + `cacheTag('settings','categories')` | `revalidateTag('settings')` |
| Products list | `cacheTag('products')` | Product CRUD actions |
| Single product | `cacheTag(`product-${slug}`)` | Product edit/delete |
| Home sections | `cacheTag('home-sections')` | HomePage builder save |
| Admin dashboard | `cacheTag('admin-dashboard')` | Orders, products mutations |
| Orders | `cacheTag('orders')` | Order status updates |

---

## Deployment Notes

- **Env detection:** `process.env.VERCEL === '1'` or `AWS_LAMBDA_FUNCTION_NAME` triggers shorter DB timeouts
- **`NEXT_PHASE`:** Build-time detection prevents DB calls during static generation
- **`next.config.mjs`:** `allowedDevOrigins` set for local network access (192.168.1.100)
- **MongoDB driver:** Pool size 10, `bufferCommands: false` (fail fast if no connection)

---

*Next: [[API-Routes-and-Models]] · [[Flows-and-Workflows]] · [[TODO]]*
