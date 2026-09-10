# China Unique Items Technical Manual

## 1. Project Overview

This project is a full-stack ecommerce application built on the Next.js App Router, using MongoDB via Mongoose, `next-auth` for authentication, and a hybrid rendering model that mixes:

- server-rendered route segments
- client components for interactivity
- route handlers for API endpoints
- server actions for privileged write operations
- tag-based cache invalidation for storefront freshness

The codebase is organized under [`src/app`](/Users/razak/China-Unique-Items/src/app), with a clear split between:

- `src/app/(store)` for the public storefront
- `src/app/admin` for the internal admin workspace
- `src/app/api` for route handlers

The current implementation behaves like a headless-lite commerce system: catalog, cart, checkout, orders, reviews, wishlist, user profile settings, tracking, and admin content operations are all implemented inside the same monorepo.

## 2. System Architecture & Tech Stack

### 2.1 Core Stack

Observed from [`package.json`](/Users/razak/China-Unique-Items/package.json):

- Framework: `next@16.2.1`
- React: `react@19.2.4`, `react-dom@19.2.4`
- Authentication: `next-auth@4.24.13`
- Database: MongoDB + `mongoose@9.3.1`
- Styling: Tailwind CSS v4 + CSS variables in [`globals.css`](/Users/razak/China-Unique-Items/src/app/globals.css)
- UI primitives: Base UI, Radix, shadcn-style wrappers in [`src/components/ui`](/Users/razak/China-Unique-Items/src/components/ui)
- Notifications: `sonner`
- Image/media: Cloudinary
- Email: Resend
- Export/reporting: ExcelJS, jsPDF, jspdf-autotable
- Navigation feedback: `nextjs-toploader`
- Carousels: Embla + custom CSS scroll-snap carousels

### 2.2 Next.js Configuration

Observed in [`next.config.mjs`](/Users/razak/China-Unique-Items/next.config.mjs):

- `cacheComponents: true`
- custom `cacheLife.foreverish`
- `reactCompiler: true`
- experimental cached navigations enabled
- `allowedDevOrigins` contains a local IP for LAN access
- browser logs are forwarded to terminal
- images are `unoptimized: true`
- remote images are allowed from `res.cloudinary.com`

Implication:

- the app relies on Next.js App Router caching APIs such as `cacheTag`, `cacheLife`, `revalidateTag`, and `revalidatePath`
- image optimization is delegated to Cloudinary transforms rather than the Next image optimizer

### 2.3 App Router Structure

#### Root Layer

Key files under [`src/app`](/Users/razak/China-Unique-Items/src/app):

- [`layout.js`](/Users/razak/China-Unique-Items/src/app/layout.js): root HTML shell, metadata, tracking script injection, toaster
- [`loading.js`](/Users/razak/China-Unique-Items/src/app/loading.js): app-wide loading fallback
- [`error.js`](/Users/razak/China-Unique-Items/src/app/error.js): route error boundary
- [`global-error.js`](/Users/razak/China-Unique-Items/src/app/global-error.js): root error boundary
- [`not-found.js`](/Users/razak/China-Unique-Items/src/app/not-found.js): global 404
- [`actions.js`](/Users/razak/China-Unique-Items/src/app/actions.js): server actions

#### Storefront Route Group

Under [`src/app/(store)`](/Users/razak/China-Unique-Items/src/app/(store)):

- `/`
- `/products`
- `/products/[id]`
- `/checkout`
- `/orders`
- `/orders/[id]`
- `/wishlist`
- `/settings`
- policy/info pages:
  - `/about-us`
  - `/privacy-policy`
  - `/refund-policy`
  - `/shipping-policy`
- `/auth/signin`

Store layout is defined in [`src/app/(store)/layout.js`](/Users/razak/China-Unique-Items/src/app/(store)/layout.js). Provider nesting is:

1. `AuthProvider`
2. `CartProvider`
3. `WishlistProvider`
4. `TooltipProvider`
5. `LayoutWrapper`

This is the main storefront runtime composition.

#### Admin Route Tree

Under [`src/app/admin`](/Users/razak/China-Unique-Items/src/app/admin):

- `/admin`
- `/admin/login`
- `/admin/products`
- `/admin/products/add`
- `/admin/products/edit/[id]`
- `/admin/categories`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/shipping`
- `/admin/cover-photos`
- `/admin/settings`
- `/admin/users`
- `/admin/reviews`

Admin layout:

- [`src/app/admin/layout.js`](/Users/razak/China-Unique-Items/src/app/admin/layout.js) fetches session and renders [`AdminLayoutShell.jsx`](/Users/razak/China-Unique-Items/src/app/admin/AdminLayoutShell.jsx)
- route protection is enforced primarily by [`src/proxy.js`](/Users/razak/China-Unique-Items/src/proxy.js)
- some pages also call [`requireAdmin()`](/Users/razak/China-Unique-Items/src/lib/requireAdmin.js) server-side

### 2.4 Rendering Model

The codebase uses:

- server components for pages/layouts/data loading
- client components for forms, drawers, carts, wishlists, navigation, and admin interactivity
- route handlers for HTTP endpoints
- server actions for trusted write flows

This follows the Next.js guidance that browser APIs such as `localStorage`, event handlers, and effects belong in client components, while DB reads/writes and secrets stay server-side.

### 2.5 Caching Strategy

The shared data layer is [`src/lib/data.js`](/Users/razak/China-Unique-Items/src/lib/data.js). It centralizes read models such as:

- `getStoreSettings`
- `getStoreCategories`
- `getHomeSections`
- `getProductsList`
- `getProductBySlug`
- `getRelatedProducts`
- `getAdminProductsPage`
- `getAdminOrdersPage`
- `getAdminUsersPage`
- `getAdminReviewsPage`
- `getAdminDashboardData`

Observed cache behaviors:

- reads are memoized/tagged using Next cache APIs
- writes invalidate tags via `revalidateTag(...)`
- some writes also call `revalidatePath(...)`

Important cache tags visible in code:

- `settings`
- `products`
- `product-${slug}`
- `home-sections`
- `orders`
- `admin-dashboard`
- category/review-specific tags

## 3. Database Schema

The app uses MongoDB collections via Mongoose models in [`src/models`](/Users/razak/China-Unique-Items/src/models).

### 3.1 `Product`

Defined in [`Product.js`](/Users/razak/China-Unique-Items/src/models/Product.js)

Fields:

- `Name: String` required
- `Description: String`
- `Price: Number` required
- `Images: [{ url, blurDataURL, publicId }]`
- `Category: ObjectId[]` refs `Category`
- `stockQuantity: Number`
- `StockStatus: 'In Stock' | 'Out of Stock'`
- `slug: String` unique
- `isLive: Boolean`
- `discountPercentage: Number`
- `isDiscounted: Boolean`
- `discountedPrice: Number | null`
- `isNewArrival: Boolean`
- `isBestSelling: Boolean`
- timestamps

Relationships:

- many-to-many-like category assignment through `Category[]`
- referenced by `Review.productId`
- referenced textually in `Order.items.productId`

### 3.2 `Category`

Defined in [`Category.js`](/Users/razak/China-Unique-Items/src/models/Category.js)

Fields:

- `name: String` unique
- `slug: String` unique
- `image: String`
- `imagePublicId: String`
- `blurDataURL: String`
- `sortOrder: Number`
- `isEnabled: Boolean`
- `showOnHome: Boolean`
- timestamps

Relationships:

- referenced by `Product.Category[]`

### 3.3 `Order`

Defined in [`Order.js`](/Users/razak/China-Unique-Items/src/models/Order.js)

Fields:

- `orderId: String` unique
- `customerEmail: String`
- `customerName: String`
- `customerPhone: String`
- `customerAddress: String`
- `customerCity: String`
- `landmark: String`
- `paymentStatus: 'COD' | 'Online'`
- `weight: Number`
- `manualCodAmount: Number`
- `itemType: String`
- `orderQuantity: Number`
- `items: [{ productId, name, price, quantity, image, isReviewed }]`
- `totalAmount: Number`
- `status: 'Confirmed' | 'In Process' | 'Delivered' | 'Returned'`
- `courierName: String`
- `trackingNumber: String`
- `notes: String`
- `secureToken: String`
- timestamps

Relationships:

- one order has many embedded order items
- one order has many `OrderLog` entries
- order ownership is linked by `customerEmail` rather than foreign key

### 3.4 `User`

Defined in [`User.js`](/Users/razak/China-Unique-Items/src/models/User.js)

Fields:

- `name: String`
- `email: String` unique
- `image: String`
- `phone: String`
- `city: String`
- `address: String`
- `landmark: String`
- `disabled: Boolean`
- `forceLogoutAt: Date`
- `wishlist: String[]`
- timestamps

Relationships:

- `Review.userId` references `User`
- orders are linked logically by normalized email
- wishlist stores product IDs as strings

### 3.5 `Review`

Defined in [`Review.js`](/Users/razak/China-Unique-Items/src/models/Review.js)

Fields:

- `productId: ObjectId` ref `Product`
- `userId: ObjectId` ref `User`
- `userName: String`
- `rating: Number (1-5)`
- `comment: String`
- `isApproved: Boolean`
- timestamps

### 3.6 `Settings`

Defined in [`Settings.js`](/Users/razak/China-Unique-Items/src/models/Settings.js)

Singleton document keyed by `singletonKey = 'site-settings'`

Fields:

- general:
  - `storeName`
  - `supportEmail`
  - `businessAddress`
- social:
  - `whatsappNumber`
  - `facebookPageUrl`
  - `instagramUrl`
- tracking:
  - `trackingEnabled`
  - `facebookPixelId`
  - `facebookConversionsApiToken`
  - `facebookTestEventCode`
  - `tiktokPixelId`
  - `tiktokAccessToken`
- shipping:
  - `karachiDeliveryFee`
  - `outsideKarachiDeliveryFee`
  - `freeShippingThreshold`
- announcement:
  - `announcementBarEnabled`
  - `announcementBarText`
- admin control:
  - `adminEmails: String[]`
- timestamps

### 3.7 `CoverPhoto`

Defined in [`CoverPhoto.js`](/Users/razak/China-Unique-Items/src/models/CoverPhoto.js)

Singleton document keyed by `singletonKey = 'home-cover-photos'`

Fields:

- `slides[]`
  - `desktopImage`
  - `tabletImage`
  - `mobileImage`
  - `alt`
  - `sortOrder`

### 3.8 `Notification`

Defined in [`Notification.js`](/Users/razak/China-Unique-Items/src/models/Notification.js)

Fields:

- `type: 'order' | 'review' | 'user'`
- `message`
- `link`
- `isRead`
- `metadata`
- timestamps

Used for admin notification center.

### 3.9 `OrderLog`

Defined in [`OrderLog.js`](/Users/razak/China-Unique-Items/src/models/OrderLog.js)

Fields:

- `orderId: ObjectId` ref `Order`
- `action`
- `details`
- `previousStatus`
- `newStatus`
- `adminName`
- `adminEmail`
- timestamps

## 4. Authentication & Session Management

### 4.1 Provider Setup

Configured in [`src/lib/auth.js`](/Users/razak/China-Unique-Items/src/lib/auth.js)

Providers:

- Google OAuth
- Credentials provider for admin login

### 4.2 Google OAuth Flow

When a user signs in with Google:

1. `signIn` callback runs
2. MongoDB connection is opened
3. email is normalized via [`normalizeEmail`](C:/Users/razak/China-Unique-Items/src/lib/admin.js)
4. existing user is checked
5. if `disabled === true`, sign-in is blocked
6. `User` document is upserted with name/image/email
7. if this is a first-time user, a `Notification` document is created for admins

### 4.3 Admin Credentials Flow

Credentials provider is intended for admin login:

- email must match env-configured admin email(s)
- password must match `ADMIN_PASSWORD`
- returned session user is synthetic (`Raza Admin`)

### 4.4 JWT Callback

The JWT callback performs:

- email normalization
- admin resolution from:
  - env admin list
  - dynamic `Settings.adminEmails`
- strict session validation against DB:
  - if user disabled, JWT is invalidated
  - if `forceLogoutAt` is newer than token `iat`, JWT is invalidated

### 4.5 Session Callback

Session callback:

- copies normalized email into session
- adds custom `session.user.isAdmin`

### 4.6 Provider Wiring in React

Client session context is mounted via [`AuthProvider.jsx`](/Users/razak/China-Unique-Items/src/components/AuthProvider.jsx), which is a thin `SessionProvider` wrapper.

### 4.7 Route Protection

Two protection layers are in use:

- [`src/proxy.js`](/Users/razak/China-Unique-Items/src/proxy.js)
  - redirects unauthenticated/non-admin users away from `/admin`
  - redirects unauthenticated users away from `/orders`
- [`requireAdmin()`](/Users/razak/China-Unique-Items/src/lib/requireAdmin.js)
  - server-side redirect to `/admin/login`

## 5. Backend & API Logic

### 5.1 Shared Backend Layers

The backend is split across:

- route handlers in [`src/app/api`](/Users/razak/China-Unique-Items/src/app/api)
- server actions in [`actions.js`](/Users/razak/China-Unique-Items/src/app/actions.js)
- data read layer in [`src/lib/data.js`](/Users/razak/China-Unique-Items/src/lib/data.js)
- low-level helpers:
  - [`mongooseConnect.js`](/Users/razak/China-Unique-Items/src/lib/mongooseConnect.js)
  - [`auth.js`](/Users/razak/China-Unique-Items/src/lib/auth.js)
  - [`trackingServer.js`](/Users/razak/China-Unique-Items/src/lib/trackingServer.js)

### 5.2 Server Actions

Defined in [`src/app/actions.js`](/Users/razak/China-Unique-Items/src/app/actions.js)

- `toggleProductLiveAction(productId, nextValue)`
- `deleteProductAction(productId)`
- `setProductDiscountAction(productId, discountPercentage)`
- `saveStoreSettingsAction(nextSettings)`
- `submitOrderAction(input)`
- `getLastOrderDetailsAction()`
- `linkOrdersAction(phone)`
- `updateOrderAction(id, updates)`

These actions are used for trusted write flows from the admin UI and checkout flow, and they handle revalidation after mutations.

### 5.3 API Endpoints

#### Authentication

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | `GET`, `POST` | public | NextAuth entrypoint |

#### Catalog & Product Management

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/products` | `GET` | public | list products |
| `/api/products` | `POST` | admin | create product |
| `/api/products/[id]` | `GET` | public | fetch one product by DB id |
| `/api/products/[id]` | `PUT` | admin | full product update |
| `/api/products/[id]` | `PATCH` | admin | stock toggle, marketing flags, discount patch |
| `/api/categories` | `GET` | public | list categories |
| `/api/categories` | `POST` | admin | create category |
| `/api/categories` | `PUT` | admin | bulk sort order update |
| `/api/categories` | `DELETE` | admin | delete category |
| `/api/categories/[id]` | `PATCH` | admin | edit category fields |
| `/api/search-products` | `GET` | public | live product search suggestions |

#### Store Settings & CMS

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/settings` | `GET` | public | read sanitized store settings |
| `/api/settings` | `PUT` | admin | update settings singleton |
| `/api/settings/admins` | `GET` | admin | list dynamic admin emails |
| `/api/settings/admins` | `POST` | admin | add admin email |
| `/api/settings/admins` | `DELETE` | admin | remove admin email |
| `/api/cover-photos` | `GET` | public | read homepage hero slides |
| `/api/cover-photos` | `PUT` | admin | update hero slide set |

#### Orders, Users, Reviews

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/orders` | `GET` | session user | fetch user-linked orders |
| `/api/orders` | `POST` | public | create order |
| `/api/user/settings` | `GET` | session user | fetch current user profile |
| `/api/user/settings` | `PATCH` | session user | update current user profile |
| `/api/reviews` | `GET` | public | list reviews for a product |
| `/api/reviews` | `POST` | session user | create single review |
| `/api/reviews/bulk` | `POST` | session user | submit multiple reviews from order |
| `/api/reviews/check-permission` | `GET` | optional session | determine if user can review a product |
| `/api/reviews/[id]` | `DELETE` | admin | delete review by id |
| `/api/wishlist` | `GET` | session user | read DB-backed wishlist |
| `/api/wishlist` | `POST` | session user | add product to wishlist |
| `/api/wishlist` | `PUT` | session user | merge guest wishlist IDs into DB |
| `/api/wishlist` | `DELETE` | session user | remove wishlist item |

#### Admin APIs

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/admin/dashboard` | `GET` | admin | dashboard stats JSON |
| `/api/admin/notifications` | `GET` | admin | list notifications |
| `/api/admin/notifications` | `PATCH` | admin | mark notifications read |
| `/api/admin/orders/[id]` | `PATCH` | admin | update order status/tracking/COD metadata and log change |
| `/api/admin/reviews` | `GET` | admin | list reviews for admin table |
| `/api/admin/reviews` | `DELETE` | admin | delete review by query id |
| `/api/admin/users` | `GET` | admin | list registered users/customer rollups |
| `/api/admin/users/[id]` | `PATCH` | admin | disable/enable user or force logout |

#### Media, Feeds, Integrations

| Route | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/cloudinary-sign` | `GET` | public or trusted frontend | return Cloudinary signature params |
| `/api/images/placeholder` | `POST` | public/server-assisted | generate blur placeholder |
| `/api/feeds/catalog` | `GET` | public | product catalog feed |
| `/api/tracking/meta` | `POST` | mixed | Meta CAPI dispatch endpoint |
| `/facebook-feed.xml` | `GET` | public | XML feed route |

### 5.4 Validation & Error Handling Patterns

Observed patterns across routes and actions:

- auth checks:
  - `getServerSession(authOptions)`
  - `session.user.isAdmin`
  - `requireAdmin()`
- DB guard:
  - `await mongooseConnect()`
- input validation:
  - explicit presence checks
  - enum guards
  - numeric coercion with `Number(...)`
  - category existence validation before saving products
  - email normalization
  - phone normalization/fuzzy regex matching
- error responses:
  - `401` unauthorized
  - `400` bad input
  - `404` missing resource
  - `500` unexpected server failure
- optimistic UI rollback:
  - wishlist client logic
- cache invalidation after writes:
  - `revalidateTag`
  - `revalidatePath`

### 5.5 Server-Side Tracking (Meta CAPI)

Primary files:

- [`src/lib/trackingServer.js`](/Users/razak/China-Unique-Items/src/lib/trackingServer.js)
- [`src/app/api/tracking/meta/route.js`](/Users/razak/China-Unique-Items/src/app/api/tracking/meta/route.js)
- [`src/lib/clientTracking.js`](/Users/razak/China-Unique-Items/src/lib/clientTracking.js)

#### Settings dependency

Tracking only runs if:

- `trackingEnabled === true`
- Meta settings exist:
  - `facebookPixelId`
  - `facebookConversionsApiToken`

#### Payload construction

`sendMetaEvent(...)` builds:

- `event_name`
- `event_time`
- `event_id`
- `action_source: 'website'`
- `event_source_url`
- `user_data`
- `custom_data`
- `test_event_code` when configured

#### User data hashing and enrichment

`sanitizeUserData(...)` includes:

- `em`: SHA-256 hashed email
- `ph`: SHA-256 hashed normalized phone
- `external_id`: SHA-256 hashed external id
- `client_ip_address`
- `client_user_agent`
- `fbp`
- `fbc`

#### Meta handshake

Requests are sent to:

- `https://graph.facebook.com/v20.0/{pixelId}/events?access_token=...`

The route returns Meta response payloads back to the caller for debugging.

#### Event coverage

Browser + CAPI tracking currently exists for:

- `PageView`
- `ViewContent`
- `Search`
- `AddToWishlist`
- `AddToCart`
- `InitiateCheckout`
- `Purchase`

Purchase also has a dedicated server dispatch in `sendPurchaseTrackingEvents(...)`.

### 5.6 TikTok Tracking

`trackingServer.js` also includes TikTok server event dispatch for purchase:

- uses `tiktokPixelId`
- uses `tiktokAccessToken`
- sends to TikTok business API

Browser TikTok script bootstrap is injected in [`TrackingScripts.jsx`](/Users/razak/China-Unique-Items/src/components/TrackingScripts.jsx).

## 6. Frontend & UX Architecture

### 6.1 Global Providers & Data Flow

Storefront provider tree from [`src/app/(store)/layout.js`](/Users/razak/China-Unique-Items/src/app/(store)/layout.js):

1. `SessionProvider`
2. `CartProvider`
3. `WishlistProvider`
4. `TooltipProvider`
5. layout shell with navbar/footer/cart drawer/floating WhatsApp

### 6.2 Cart State

Defined in [`src/context/CartContext.jsx`](/Users/razak/China-Unique-Items/src/context/CartContext.jsx)

State:

- `cart[]`
- `isInitialized`
- `activeCategory`
- `isCartOpen`
- `isSidebarOpen`

Persistence:

- stored in `localStorage` key `kifayatly_cart_v2`

Core actions:

- `addToCart`
- `removeFromCart`
- `updateQuantity`
- `clearCart`
- `openCart`
- `openSidebar`
- setters for UI state

Cross-system effect:

- `addToCart()` now triggers `AddToCart` browser + CAPI tracking through [`trackAddToCartEvent`](C:/Users/razak/China-Unique-Items/src/lib/clientTracking.js)

### 6.3 Wishlist State

Defined in [`src/context/WishlistContext.jsx`](/Users/razak/China-Unique-Items/src/context/WishlistContext.jsx)

State:

- `items[]`
- `ids[]`
- `isLoading`
- derived `wishlistCount`

Persistence model:

- guest IDs stored in `china_unique_guest_wishlist`
- guest item snapshots stored in `china_unique_guest_wishlist_items`
- signed-in users sync against `/api/wishlist`

Hydration behavior:

- initial render starts empty/loading
- guest snapshot is loaded in `useEffect`
- this avoids SSR/client mismatch

Auth behavior:

- guests can persist locally
- auth modal is shown on guest interaction entry points
- on sign-in, guest IDs are merged into DB via `PUT /api/wishlist`

### 6.4 User Profile State

No global user profile store exists.

Profile data flows through:

- `next-auth` session
- `/api/user/settings`
- checkout/order linking actions

The user profile is therefore server-backed and fetched on demand rather than maintained in a dedicated global context.

### 6.5 Layout Composition

`LayoutWrapper.jsx` is the storefront shell:

- navbar
- page content slot
- footer
- floating WhatsApp button
- cart drawer

Dynamic settings consumed there:

- `storeName`
- `whatsappNumber`
- `facebookPageUrl`
- `instagramUrl`

### 6.6 Responsive Breakpoints

Tailwind defaults are in effect:

- `sm = 640px`
- `md = 768px`
- `lg = 1024px`
- `xl = 1280px`

Observed responsive rules:

#### Cart Drawer

In [`CartDrawer.jsx`](/Users/razak/China-Unique-Items/src/components/CartDrawer.jsx):

- mobile default:
  - `w-screen`
  - `min-w-0`
  - `max-w-none`
- desktop from `md`:
  - `md:w-[min(70vw,28rem)]`
  - `md:min-w-[18rem]`
  - `md:max-w-[28rem]`

Result:

- below `768px`, cart drawer is full-screen width
- `768px+`, it becomes a constrained side drawer

#### Mobile Menu / Sidebar

In [`Navbar.jsx`](/Users/razak/China-Unique-Items/src/components/Navbar.jsx):

- mobile default:
  - `w-screen`
  - `max-w-none`
- desktop from `md`:
  - `md:w-[min(76vw,22rem)]`
  - `md:min-w-[16rem]`
  - `md:max-w-[22rem]`

Result:

- below `768px`, side menu is full-screen width
- `768px+`, menu becomes a smaller drawer

#### Product Grid

In [`src/app/(store)/products/page.js`](/Users/razak/China-Unique-Items/src/app/(store)/products/page.js):

- mobile: `grid-cols-2`
- tablet: `md:grid-cols-3`
- desktop: `lg:grid-cols-4`

#### Hero Assets

In [`HeroSlider.jsx`](/Users/razak/China-Unique-Items/src/components/HeroSlider.jsx):

- `<768`: mobile asset
- `768-1023`: tablet asset
- `1024+`: desktop asset

### 6.7 Animation Engine

There is no Framer Motion in the current implementation.

The animation system is CSS-first and component-local:

- custom keyframes in [`globals.css`](/Users/razak/China-Unique-Items/src/app/globals.css)
- `tw-animate-css`
- Base UI dialog/sheet transition data attributes
- CSS transitions using carefully scoped properties

Important animation patterns:

- hero slider fade transitions:
  - `.hero-fade-slide`
  - `hero-fade-in`, `hero-fade-out`
- cart item removal:
  - grid row collapse
  - opacity fade
  - horizontal translate
  - short 180ms exit to reduce jank on low-end devices
- navbar search open/close:
  - `grid-template-rows`
  - `opacity`
  - `filter`
- product hover states:
  - image scale
  - reveal wishlist button on desktop hover
- toast entry/exit/progress:
  - custom keyframes
- announcement marquee:
  - infinite CSS transform loop
- route feedback:
  - `nextjs-toploader`

Performance-oriented choices:

- frequent use of `will-change`
- short transition windows
- transform/opacity over layout-heavy animation where possible
- no heavy animation library bundle

### 6.8 Search Experience

Search occurs in multiple surfaces:

- navbar search
- home mobile search
- products page toolbar

Patterns:

- 250ms debounce
- suggestion fetches via `/api/search-products`
- final navigation to `/products?search=...`
- `Search` tracking event fired on submit

### 6.9 Product Discovery Components

Key storefront components:

- [`HeroSlider.jsx`](/Users/razak/China-Unique-Items/src/components/HeroSlider.jsx)
- [`CategoryIconCarousel.jsx`](/Users/razak/China-Unique-Items/src/components/CategoryIconCarousel.jsx)
- [`CategoryProductSlider.jsx`](/Users/razak/China-Unique-Items/src/components/CategoryProductSlider.jsx)
- [`ProductCard.jsx`](/Users/razak/China-Unique-Items/src/components/ProductCard.jsx)
- [`ProductActions.jsx`](/Users/razak/China-Unique-Items/src/components/ProductActions.jsx)
- [`ProductGallery.jsx`](/Users/razak/China-Unique-Items/src/components/ProductGallery.jsx)
- [`ProductReviewsClient.jsx`](/Users/razak/China-Unique-Items/src/components/ProductReviewsClient.jsx)

## 7. Admin Engine & CMS

### 7.1 Admin Shell

[`AdminLayoutShell.jsx`](/Users/razak/China-Unique-Items/src/app/admin/AdminLayoutShell.jsx) provides:

- sticky top bar
- desktop sidebar
- mobile admin sheet navigation
- notification center
- user avatar/dropdown
- top loader

### 7.2 Dashboard

Dashboard page at [`src/app/admin/page.js`](/Users/razak/China-Unique-Items/src/app/admin/page.js)

Capabilities:

- total orders
- total revenue
- total products
- total customers
- daily confirmed orders
- recent orders
- shortcut to add product

There is also a separate JSON dashboard route at `/api/admin/dashboard`.

### 7.3 Product Management

Admin products page and forms provide:

- list, filter, sort, paginate products
- create product
- edit product
- delete product
- live/draft toggle
- stock status toggle
- discount dialog
- marketing flags:
  - `isNewArrival`
  - `isBestSelling`
- review inspection dialog

### 7.4 Category Management

Capabilities:

- create/edit/delete categories
- image assignment
- blur placeholder handling
- ordering via `sortOrder`
- enabled/disabled visibility
- homepage visibility via `showOnHome`

### 7.5 Orders Management

Admin orders tools include:

- paginated order table
- search and status filtering
- date-range filtering
- order detail page
- quick status updates
- courier/tracking updates
- COD/manual amount editing
- order logs
- export selected orders to:
  - Excel
  - PDF
- monthly sales report export

### 7.6 Shipping Management

Admin shipping page manages:

- Karachi delivery fee
- outside Karachi delivery fee
- free shipping threshold

These values are stored in the `Settings` singleton.

### 7.7 Cover Photos / Homepage CMS

Admin cover photos page manages homepage hero slides:

- desktop image
- tablet image
- mobile image
- alt text
- ordering

### 7.8 Settings CMS

Admin settings page manages:

- store identity
- support email
- business address
- WhatsApp number
- Facebook page URL
- Instagram URL
- tracking toggle
- Meta Pixel ID
- Meta CAPI token
- Meta Test Event code
- TikTok pixel/access token
- announcement bar toggle/text
- dynamic admin emails

### 7.9 Users Management

Admin users page supports:

- switch between:
  - registered users
  - customers aggregated from order history
- search/filter/pagination
- disable user
- re-enable user
- force logout
- deep-link highlighting from admin notifications

### 7.10 Reviews Management

Admin review tooling supports:

- list reviews
- search
- summary metrics
- delete reviews
- deep-link highlighting

## 8. Deployment, Environment, and Security

### 8.1 Environment Variables

Observed from code references:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_EMAILS`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`

### 8.2 Vercel / Hosting Posture

Observed indicators:

- no `vercel.json` present
- project is fully compatible with Vercel’s default Next.js deployment flow
- root metadata defaults reference `https://china-unique-items.vercel.app`

Current deployment assumption:

- standard Vercel build using `next build`
- runtime env vars configured in hosting dashboard

### 8.3 Security Controls in Code

Implemented:

- admin route guarding via `proxy.js`
- session-based admin authorization
- disabled-user sign-in blocking
- forced logout via JWT invalidation
- server-side secret usage for:
  - OAuth secrets
  - Mongo URI
  - Cloudinary signing
  - Resend API key
  - Meta/TikTok server tracking
- normalized email/phone handling
- redirect-based protection for sensitive pages

Not observed in repository config:

- custom security headers in `next.config.mjs`
- CSP configuration
- rate limiting
- CSRF customization beyond NextAuth defaults
- explicit input schema library such as Zod
- formal audit logging outside order logs

### 8.4 Media & Upload Security

Cloudinary signing route exists:

- `/api/cloudinary-sign`

This implies uploads are intended to use signed parameters rather than fully public unsigned upload presets.

## 9. Version Control & Workflow

### 9.1 Current Observed Workflow

Observed from repository state:

- default branch is `main`
- no GitHub Actions workflow files were surfaced in the root scan
- no branch policy/config files were observed in repo root

Current practical workflow appears to be:

- local development on `main`
- direct commits
- direct push to `origin/main`

### 9.2 Operational Recommendation

For long-term maintainability, the current codebase would benefit from:

- feature branches instead of direct `main` pushes
- pull request review
- CI for lint/build smoke tests
- environment template documentation
- migration/change log for schema-impacting edits

## 10. Notable Architectural Characteristics

### 10.1 Strengths

- single shared data access layer
- clear storefront/admin separation
- MongoDB schemas are easy to extend
- provider stack is now stable
- guest + authenticated wishlist flows coexist
- tracking now supports both browser pixel and CAPI
- responsive mobile drawers are intentionally full-screen

### 10.2 Current Tradeoffs

- business logic is split between route handlers, server actions, and client-side fetches
- validation is mostly manual instead of schema-driven
- some admin APIs and server actions overlap in responsibility
- settings are singleton-document driven rather than per-domain config modules
- direct `main` pushes raise release risk
- no explicit security headers are configured

### 10.3 Important Implementation Notes

- wishlist persistence is dual-mode:
  - guest localStorage
  - signed-in MongoDB sync
- cart is entirely client-local
- orders are linked to users primarily through normalized email and fuzzy phone reconciliation
- animations are CSS-driven, not Framer Motion
- homepage/category sliders use native scrolling plus CSS enhancements rather than a single centralized carousel engine

## 11. File Index for Core Systems

### App & Layout

- [`src/app/layout.js`](/Users/razak/China-Unique-Items/src/app/layout.js)
- [`src/app/(store)/layout.js`](/Users/razak/China-Unique-Items/src/app/(store)/layout.js)
- [`src/app/admin/layout.js`](/Users/razak/China-Unique-Items/src/app/admin/layout.js)

### Data & DB

- [`src/lib/data.js`](/Users/razak/China-Unique-Items/src/lib/data.js)
- [`src/lib/mongooseConnect.js`](/Users/razak/China-Unique-Items/src/lib/mongooseConnect.js)
- [`src/models`](/Users/razak/China-Unique-Items/src/models)

### Auth & Access

- [`src/lib/auth.js`](/Users/razak/China-Unique-Items/src/lib/auth.js)
- [`src/lib/requireAdmin.js`](/Users/razak/China-Unique-Items/src/lib/requireAdmin.js)
- [`src/proxy.js`](/Users/razak/China-Unique-Items/src/proxy.js)

### State

- [`src/context/CartContext.jsx`](/Users/razak/China-Unique-Items/src/context/CartContext.jsx)
- [`src/context/WishlistContext.jsx`](/Users/razak/China-Unique-Items/src/context/WishlistContext.jsx)

### Tracking

- [`src/components/TrackingScripts.jsx`](/Users/razak/China-Unique-Items/src/components/TrackingScripts.jsx)
- [`src/components/TrackingPageView.jsx`](/Users/razak/China-Unique-Items/src/components/TrackingPageView.jsx)
- [`src/components/ProductViewTracking.jsx`](/Users/razak/China-Unique-Items/src/components/ProductViewTracking.jsx)
- [`src/lib/clientTracking.js`](/Users/razak/China-Unique-Items/src/lib/clientTracking.js)
- [`src/lib/trackingServer.js`](/Users/razak/China-Unique-Items/src/lib/trackingServer.js)
- [`src/app/api/tracking/meta/route.js`](/Users/razak/China-Unique-Items/src/app/api/tracking/meta/route.js)

### Admin

- [`src/app/admin`](/Users/razak/China-Unique-Items/src/app/admin)
- [`src/app/api/admin`](/Users/razak/China-Unique-Items/src/app/api/admin)

### Storefront UX

- [`src/components/LayoutWrapper.jsx`](/Users/razak/China-Unique-Items/src/components/LayoutWrapper.jsx)
- [`src/components/Navbar.jsx`](/Users/razak/China-Unique-Items/src/components/Navbar.jsx)
- [`src/components/CartDrawer.jsx`](/Users/razak/China-Unique-Items/src/components/CartDrawer.jsx)
- [`src/components/ProductCard.jsx`](/Users/razak/China-Unique-Items/src/components/ProductCard.jsx)
- [`src/components/ProductActions.jsx`](/Users/razak/China-Unique-Items/src/components/ProductActions.jsx)
- [`src/app/globals.css`](/Users/razak/China-Unique-Items/src/app/globals.css)

---

This manual documents the repository as observed in the current codebase state on March 27, 2026. It is intended to be used as the base technical reference for future onboarding, refactoring, and release planning.
