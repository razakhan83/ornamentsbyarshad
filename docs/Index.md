# Index — China Unique Store: Second Brain

> **Last Updated:** July 2026  
> **Site:** China Unique Store — Premium kitchenware, home decor, and lifestyle products for modern Pakistani homes.  
> **Stack:** Next.js 16 · React 19 · MongoDB · Mongoose · NextAuth v4 · Tailwind CSS v4 · Cloudinary  
> **Status:** 4 months old, production-live, single-developer codebase

---

## Knowledge Graph

```
                    ┌─────────────┐
                    │  [[Index]]  │  ← You are here
                    └──────┬──────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ [[Skills-and-   │ │[[Architecture│ │[[API-Routes-and-     │
│  TechStack]]    │ │]]            │ │Models]]              │
└────────┬────────┘ └──────┬───────┘ └──────────┬───────────┘
         │                 │                     │
         └────────┬────────┘                     │
                  ▼                              │
         ┌────────────────┐                      │
         │ [[Flows-and-   │◄─────────────────────┘
         │  Workflows]]   │
         └────────┬───────┘
                  │
                  ▼
           ┌────────────┐
           │  [[TODO]]  │
           └────────────┘
```

---

## Documents

| Document | Description |
|---|---|
| [[Skills-and-TechStack]] | Every dependency, library, and tool — **WHY** and **WHERE** used |
| [[Architecture]] | Folder structure, architectural patterns, naming conventions, security, caching |
| [[Flows-and-Workflows]] | Step-by-step data flows: auth, cart, checkout, order, admin, tracking |
| [[API-Routes-and-Models]] | All MongoDB schemas, API routes, pages, and key components |
| [[TODO]] | Technical debt, bugs, missing features, and improvement tasks |

---

## Project Summary

China Unique Store is a **full-stack Pakistani e-commerce platform** built as a Next.js 16 monolith. The same codebase serves:
- **Customer-facing store** (`/`, `/products`, `/checkout`, `/orders`, `/wishlist`)
- **Admin panel** (`/admin/...`) with full store management
- **REST API** (`/api/...`) for client components and external integrations

### Core Capabilities

| Feature | Status |
|---|---|
| Product catalog with categories, search, filters, pagination | ✅ Live |
| Product detail pages with SEO metadata, image gallery, reviews | ✅ Live |
| Cart (localStorage, optimistic UI, React 19 `useOptimistic`) | ✅ Live |
| Wishlist (localStorage for guests, DB sync for logged-in users) | ✅ Live |
| Checkout with COD / Online payment, city-based shipping | ✅ Live |
| Coupon codes (percentage, fixed amount, free shipping) | ✅ Live |
| Order management (status pipeline, tracking, invoice PDF) | ✅ Live |
| Admin dashboard with KPIs and charts (Recharts) | ✅ Live |
| Google OAuth + admin password + guest/demo mode | ✅ Live |
| Drag-and-drop homepage builder (dnd-kit) | ✅ Live |
| Cloudinary image upload with blur placeholders | ✅ Live |
| Email notifications (Resend) — admin alert + customer receipt | ✅ Live |
| Meta Pixel + CAPI server-side deduplication | ✅ Live |
| TikTok Events API integration | ✅ Live |
| AI SEO generation (Google Gemini) | ✅ Live |
| Facebook product catalog XML feed | ✅ Live |
| Stock request ("Notify Me") capture form | ✅ Live |
| Admin notification center (order, review, user events) | ✅ Live |
| Vendor / sourcing management system | ✅ Live |
| Custom pages editor (About Us, Privacy Policy, etc.) | ✅ Live |
| Soft-delete + TTL auto-purge for orders (50 days) | ✅ Live |
| JWT-based force logout and user ban system | ✅ Live |

---

## Key Technology Decisions

| Decision | Rationale |
|---|---|
| **Next.js App Router** over Pages Router | RSC, Server Actions, `use cache` directive, no separate API server needed |
| **MongoDB** over PostgreSQL | Schema flexibility for fast-moving product, easier horizontal scaling |
| **NextAuth v4** over custom auth | Handles Google OAuth + JWT management + session callbacks |
| **Server Actions** over REST for mutations | CSRF-safe, co-located cache invalidation, no client fetch boilerplate |
| **`after()` hook** for email/tracking | Non-blocking — user sees success immediately, side effects run after response |
| **Split Cart Contexts** | Prevents re-renders on unrelated state slices |
| **Cloudinary** for images | CDN + transforms + blur placeholders stored in MongoDB |
| **Resend** for email | Simpler than SMTP, developer-first API |
| **`cacheLife('foreverish')`** on store shell | Categories and settings rarely change; cache dramatically reduces DB hits |

---

## Environment Variables Checklist

```env
MONGODB_URI=                     # MongoDB Atlas connection string
NEXTAUTH_SECRET=                 # JWT signing secret (generate with openssl rand)
NEXTAUTH_URL=                    # Production URL (https://yourdomain.com)
GOOGLE_CLIENT_ID=                # Google Cloud OAuth client ID
GOOGLE_CLIENT_SECRET=            # Google Cloud OAuth client secret
ADMIN_EMAIL=                     # Primary admin email
ADMIN_EMAILS=                    # Additional admins (comma-separated)
ADMIN_PASSWORD=                  # Admin credentials login password
RESEND_API_KEY=                  # Resend API key for email
CLOUDINARY_CLOUD_NAME=           # Cloudinary cloud name
CLOUDINARY_API_KEY=              # Cloudinary API key
CLOUDINARY_API_SECRET=           # Cloudinary API secret
NEXT_PUBLIC_SITE_URL=            # Public canonical URL
GEMINI_API_KEY=                  # Google Gemini AI key (for SEO generation)
```

---

## Critical Files Quick Reference

| File | What it does |
|---|---|
| `src/app/actions.js` | ALL server mutations — 1056 lines — the most important file |
| `src/lib/data.js` | ALL data fetching — 2400 lines — read by every RSC page |
| `src/lib/auth.js` | NextAuth config — JWT callbacks, admin detection, force logout |
| `src/lib/mongooseConnect.js` | Cached DB connection with serverless-aware timeouts |
| `src/context/CartContext.jsx` | Cart state — split into 3 contexts, optimistic UI |
| `src/context/WishlistContext.jsx` | Wishlist — guest localStorage + logged-in DB sync |
| `src/app/(store)/layout.js` | `'use cache'` store shell — most critical perf optimization |
| `src/lib/orderFulfillment.js` | Resolves item prices from DB at checkout, decrements stock |
| `src/lib/checkoutPricing.js` | Shipping + coupon discount calculation |
| `src/lib/trackingServer.js` | Meta CAPI + TikTok server-side event relay |
| `src/lib/emailTemplates.js` | All email HTML templates |
| `src/lib/invoice-generator.js` | jsPDF invoice builder |
| `src/models/Settings.js` | Singleton document — controls almost everything |
| `src/models/Order.js` | Most complex model — 10+ fields added iteratively |
| `src/models/Product.js` | Core catalog model with vendor snapshots and indexing |
| `next.config.mjs` | React compiler, cache config, turbopack, image domains |

---

## Top Priorities from [[TODO]]

| # | Priority | Task |
|---|---|---|
| 1 | 🔴 Critical | Split `actions.js` into domain-specific action files |
| 2 | 🔴 Critical | Replace `$regex` product search with MongoDB Atlas Search |
| 3 | 🔴 Critical | Add Zod input validation to all Server Actions |
| 4 | 🟡 Important | Split `data.js` into domain modules |
| 5 | 🟡 Important | Add rate limiting to public API routes |
| 6 | 🟢 Quick Win | Add JSON-LD structured data to product pages |
| 7 | 🟢 Quick Win | Add unit tests for pricing and order status functions |

---

*Open any document in Obsidian Graph View to see the knowledge connections.*
