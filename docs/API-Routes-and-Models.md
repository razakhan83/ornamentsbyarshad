# API Routes and Models

**Part of:** [[Index]] · **See also:** [[Architecture]], [[Flows-and-Workflows]]

---

## Database Models (Mongoose Schemas)

All models live in `src/models/`. Every model uses the hot-reload-safe registration guard. See [[Architecture#Pattern-5-Hot-Reload-Safe-Model-Registration]].

---

### Model: `Product`
**File:** `src/models/Product.js`

| Field | Type | Notes |
|---|---|---|
| `Name` | String (req, max 200) | PascalCase (legacy) |
| `Description` | String | HTML rich text |
| `shortDescription` | String | Plain text excerpt |
| `seoTitle` | String (max 70) | Google search title |
| `seoDescription` | String (max 320) | Google search snippet |
| `seoKeywords` | String (max 250) | Comma-separated |
| `seoCanonicalUrl` | String | Override canonical |
| `Price` | Number (req) | Base price in PKR |
| `compareAtPrice` | Number | Strike-through price |
| `discountPercentage` | Number (0–100) | Admin-set discount % |
| `isDiscounted` | Boolean | Drives `discountedPrice` display |
| `discountedPrice` | Number | Pre-calculated from % |
| `Images` | `[ProductImageSchema]` | Array of { url, publicId, blurDataURL } |
| `Category` | `[ObjectId]` → `Category` | Multi-category support |
| `vendors` | `[ProductVendorSchema]` | Sourcing vendor snapshots |
| `stockQuantity` | Number (min 0) | Decremented on order |
| `StockStatus` | Enum: In Stock / Out of Stock | Auto-managed |
| `slug` | String (unique) | URL identifier |
| `showOnStore` | Boolean | Visibility toggle |
| `isNewArrival` | Boolean | Home section filter |
| `isBestSelling` | Boolean | Home section filter |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

**Indexes:** `showOnStore+createdAt`, `showOnStore+Category+createdAt`, `showOnStore+slug`, `showOnStore+isDiscounted+createdAt`, `showOnStore+isNewArrival+createdAt`, `showOnStore+isBestSelling+createdAt`, `vendors.name`, `vendors.vendorId`

**Sub-schemas:**
- `ProductImageSchema`: `{ url, blurDataURL, publicId }` — `_id: false`
- `ProductVendorSchema`: `{ vendorId→Vendor, name, shopNumber, phone, whatsappNumber, email, address, vendorProductName, vendorPrice }` — embedded snapshot at time of product creation

---

### Model: `Order`
**File:** `src/models/Order.js`

| Field | Type | Notes |
|---|---|---|
| `orderId` | String (req, unique) | `ORD-${timestamp36}${random3}` |
| `secureToken` | String | UUID for guest order lookup |
| `customerEmail` | String | nullable for anonymous orders |
| `customerName` | String (req) | |
| `customerPhone` | String | |
| `customerAddress` | String | |
| `customerCity` | String | |
| `landmark` | String | Delivery landmark |
| `paymentStatus` | Enum: COD / Online | Default COD |
| `weight` | Number | Default 2 (kg, for shipping) |
| `itemType` | String | Default 'Mix' |
| `orderQuantity` | Number | Total item count |
| `items` | Array | Embedded order items |
| `items[].productId` | String | Slug or ObjectId |
| `items[].name` | String | Snapshot at order time |
| `items[].price` | Number | Resolved price at order time |
| `items[].quantity` | Number | |
| `items[].image` | String | First product image URL |
| `items[].isReviewed` | Boolean | Prevents duplicate reviews |
| `items[].sourcingVendors` | Array | Full vendor snapshot per item |
| `totalAmount` | Number (req) | After discounts + shipping |
| `shippingAmount` | Number | |
| `discountAmount` | Number | Coupon discount applied |
| `couponCode` | String | Applied coupon code |
| `status` | Enum (7 statuses) | See order-status.js |
| `courierName` | String | |
| `trackingNumber` | String | |
| `notes` | String | Customer notes |
| `sourceTag` | String | UTM/source attribution |
| `isDraft` | Boolean | Draft orders |
| `isDeleted` | Boolean | Soft delete |
| `deletedAt` | Date | For TTL index |
| `createdAt` / `updatedAt` | Date | |

**Indexes:** `createdAt`, `status+createdAt`, `customerEmail+createdAt`, `secureToken`, `status+customerEmail+items.productId+createdAt`

**TTL index:** `deletedAt` expires after 50 days when `isDeleted: true`

**Order status pipeline:**
```
Order Confirmed → In Process → Packed → Shipped → Out For Delivery → Delivered
                                                                    ↓
                                                                 Returned
```

---

### Model: `User`
**File:** `src/models/User.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String (req) | From Google OAuth |
| `email` | String (req, unique) | Normalized lowercase |
| `image` | String | Google avatar URL |
| `phone` | String | Set at first checkout |
| `city` | String | |
| `address` | String | |
| `landmark` | String | |
| `disabled` | Boolean | Admin ban flag |
| `forceLogoutAt` | Date | Force JWT invalidation |
| `wishlist` | [String] | Array of product slugs/IDs |
| `createdAt` / `updatedAt` | Date | |

**Indexes:** `disabled+createdAt`, `createdAt`

---

### Model: `Category`
**File:** `src/models/Category.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String (req, unique) | Display name |
| `slug` | String (unique) | URL segment |
| `image` | String | Category icon URL |
| `imagePublicId` | String | Cloudinary public ID |
| `blurDataURL` | String | Base64 blur placeholder |
| `sortOrder` | Number | Admin ordering |
| `isEnabled` | Boolean | Visibility |
| `showOnHome` | Boolean | Appears in home carousel |

**Indexes:** `sortOrder+name`, `isEnabled+showOnHome+sortOrder+name`

---

### Model: `Coupon`
**File:** `src/models/Coupon.js`

| Field | Type | Notes |
|---|---|---|
| `code` | String (req, unique, uppercase) | User-entered code |
| `description` | String | Internal notes |
| `discountType` | Enum: percentage / fixed_amount / free_shipping | |
| `discountValue` | Number | % or PKR amount |
| `minOrderAmount` | Number | Minimum cart subtotal |
| `usageLimitPerCoupon` | Number (null = unlimited) | Total redemptions allowed |
| `usageLimitPerUser` | Number (default 1) | Per-user redemptions |
| `usedCount` | Number | Incremented on use |
| `startDate` | Date (req) | Validity window |
| `endDate` | Date (req) | |
| `isActive` | Boolean | Admin toggle |

---

### Model: `Vendor`
**File:** `src/models/Vendor.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String (req, max 120) | Supplier name |
| `shopNumber` | String | Physical shop ID |
| `phone` | String | |
| `whatsappNumber` | String | |
| `email` | String | |
| `address` | String | |

**Index:** `name`

> **Relationship:** Vendors are linked to products via `Product.vendors[].vendorId`. At checkout, `buildOrderItemsWithSourcing()` resolves the live vendor data and **embeds a snapshot** into `Order.items[].sourcingVendors` so sourcing info is preserved even if the vendor record changes later.

---

### Model: `Review`
**File:** `src/models/Review.js`

| Field | Type | Notes |
|---|---|---|
| `productId` | ObjectId → Product (req) | |
| `userId` | ObjectId → User (req) | |
| `userName` | String (req) | Snapshot from session |
| `rating` | Number (1–5, req) | |
| `comment` | String | |
| `isApproved` | Boolean (default true) | Auto-approve, admin can delete |

**Indexes:** `productId+isApproved+createdAt`, `userId+createdAt`, `createdAt`

> **Note:** `Order.items[].isReviewed` is set to `true` after a review is submitted for that item, preventing duplicate reviews from the same order.

---

### Model: `Notification`
**File:** `src/models/Notification.js`

| Field | Type | Notes |
|---|---|---|
| `type` | Enum: order / review / user | |
| `message` | String (req) | Display text |
| `link` | String (req) | Deep link in admin panel |
| `isRead` | Boolean | |
| `metadata.id` | String | orderId / productId / userId |
| `metadata.userName` | String | |
| `metadata.rating` | Number | For review notifications |

**Indexes:** `isRead+createdAt`, `type+createdAt`

---

### Model: `Settings` (Singleton)
**File:** `src/models/Settings.js`

One document, keyed by `singletonKey: 'site-settings'`.

| Group | Fields |
|---|---|
| General | `storeName`, `supportEmail`, `businessAddress` |
| Branding | `lightLogoUrl`, `darkLogoUrl`, `faviconUrl`, `faviconSizePx`, `logoScalePercent`, `emailLogoScalePercent`, `invoiceLogoScalePercent` |
| Social | `whatsappNumber`, `facebookPageUrl`, `instagramUrl` |
| Tracking | `trackingEnabled`, `facebookPixelId`, `facebookConversionsApiToken`, `facebookTestEventCode`, `tiktokPixelId`, `tiktokAccessToken` |
| Shipping | `karachiDeliveryFee`, `outsideKarachiDeliveryFee`, `freeShippingThreshold` |
| Announcement | `announcementBarEnabled`, `announcementBarText`, `announcementBarMessages[]` |
| Payment | `bankDepositEnabled`, `bankDepositAccountDetails` |
| Access | `adminEmails[]`, `guestModeEnabled` |
| Layout | `homepageSectionOrder[]` |
| Pages | `customPages[]` (slug, title, label, description, content, seoTitle, seoDescription, isEnabled, showInFooter, sortOrder) |

---

### Model: `HomePage` (Singleton)
**File:** `src/models/HomePage.js`

One document, keyed by `singletonKey: 'home-page-v2'`.

| Field | Type | Notes |
|---|---|---|
| `sections[]` | `[HomePageSectionSchema]` | Ordered array of sections |
| `sections[].id` | String | Unique section ID |
| `sections[].type` | Enum | hero-slider, banner-image, product-collection, etc. |
| `sections[].order` | Number | Sort position |
| `sections[].isEnabled` | Boolean | Visibility |
| `sections[].title` | String | Section heading |
| `sections[].collectionKey` | Enum | new-arrivals / special-offers / best-selling |
| `sections[].productLimit` | Number (1–24) | Products to show |
| `sections[].slides[]` | HeroSlideSchema | Hero carousel slides |
| `sections[].desktopImages[]` | BannerImageSchema | Desktop banner images |
| `sections[].carouselBanners[]` | BannerImageSchema | Carousel banners |

---

### Model: `OrderLog`
**File:** `src/models/OrderLog.js`

Append-only audit trail for order status changes. Linked to Order by orderId string.

---

### Model: `StockRequest`
**File:** `src/models/StockRequest.js`

| Field | Type | Notes |
|---|---|---|
| `productId` | ObjectId → Product | |
| `productSlug` | String | |
| `productName` | String | |
| `whatsappNumber` | String | Customer contact |
| `email` | String | |
| `status` | Enum: pending / contacted / closed | |
| `source` | String | Where submitted from |

---

### Model: `CoverPhoto`
**File:** `src/models/CoverPhoto.js`

Legacy hero images model. Functionality has been migrated to `HomePage.sections` hero-slider type. Kept for backward compatibility.

---

## API Route Handlers

All route handlers are in `src/app/api/`. They use a consistent pattern:
1. `await mongooseConnect()`
2. Check auth (if admin)
3. Parse params
4. MongoDB query
5. Return JSON

### Public API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth OAuth handlers |
| `/api/products` | GET | Paginated product catalog (public) |
| `/api/products/[id]` | GET | Single product by ID/slug |
| `/api/categories` | GET | All enabled categories |
| `/api/settings` | GET | Public store settings |
| `/api/home-page` | GET | HomePage sections |
| `/api/reviews` | GET/POST | Product reviews (POST requires session) |
| `/api/stock-requests` | POST | "Notify me" form submission |
| `/api/wishlist` | GET/POST/DELETE | Wishlist sync (requires session) |
| `/api/user` | GET/PUT | User profile (requires session) |
| `/api/user/orders-by-token` | POST | Guest order lookup by secureToken |
| `/api/tracking/meta` | POST | Meta CAPI relay (public, rate-limited by Meta) |
| `/api/cloudinary-sign` | GET | Upload signature (session required) |
| `/api/images/placeholder` | POST | Blur data URL generator |
| `/api/search-products` | GET | Product name search (autocomplete) |
| `/api/cover-photos` | GET | Hero images |
| `/api/feeds/facebook` | GET | XML product feed |

### Admin API Routes (require `assertAdmin`)

| Route | Method | Description |
|---|---|---|
| `/api/admin/dashboard` | GET | KPI summary stats |
| `/api/admin/chart` | GET | Revenue/orders time-series data |
| `/api/admin/products` | GET/POST | Product list + create |
| `/api/admin/products/[id]` | GET/PUT/DELETE | Product CRUD |
| `/api/admin/orders` | GET | Order list with status filter |
| `/api/admin/orders/[id]` | GET/PUT | Order detail + update |
| `/api/admin/coupons` | GET/POST | Coupon management |
| `/api/admin/users` | GET | User list |
| `/api/admin/vendors` | GET/POST/PUT/DELETE | Vendor CRUD |
| `/api/admin/reviews` | GET/DELETE | Review moderation |
| `/api/admin/notifications` | GET/PATCH | Notification center |
| `/api/admin/generate-seo` | POST | Gemini AI SEO generator |
| `/api/admin/debug-db` | GET | DB connection health check |

---

## Store Pages (Route Map)

| URL Pattern | File | Type | Description |
|---|---|---|---|
| `/` | `(store)/(content)/page.js` | RSC | Home page |
| `/products` | `(store)/(content)/products/page.js` | RSC | Product catalog |
| `/products/[id]` | `(store)/(content)/products/[id]/page.js` | RSC | Product detail |
| `/deals` | `(store)/(content)/deals/page.js` | RSC | Discounted products |
| `/orders` | `(store)/(content)/orders/page.js` | RSC | My orders |
| `/orders/[id]` | `(store)/(content)/orders/[id]/page.js` | RSC | Order detail |
| `/wishlist` | `(store)/(content)/wishlist/page.js` | RSC | Wishlist |
| `/checkout` | `(store)/(checkout-shell)/checkout/page.js` | RSC | Checkout form |
| `/auth` | `(store)/(content)/auth/page.js` | RSC | Sign-in page |
| `/[slug]` | `(store)/(content)/[slug]/page.js` | RSC | Custom pages (About, Privacy, etc.) |
| `/about-us` | Static redirect | — | → Settings customPage |
| `/privacy-policy` | Hardcoded | — | Settings customPage |
| `/refund-policy` | Hardcoded | — | Settings customPage |
| `/shipping-policy` | Hardcoded | — | Settings customPage |
| `/settings` | `(store)/(content)/settings/page.js` | RSC | User account settings |

---

## Admin Pages (Route Map)

| URL Pattern | File | Description |
|---|---|---|
| `/admin` | `admin/page.js` | Dashboard with KPIs + chart |
| `/admin/login` | `admin/login/page.js` | Admin login form |
| `/admin/products` | `admin/products/page.js` | Product list + management |
| `/admin/orders` | `admin/orders/page.js` | Order list + filters |
| `/admin/orders/[id]` | `admin/orders/[id]/page.js` | Order detail |
| `/admin/categories` | `admin/categories/page.js` | Category CRUD |
| `/admin/home-page` | `admin/home-page/page.js` | DnD homepage builder |
| `/admin/marketing` | `admin/marketing/page.js` | Coupons + promotions |
| `/admin/users` | `admin/users/page.js` | User management |
| `/admin/vendors` | `admin/vendors/page.js` | Vendor CRUD |
| `/admin/reviews` | `admin/reviews/page.js` | Review moderation |
| `/admin/analytics` | `admin/analytics/page.js` | Charts + analytics |
| `/admin/notifications` | `admin/notifications/page.js` | Notification history |
| `/admin/settings` | `admin/settings/page.js` | Store settings editor |
| `/admin/shipping` | `admin/shipping/page.js` | Shipping rates |
| `/admin/stock` | `admin/stock/page.js` | Stock requests |
| `/admin/roles` | `admin/roles/page.js` | Admin email management |
| `/admin/pages` | `admin/pages/page.js` | Custom page editor |
| `/admin/store-setup` | `admin/store-setup/page.js` | Initial store config |
| `/admin/top-performing-products` | `admin/top-performing-products/page.js` | Product performance |

---

## Key Components Reference

### Store-Facing Components

| Component | Purpose |
|---|---|
| `LayoutWrapper.jsx` | Navbar + Footer shell, announcement bar |
| `Navbar.jsx` | Desktop + mobile navigation, search, cart, user menu |
| `CartDrawer.jsx` | Slide-out cart with pricing + coupon |
| `ProductCard.jsx` | Product grid card (RSC-compatible, slots for client buttons) |
| `ProductGridClient.jsx` | Client-side filtered product grid |
| `ProductActions.jsx` | Add to cart, wishlist, stock request on product page |
| `ProductGallery.jsx` | Embla carousel image viewer |
| `HeroSlider.jsx` | Embla hero banner with autoplay |
| `CategoryIconCarousel.jsx` | Horizontal category scroll |
| `HomeClientWrapper.jsx` | Home page interactivity boundary |
| `SearchField.jsx` | Debounced product search |
| `AuthModal.jsx` | Google sign-in modal |
| `ReviewModal.jsx` | Product review submission form |
| `CartContext.jsx` | Cart state provider (3 split contexts) |
| `WishlistContext.jsx` | Wishlist state + DB sync provider |
| `TrackingScripts.jsx` | fbq + ttq pixel injection |
| `FloatingWhatsApp.jsx` | Fixed WhatsApp CTA button |
| `MobileBottomNav.jsx` | Mobile app-like bottom navigation |

### Admin-Specific Components

| Component | Purpose |
|---|---|
| `AdminLayoutShell.jsx` | Sidebar nav, responsive admin chrome |
| `AdminDashboardSkeleton.jsx` | Loading skeleton for dashboard |
| `AdminNotificationCenter.jsx` | Bell icon + notification dropdown |
| `AdminReviewsDialog.jsx` | Review moderation dialog |
| `DashboardChart.jsx` | Recharts area/bar chart |
| `HomePageBuilderWrapper.jsx` | DnD section builder (dnd-kit) |
| `ProductQuickViewDialog.jsx` | Inline product edit dialog |

---

*Back to: [[Index]] · [[Architecture]] · [[Flows-and-Workflows]]*
