# Flows and Workflows

**Part of:** [[Index]] · **See also:** [[Skills-and-TechStack]], [[Architecture]], [[API-Routes-and-Models]]

---

## Overview

This document maps every major data flow in the China Unique Store — from user interactions through client state, server actions, database writes, and background side-effects.

---

## FLOW 1: Authentication

### 1A — Google OAuth Sign-In

```
User clicks "Sign in with Google"
  │
  └─► AuthModal.jsx opens → signIn('google') called
        │
        └─► NextAuth /api/auth/signin → Google OAuth redirect
              │
              ▼
          Google returns code
              │
              ▼
          NextAuth signIn callback (src/lib/auth.js)
              ├─ mongooseConnect()
              ├─ User.findOne({ email }) → check if disabled
              ├─ User.findOneAndUpdate(..., { upsert: true }) → create or update user
              │    └─ If NEW user: Notification.create({ type: 'user', message: 'New user signed up' })
              └─ return true (allow sign-in)
                    │
                    ▼
              JWT callback fires
                    ├─ normalizeEmail(email)
                    ├─ isAdminEmail(email) → check ADMIN_EMAIL env vars
                    ├─ Settings.adminEmails → dynamic DB admin check
                    ├─ User.findOne() → check disabled + forceLogoutAt
                    └─ Embed { isAdmin, isDemo } in JWT token
                          │
                          ▼
                    session callback → exposes session.user.isAdmin to client
```

**Technologies:** [[Skills-and-TechStack#3. Authentication — NextAuth v4]], MongoDB

### 1B — Admin Credentials Login

```
Admin navigates to /admin/login
  │
  └─► signIn('credentials', { email, password })
        │
        └─► CredentialsProvider.authorize()
              ├─ isAdminEmail(email) AND password === ADMIN_PASSWORD env var?
              │    └─ Yes → return { id: '1', name: 'Raza Admin', email }
              └─ No → return null (login fails)
```

### 1C — Guest / Demo Mode

```
User clicks "Guest Access"
  │
  └─► signIn('credentials', { isGuest: 'true' })
        │
        └─► authorize() checks Settings.guestModeEnabled
              ├─ false → return null (disabled)
              └─ true → return { isDemo: true, isAdmin: true }
                    │
                    └─► JWT embeds isDemo=true, isAdmin=true
                          (server actions check isDemo and block mutations)
```

### 1D — JWT Validation on Every Request

```
Any protected page/action loads
  │
  └─► getServerSession(authOptions)
        │
        └─► JWT callback re-runs:
              ├─ Check User.disabled → return null (invalidates session)
              └─ Check User.forceLogoutAt > token.iat → return null
```

**Guard functions:**
- `requireAdmin()` → `src/lib/requireAdmin.js` → redirects to `/admin/login` if not admin
- `requireMutationAccess()` → throws if `isDemo` mode
- `assertAdmin()` in `actions.js` → used by all admin Server Actions

---

## FLOW 2: Store Page Rendering (RSC + Cache)

### 2A — Home Page Initial Load

```
Browser requests /
  │
  ▼
(store)/layout.js  ← 'use cache' + cacheLife('foreverish') + cacheTag('categories','settings')
  ├─ getStoreCategories() → fetch from MongoDB (cached)
  └─ getStoreSettings() → fetch from MongoDB (cached)
        │
        ▼
  Renders: AuthProvider → CartProvider → WishlistProvider → LayoutWrapper → children
        │
        ▼
  (store)/(content)/page.js (home page RSC)
        ├─ getHomeSections() → HomePage document from MongoDB (cacheTag: 'home-sections')
        ├─ getProducts(filters) → Product collection (cacheTag: 'products')
        └─ getCoverPhotos() → CoverPhoto collection
              │
              ▼
        Passes props to HomeClientWrapper (client boundary)
              ├─ HeroSlider (Embla carousel, autoplay)
              ├─ CategoryIconCarousel (horizontal scroll)
              ├─ HomepageCarouselCss (CSS-only carousel)
              └─ CategoryProductSlider(s) per active home section
```

**Technologies:** [[Skills-and-TechStack#1. Core Framework — Next.js 16 App Router]], [[Skills-and-TechStack#14-caching-next-16-use-cache]]

### 2B — Products Page (Filtered Catalog)

```
User navigates to /products?category=X&search=Y&sort=Z&page=N
  │
  ▼
(store)/(content)/products/page.js (RSC)
  ├─ Reads searchParams
  ├─ getProducts({ category, search, sort, page }) → MongoDB query
  │    ├─ Compound indexes: showOnStore + Category + createdAt
  │    ├─ Text search via $regex on Name (not Atlas Search)
  │    └─ Returns paginated products + totalCount
  └─ Renders ProductGridClient (client) + ProductsPageHeader (client filters)
        │
        ▼
  User changes filter → URL param update → Next.js soft navigation → RSC re-renders
```

### 2C — Product Detail Page

```
User navigates to /products/[id]
  │
  ▼
(store)/(content)/products/[id]/page.js (RSC)
  ├─ getProductBySlug(slug) → cacheTag(`product-${slug}`)
  ├─ generateMetadata() → dynamic OG/Twitter metadata from product SEO fields
  ├─ Renders ProductGallery (Embla carousel)
  ├─ Renders ProductActions (client) → Add to Cart, Stock Request
  └─ Renders ProductReviews (client, lazy loaded)
        │
        └─► ProductViewTracking (client) → fires trackViewContentEvent() on mount
              ├─ window.fbq('track', 'ViewContent')
              └─ POST /api/tracking/meta (CAPI dedup)
```

---

## FLOW 3: Cart and Add to Cart

```
User clicks "Add to Cart" (ProductCardAddToCartButtonClient.jsx or ProductActions.jsx)
  │
  ▼
useCartActions().addToCart(product, qty)
  │
  ├─ normalizeCartItem() → resolves discountedPrice, ID, Images
  │
  ├─ addOptimisticCart({ type: 'add', item }) → React 19 useOptimistic
  │    └─ mergeCartItems() → immediate UI update (no wait)
  │
  ├─ persistCartSnapshot() → localStorage.setItem('kifayatly_cart_v2', JSON)
  │
  ├─ trackAddToCartEvent()
  │    ├─ window.fbq('track', 'AddToCart')
  │    └─ POST /api/tracking/meta
  │
  └─ sonner toast: "Product added to cart" + "View Cart" action button
```

**Cart Drawer opens → CartDrawer.jsx:**
```
CartDrawer renders cart items from useCartItems()
  ├─ Shows item list with quantity controls (updateQuantity)
  ├─ Coupon code input → validateCouponAction() Server Action
  ├─ City selector → calculateCheckoutPricing() for shipping
  └─ "Proceed to Checkout" → /checkout
```

**Technologies:** [[Skills-and-TechStack#4. State Management — React Context  useOptimistic]]

---

## FLOW 4: Checkout and Order Placement

```
User on /checkout page
  │
  ▼
getLastOrderDetailsAction() → Server Action (pre-fill form if logged in)
  │
  ▼
User fills form: name, phone, address, city, landmark, notes, coupon
  │
  ├─ validateCouponAction(code, subtotal) → Server Action
  │    ├─ Coupon.findOne({ code: code.toUpperCase() })
  │    ├─ Checks: isActive, startDate, endDate, minOrderAmount, usageLimitPerCoupon
  │    ├─ Per-user limit: queries Order history by email OR phone regex
  │    └─ Returns { success, coupon } or { success: false, message }
  │
  ├─ trackInitiateCheckoutEvent() → fires on checkout page mount
  │
  └─ User clicks "Place Order" → submitOrderAction(input)
        │
        ▼
  submitOrderAction (src/app/actions.js) — 'use server'
        │
        ├─ buildOrderItemsWithSourcing(items)
        │    ├─ Product.find({ slug/id in items })  ← MongoDB
        │    ├─ Resolves discountedPrice
        │    ├─ Fetches Vendor details for each product vendor
        │    └─ Returns normalizedItems with sourcingVendors attached
        │
        ├─ getStoreSettings() → shipping rates, free shipping threshold
        │
        ├─ validateCouponLogic() → coupon re-validation (server-side)
        │
        ├─ calculateCheckoutPricing()
        │    ├─ isKarachi? → karachiDeliveryFee : outsideKarachiDeliveryFee
        │    ├─ freeShippingThreshold check
        │    └─ Coupon discount: percentage / fixed_amount / free_shipping
        │
        ├─ Order.create({ orderId, secureToken, items, totalAmount, ... })
        │
        ├─ Coupon.findByIdAndUpdate → $inc usedCount
        │
        ├─ applyInventoryAdjustments(normalizedItems)
        │    └─ Product.bulkWrite → $subtract stockQuantity per item
        │
        ├─ revalidateTag('orders', 'admin-dashboard', 'products')
        │
        └─ after() ← Non-blocking background tasks (Next.js after hook):
              ├─ sendOrderEmails({ order, customerName, userEmail })
              │    ├─ resend.emails.send → admin notification email
              │    └─ resend.emails.send → customer confirmation email
              │
              ├─ sendPurchaseTrackingEvents()
              │    ├─ Meta CAPI: POST graph.facebook.com/v20.0/.../events
              │    └─ TikTok Events API: POST business-api.tiktok.com
              │
              ├─ User.findOneAndUpdate → upsert profile (name, phone, city, address)
              ├─ Order.updateMany → link prior orders by fuzzy phone → customerEmail
              └─ Notification.create({ type: 'order', message: 'New Order...' })
```

**Return value:**
```json
{
  "success": true,
  "orderId": "ORD-XXXXXXXX",
  "totalAmount": 2500,
  "whatsappUrl": "https://wa.me/923001234567?text=..."
}
```

The `whatsappUrl` pre-fills a WhatsApp message with the full order summary.

---

## FLOW 5: Order Tracking (Customer-Facing)

```
Customer on /orders (My Orders page)
  │
  ├─ If logged in: getUserOrders(email) → Order.find({ customerEmail })
  └─ If guest: guest lookup form → POST /api/user/orders-by-token
                                    (via orderId + secureToken or phone)
        │
        ▼
  OrdersClient.jsx (client component)
        ├─ Shows all orders sorted by createdAt desc
        ├─ Status badge: Order Confirmed → In Process → Packed → Shipped → Out For Delivery → Delivered
        ├─ "Track Order" → /orders/[id] (detailed view)
        └─ InvoiceButton → generates PDF via invoice-generator.js (jsPDF)
```

---

## FLOW 6: Wishlist Sync

```
Guest user adds to wishlist
  └─► WishlistContext:
        ├─ writeGuestWishlistSnapshot() → localStorage
        └─ fireAddToWishlist() → fbq('AddToWishlist') + POST /api/tracking/meta

Logged-in user adds to wishlist
  └─► WishlistContext:
        ├─ fetch('/api/wishlist', { method: 'POST', body: { productId } })
        │    └─ Route: User.findOneAndUpdate({ email }, { $addToSet: { wishlist: productId } })
        └─ fireAddToWishlist() + POST /api/tracking/meta

User logs in (was a guest with local wishlist)
  └─► WishlistContext detects session change:
        ├─ Reads guest IDs from localStorage
        ├─ fetch('/api/wishlist', { method: 'POST', body: { productIds: [...] } }) → merge to DB
        └─ Clears localStorage guest wishlist
```

---

## FLOW 7: Admin Product Management

```
Admin navigates to /admin/products
  │
  ▼
getAdminProducts(filters) → Product.find() with PRODUCT_ADMIN_PROJECTION
  (cacheTag: 'products')
  │
  ▼
AdminProductTable renders (client)
  │
  ├─ Quick Edit (inline):
  │    └─ ProductQuickViewDialog.jsx → getProductDetailsAction() → save mutation → revalidateTag('products')
  │
  ├─ Toggle Live/Hidden:
  │    └─ toggleProductLiveAction(id, true/false)
  │         ├─ Product.updateOne({ showOnStore })
  │         └─ revalidateTag('products', 'admin-dashboard', 'home-sections')
  │              + revalidatePath('/', '/products', '/products/[slug]')
  │
  ├─ Set Discount:
  │    └─ setProductDiscountAction(id, pct)
  │         ├─ product.discountPercentage = pct; product.isDiscounted = pct > 0
  │         └─ revalidateTag('products', 'admin-dashboard', 'home-sections')
  │
  └─ Add New Product:
        └─ Admin fills form → Images uploaded to Cloudinary:
              Client: uploadImageDataUrl()
                ├─ GET /api/cloudinary-sign → server signs timestamp
                └─ POST https://api.cloudinary.com/v1_1/.../image/upload
                      │
                      └─ POST /api/images/placeholder → generates blurDataURL
              │
              └─ Server Action: saveProductAction()
                    ├─ Product.create({ ...fields, slug: slugify(Name) })
                    └─ revalidateTag('products', 'home-sections')
```

---

## FLOW 8: Admin Order Management

```
Admin on /admin/orders
  │
  ▼
getAdminOrders({ status, search, page }) → Order.find() with status filter
  ├─ getOrderStatusQueryValue(status) → handles legacy status aliases
  └─ Populates: items, totals, customer info
        │
        ▼
  Admin clicks order → /admin/orders/[id]
        ├─ Update status: updateOrderStatusAction()
        │    ├─ Order.findByIdAndUpdate({ status })
        │    ├─ OrderLog.create({ orderId, fromStatus, toStatus }) ← audit trail
        │    └─ revalidateTag('orders')
        │
        ├─ Add tracking: updateTrackingAction()
        │    └─ Order.findByIdAndUpdate({ courierName, trackingNumber })
        │
        ├─ Generate Invoice:
        │    └─ InvoiceButton → invoice-generator.js (jsPDF) → download PDF
        │
        └─ Soft Delete:
              └─ Order.findByIdAndUpdate({ isDeleted: true, deletedAt: now() })
                    └─ TTL index auto-purges after 50 days
```

---

## FLOW 9: Homepage Builder (Admin)

```
Admin on /admin/home-page
  │
  ▼
HomePageBuilderWrapper.jsx (client, 'use client')
  ├─ Loads current HomePage document sections
  ├─ @dnd-kit DnD context → drag to reorder sections
  ├─ Each section type: hero-slider, banner-image, product-collection, etc.
  ├─ Edit section properties inline (title, link, collectionKey, productLimit)
  └─ "Save" → saveHomePageAction() Server Action
        ├─ HomePage.findOneAndUpdate({ singletonKey }, { sections })
        └─ revalidateTag('home-sections')
```

---

## FLOW 10: Marketing Tracking Pipeline

```
Client-Side (browser):
  TrackingScripts.jsx → injects fbq() pixel + ttq() TikTok pixel
  clientTracking.js:
    ├─ PageView → on every route change (TrackingPageView.jsx)
    ├─ ViewContent → ProductViewTracking.jsx (product page mount)
    ├─ AddToCart → CartContext.addToCart()
    ├─ AddToWishlist → WishlistContext
    ├─ Search → SearchField.jsx
    ├─ InitiateCheckout → checkout page mount
    └─ Purchase → checkout success page

Server-Side CAPI (dedup):
  Every client event also fires:
    POST /api/tracking/meta → sendMetaCustomTrackingEvent()
      ├─ Reads fbp/fbc cookies
      ├─ sha256 hashes user data (email, phone)
      └─ POST graph.facebook.com/v20.0/{pixelId}/events
           (same eventID as client → Meta deduplicates)

Order placed:
  after() hook → sendPurchaseTrackingEvents()
    ├─ Meta CAPI Purchase event (with order data)
    └─ TikTok CompletePayment event
```

---

## FLOW 11: Image Upload (Cloudinary Signed Upload)

```
Admin selects image in product form
  │
  ▼
uploadImageDataUrl(dataUrl, folder) [src/lib/cloudinaryUpload.js]
  │
  ├─ Step 1: GET /api/cloudinary-sign?folder=X
  │    └─ Server: cloudinary.utils.api_sign_request() → returns { signature, timestamp, apiKey, cloudName }
  │
  ├─ Step 2: POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload
  │    └─ FormData: file + signature + api_key + timestamp
  │         └─ Returns: { secure_url, public_id }
  │
  ├─ Step 3: POST /api/images/placeholder
  │    └─ Server: fetches image → generates base64 blur placeholder
  │         └─ Returns: { blurDataURL }
  │
  └─ Returns: { url: optimizedCloudinaryUrl, publicId, blurDataURL }
        └─ Stored in Product.Images[] MongoDB array
```

---

## FLOW 12: SEO AI Generation

```
Admin on product edit page → clicks "Generate SEO"
  │
  ▼
POST /api/admin/generate-seo
  ├─ assertAdmin() → verify session
  ├─ @google/genai → Gemini API call
  │    └─ Prompt: "Generate SEO title, description, keywords for: {productName} {description}"
  └─ Returns: { seoTitle, seoDescription, seoKeywords }
        └─ Admin reviews and saves with product
```

---

## FLOW 13: Notification Center (Admin)

```
Events that create notifications:
  ├─ New user signup → signIn callback → Notification.create({ type: 'user' })
  ├─ New order placed → submitOrderAction after() → Notification.create({ type: 'order' })
  └─ New review submitted → submitReviewAction → Notification.create({ type: 'review' })

Admin views notifications:
  AdminNotificationCenter.jsx (client)
    ├─ GET /api/admin/notifications → Notification.find({ isRead: false })
    ├─ Real-time polling via SWR (interval-based)
    ├─ Click notification → navigate to deep link
    └─ Mark as read → PATCH /api/admin/notifications
```

---

## Data Flow Summary Diagram

```
Browser (Client)
    │
    ├─► React Contexts (Cart, Wishlist) ──► localStorage
    │
    ├─► Server Actions ('use server')
    │       └─► mongooseConnect() ──► MongoDB Atlas
    │               ├─ Product / Order / Coupon / User / ...
    │               └─ revalidateTag() ──► Next.js Cache
    │
    ├─► Route Handlers (API)
    │       ├─ /api/auth → NextAuth
    │       ├─ /api/tracking/meta → Meta CAPI
    │       ├─ /api/cloudinary-sign → Cloudinary
    │       └─ /api/admin/* → MongoDB queries
    │
    └─► External Services
            ├─ Google OAuth (auth)
            ├─ Cloudinary CDN (images)
            ├─ Resend (email)
            ├─ Meta Graph API (pixel CAPI)
            └─ TikTok Events API (pixel CAPI)
```

---

*Next: [[Architecture]] · [[API-Routes-and-Models]]*
