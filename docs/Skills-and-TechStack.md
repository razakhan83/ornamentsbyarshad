# Skills and TechStack

**Part of:** [[Index]] · **See also:** [[Architecture]], [[Flows-and-Workflows]]

---

## Overview

China Unique Store is a full-stack Pakistani e-commerce application. The entire tech stack is chosen for a single-developer workflow where the same person writes the API, the database layer, and the UI. Every dependency serves a clear, auditable purpose.

---

## 1. Core Framework — Next.js 16 (App Router)

| Detail | Value |
|---|---|
| Version | `next@16.2.1` (React `19.2.4`) |
| Router | App Router (`src/app/`) |
| Rendering modes used | RSC (default), `'use client'`, `'use cache'` |
| Config file | `next.config.mjs` |

**Why:** Next.js App Router gives Server Components, Server Actions, built-in caching (`cacheLife`, `cacheTag`, `revalidateTag`), and metadata APIs — all without a separate backend server. The `'use cache'` directive (Next 16 / PPR) is used on the store layout to serve categories and settings from cache with `cacheLife('foreverish')`.

**Where:** Every file under `src/app/`. Layout hierarchy: `RootLayout` → `StoreLayout` → page-level.

**Key next.config options enabled:**
- `reactCompiler: true` — auto-memoisation via babel plugin
- `cacheComponents: true` — persists RSC output
- `turbopackFileSystemCacheForDev/Build` — faster local builds
- `cachedNavigations: true` — navigation state preserved across soft-navigations

---

## 2. Database — MongoDB + Mongoose

| Detail | Value |
|---|---|
| Driver | `mongodb@7.1.0` + `mongoose@9.3.1` |
| Connection helper | `src/lib/mongooseConnect.js` |
| Models folder | `src/models/` |

**Why:** MongoDB is schema-flexible for a fast-moving product. Mongoose adds strict schema validation, virtual indexes, and the hot-reload-safe model caching pattern (the `delete mongoose.models.X` guard on every model file).

**Connection strategy:**
- Global singleton (`global.__mongooseConnection`) prevents cold-start churn in serverless
- Pool size: 10 max, 0 min
- Auto-detects Vercel/Lambda env for faster timeouts (`serverSelectionTimeoutMS: 5000`)
- TTL index on Orders: trashed orders auto-purge after 50 days

**13 Models:**

| Model | Purpose |
|---|---|
| `User` | Google OAuth users + admin accounts |
| `Product` | Catalog items with SEO, discount, vendor, stock fields |
| `Category` | Taxonomy with `showOnHome`, `sortOrder` |
| `Order` | COD/Online orders with `secureToken`, status pipeline, soft-delete |
| `OrderLog` | Append-only audit trail for order status changes |
| `Coupon` | Discount codes (percentage, fixed, free shipping) |
| `Vendor` | Sourcing suppliers referenced from products |
| `Review` | Product reviews (auto-approved) |
| `Notification` | Admin notification center feed |
| `Settings` | Singleton site config (shipping, tracking, branding, etc.) |
| `HomePage` | Singleton drag-and-drop homepage section builder |
| `CoverPhoto` | Legacy hero slider images (migrated to `HomePage`) |
| `StockRequest` | Out-of-stock "notify me" capture form |

---

## 3. Authentication — NextAuth v4

| Detail | Value |
|---|---|
| Package | `next-auth@4.24.13` |
| Config | `src/lib/auth.js` |
| Session strategy | JWT |
| Providers | Google OAuth + Credentials (admin password + guest demo) |

**Why:** NextAuth handles the entire OAuth dance, JWT management, and session callbacks in one library. Credentials provider is used for the admin password login (`ADMIN_PASSWORD` env var) and a guest/demo mode.

**Custom JWT callbacks:**
- Checks `isAdminEmail()` against env vars AND dynamic `Settings.adminEmails` DB array
- On every JWT refresh, queries DB for `User.disabled` + `User.forceLogoutAt` → invalidates JWT if user is banned or force-logged-out
- `session.user.isAdmin` and `session.user.isDemo` custom fields propagated to client

**Where:**
- Config: `src/lib/auth.js`
- API route: `src/app/api/auth/[...nextauth]/route.js`
- Admin guard: `src/lib/requireAdmin.js` (`requireAdmin()`, `requireMutationAccess()`)
- Client provider: `src/components/AuthProvider.jsx` → wraps `SessionProvider`

---

## 4. State Management — React Context + `useOptimistic`

| Detail | Value |
|---|---|
| Cart | `src/context/CartContext.jsx` — 3 split contexts |
| Wishlist | `src/context/WishlistContext.jsx` |
| Persistence | `localStorage` (key: `kifayatly_cart_v2`) |

**Why:** No Redux or Zustand — React 19 `useOptimistic` + Context API is sufficient for a single-page cart/wishlist. Three separate contexts (`CartItemsContext`, `CartUiContext`, `CartActionsContext`) prevent re-renders in consumers that only need one slice.

**Cart features:**
- Optimistic UI updates via `useOptimistic`
- `startTransition` wrapping for non-urgent state
- `normalizeCartItem()` handles price/discount resolution at add-time
- Full CRUD: `addToCart`, `removeFromCart`, `updateQuantity`, `replaceCart`, `clearCart`

**Wishlist features:**
- Guest wishlist → `localStorage`; signed-in users → synced to `User.wishlist` DB field via API
- Fires `AddToWishlist` Meta Pixel + CAPI event on add

---

## 5. UI Component Library — Radix UI + shadcn/ui + Lucide

| Package | Version | Used for |
|---|---|---|
| `@radix-ui/react-dialog` | ^1.1.15 | Product quick-view, auth modals |
| `@radix-ui/react-select` | ^2.2.6 | Dropdowns in forms |
| `@radix-ui/react-slot` | ^1.2.4 | `asChild` prop on Button |
| `@base-ui/react` | ^1.3.0 | Base primitive components |
| `lucide-react` | ^1.0.1 | All icons throughout the app |

**shadcn/ui components** (in `src/components/ui/`): `accordion`, `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `carousel`, `chart`, `checkbox`, `command`, `combobox`, `dialog`, `drawer`, `dropdown-menu`, `input`, `pagination`, `popover`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `tooltip`, `sonner`, `spinner`

**Config:** `components.json` at root — `tailwind` CSS variables, `@/components/ui` path alias.

---

## 6. Styling — Tailwind CSS v4

| Detail | Value |
|---|---|
| Package | `tailwindcss@^4.2.2` |
| PostCSS | `@tailwindcss/postcss@^4.2.2` |
| Utilities | `tailwind-merge@^3.5.0`, `clsx@^2.1.1`, `class-variance-authority@^0.7.1` |
| Animations | `tw-animate-css@^1.4.0` |

**Why:** Tailwind v4 uses CSS-native custom properties and the `@layer` cascade — no config file required. `clsx` + `tailwind-merge` = the `cn()` utility that merges conditional classes safely. `cva` is used inside shadcn components for variant-based styling.

**Global CSS:** `src/app/globals.css` (~24 KB) — houses design tokens, dark mode variables, component base styles.

---

## 7. Image Management — Cloudinary

| Detail | Value |
|---|---|
| Package | `cloudinary@^2.9.0` |
| Upload flow | Client → `/api/cloudinary-sign` (gets signed URL) → direct upload to Cloudinary CDN → returns `public_id`, `secure_url` |
| Optimization | `src/lib/cloudinaryImage.js` — `optimizeCloudinaryUrl()` adds quality/format transforms |
| Blur placeholders | `src/app/api/images/placeholder` endpoint generates `blurDataURL` via `src/lib/imagePlaceholder.js` |

**Why:** Cloudinary handles all resizing, format conversion (WebP), and CDN delivery. The signed-upload pattern keeps secrets server-side. Blur placeholder base64 strings are stored directly in MongoDB alongside image URLs for instant LCP.

---

## 8. Drag-and-Drop — @dnd-kit

| Package | Version | Used for |
|---|---|---|
| `@dnd-kit/core` | ^6.3.1 | DnD engine |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable list wrapper |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform helpers |

**Why:** Powers the admin **Homepage Builder** (`src/app/admin/home-page/HomePageBuilderWrapper.jsx`) and **Cover Photo** reordering. Lightweight, accessible, no jQuery/DOM-manipulation.

---

## 9. Carousel — Embla Carousel

| Package | Version |
|---|---|
| `embla-carousel-react` | ^9.0.0-rc01 |
| `embla-carousel-autoplay` | ^9.0.0-rc01 |

**Why:** Powers the hero slider (`HeroSlider.jsx`), `CategoryIconCarousel.jsx`, and `CategoryProductSlider.jsx`. Embla is performant and imperative — no opinionated markup.

---

## 10. Email — Resend

| Detail | Value |
|---|---|
| Package | `resend@^6.9.4` |
| Templates | `src/lib/emailTemplates.js` (inline HTML, ~32 KB) |
| Triggers | On order placement (`submitOrderAction`) via `next/server` `after()` hook |
| Sent to | Admin recipients (from `ADMIN_EMAIL` / `ADMIN_EMAILS` env) + customer |

**Why:** Resend is simple, developer-first, and requires no SMTP server. The `after()` Next.js hook ensures emails fire **after** the response is sent to the user (non-blocking).

**Email types:** `generateOrderEmailHtml` (admin alert), `generateCustomerOrderConfirmationHtml` (customer receipt).

---

## 11. Marketing Pixel Tracking — Meta + TikTok CAPI

| Package/API | Where |
|---|---|
| Meta Pixel (client) | `TrackingScripts.jsx` injects `fbq` script |
| Meta CAPI (server) | `src/lib/trackingServer.js` → `graph.facebook.com/v20.0` |
| TikTok Events API | `src/lib/trackingServer.js` → `business-api.tiktok.com` |
| Client helper | `src/lib/clientTracking.js` |

**Why:** Server-side CAPI deduplication (using `eventID`) is essential for iOS 14.5+ privacy changes. Both pixel and CAPI fire with the same `eventID` so Meta deduplicates.

**Events tracked:** `PageView`, `ViewContent`, `AddToCart`, `AddToWishlist`, `Search`, `InitiateCheckout`, `Purchase`.

**Configurable:** All pixel IDs and access tokens are stored in `Settings` DB doc — toggled via `Settings.trackingEnabled`.

---

## 12. PDF / Invoice Generation — jsPDF + ExcelJS

| Package | Purpose |
|---|---|
| `jspdf@^4.2.0` + `jspdf-autotable@^5.0.7` | Customer/admin PDF invoices |
| `exceljs@^4.4.0` | Excel order export (bulk download) |
| `html-to-image@^1.11.13` + `html2canvas@^1.4.1` | Screenshot/image export utilities |

**Why:** Admin needs to generate printable invoices without an external service. The `src/lib/invoice-generator.js` produces branded PDFs client-side.

---

## 13. Charts — Recharts

| Detail | Value |
|---|---|
| Package | `recharts@^3.8.0` |
| Component | `src/components/admin/DashboardChart.jsx` |

**Why:** Recharts provides React-native charting for the admin dashboard revenue/orders analytics. Used for the area chart and bar chart on the main `/admin` page.

---

## 14. Command Palette — cmdk

| Detail | Value |
|---|---|
| Package | `cmdk@^1.1.1` |
| Used in | `src/components/ui/command.jsx`, `src/components/ui/combobox.jsx` |

**Why:** Powers the admin product search command palette and combobox inputs.

---

## 15. Toast Notifications — Sonner

| Detail | Value |
|---|---|
| Package | `sonner@^2.0.7` |
| Global | `<Toaster position="bottom-center" richColors />` in `RootLayout` |

**Why:** Non-blocking dismissible toasts for cart feedback, form submission results, and admin mutations. Used throughout via `import { toast } from 'sonner'`.

---

## 16. SWR — Data Fetching in Admin

| Detail | Value |
|---|---|
| Package | `swr@^2.4.1` |
| Used in | Admin-side React components that need polling/refetch |

**Why:** SWR is used in admin panels where Client Components need fresh data without full Server Actions (e.g., notification polling, search results).

---

## 17. Date Utilities — date-fns

| Detail | Value |
|---|---|
| Package | `date-fns@^4.1.0` |
| Used for | Date formatting in order views, coupon validity |

---

## 18. HTML Sanitisation — sanitize-html

| Detail | Value |
|---|---|
| Package | `sanitize-html@^2.17.3` |
| Used in | `src/lib/richText.js` — sanitizes product descriptions and custom page content before rendering via `dangerouslySetInnerHTML` |

---

## 19. AI / SEO Generation — Google Generative AI

| Package | Version | Used for |
|---|---|---|
| `@google/genai` | ^1.49.0 | Primary SDK |
| `@google/generative-ai` | ^0.24.1 | Legacy/secondary SDK |

**Why:** Powers the admin **"Generate SEO"** feature at `src/app/api/admin/generate-seo/route.js` — takes product name/description and returns AI-generated `seoTitle`, `seoDescription`, `seoKeywords`.

---

## 20. Drawer — Vaul

| Detail | Value |
|---|---|
| Package | `vaul@^1.1.2` |
| Used in | `src/components/ui/drawer.jsx` — mobile bottom-sheet drawers |

---

## 21. Typography — Geist Font (Next.js)

Loaded via `next/font/google` in `RootLayout`:
- `Geist` (sans) → `--font-geist-sans`
- `Geist_Mono` → `--font-geist-mono`

---

## 22. Development Tools

| Tool | Purpose |
|---|---|
| `eslint@^9` + `eslint-config-next` | Linting |
| `typescript@^6.0.2` | Type checking (JS files with `@ts-ignore` annotations) |
| `babel-plugin-react-compiler@^1.0.0` | React 19 compiler integration |
| `.npmrc` | Custom npm registry config |

---

## Environment Variables Summary

| Var | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `ADMIN_EMAIL` / `ADMIN_EMAILS` | Static admin whitelist |
| `ADMIN_PASSWORD` | Admin credentials login |
| `RESEND_API_KEY` | Email delivery |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Image uploads |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for tracking/SEO |

---

*Next: [[Architecture]] · [[Flows-and-Workflows]] · [[API-Routes-and-Models]]*
