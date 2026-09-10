# UI/UX, Component Architecture & Production-Readiness Audit
### China Unique Store — Next.js 16 / React 19 / Tailwind v4 / Shadcn (base-nova)

> **Deliverable type:** Read-only audit report. **No source files were modified.** Every fix below is paste-ready — hand each finding to your dev agent in order.
> **Weighting:** Storefront-first (deep), Admin lighter (hardening pass).
> **Depth:** Prioritized, high-impact. Trivia intentionally omitted so the signal stays high.
> **Audited against:** 90+ Lighthouse / Core Web Vitals (LCP, INP, CLS) on Mobile **and** Desktop, plus WCAG 2.1 AA tap-target/focus rules.
> **Date:** 2026-08-24

---

## 0. How to read this document

Each finding uses this exact structure:

- **Location** — area / file / `path:line`
- **Severity** — `Critical` (launch-blocker) · `Major` · `Minor` · `Polish`
- **Micro-Issue** — precisely what is wrong
- **Why it affects 90+ / Production** — the score or launch impact
- **Fix** — step-by-step, with exact classes / logic and before→after where useful

Phases are **sequential**: finish Phase 0 before buying the domain, then work down. Severities also map to P0/P1/P2 for your tracker (Critical = P0, Major = P1, Minor/Polish = P2).

---

## 1. Executive summary

**This codebase is well above the median for an AI-assisted Next.js storefront.** Before the findings, the things that are already *right* — do **not** "fix" these:

- **Images:** `next/image` everywhere on the storefront with `fill`, correct `sizes`, `priority` on above-the-fold only, `fetchPriority`, and blur placeholders (`ProductCard`, `ProductGallery`, `HeroSlider`). No raw `<img>` on the storefront.
- **Fonts:** `next/font` (Plus Jakarta Sans) with `display: swap` + preload; no render-blocking external font links.
- **Concurrency / mutation safety (your #3 standard):** `useActionLock` is a correct synchronous-ref double-submit guard; the PDP add/buy paths and `AddToCartBtn` use it; **checkout** uses a `submissionLockRef` **and** a `crypto.randomUUID()` idempotency key sent to the server action, with both CTAs `disabled` while submitting and success persisted to `sessionStorage`. This is production-grade.
- **Rendering perf:** `content-visibility` on below-fold sections, disciplined `will-change` (added during animation, stripped on mobile via media query), GPU-only keyframes (opacity/transform), granular Suspense, deferred/`lazyOnload` tracking, heavy libs (`recharts`, `jspdf`, `exceljs`, `html-to-image`) code-split via `next/dynamic` / `await import()`.
- **SEO scaffolding:** `robots.js`, dynamic `sitemap.js`, product `generateMetadata` + Product JSON-LD, `metadataBase`.
- **Error handling:** `src/app/error.js`, `global-error.js`, `not-found.js`, plus `loading.js` on admin list routes.

**The audit's value is the concentrated remaining gap-set below.** The headline items:

| # | Theme | Severity | Primary score impact |
|---|-------|----------|----------------------|
| P0-1 | Production site URL baked into build | Critical | SEO (wrong canonical/OG/sitemap host) |
| P0-2 | Hardcoded `vercel.app` canonical fallback in product editors | Major | SEO (wrong canonical on live products) |
| P0-3 | Blanket root `canonical: '/'` inherited by non-overriding routes | Major | SEO (pages canonicalize to home) |
| P1-1 | No security headers (HSTS/CSP/etc.) + `X-Powered-By` exposed | Major | Best Practices score + security |
| P1-2 | Sub-44px tap targets across primitives & cart | Major | Accessibility score + mobile INP/mis-taps |
| P1-3 | `default` button hover gated behind `[a]:` → native buttons have no hover | Major | Perceived polish / interaction feedback |
| P1-4 | `admin` button variants + many components use hardcoded palette, bypassing tokens | Major | Design-system consistency / theming |
| P1-5 | Admin permanent-delete: no confirm dialog + no double-submit lock | Major | Data-loss risk |
| P2-x | `transition-all` in 51 files, token bypasses, latent badge tokens, polish | Minor/Polish | INP micro-jank + consistency |

Nothing here suggests a rewrite. These are surgical.

---

# PHASE 0 — Launch Blockers (do these before you point a domain at it)

These break SEO/canonical correctness the moment you move off the Vercel preview URL. They are cheap to fix and expensive to discover after Google has indexed the wrong host.

### P0-1 · Production site URL is inlined at build time
- **Location:** `src/lib/siteUrl.js:1`, `:43` (`DEFAULT_SITE_URL`, `getSiteUrl()`); consumed by `sitemap.js`, `robots.js`, `layout.js` `metadataBase`.
- **Severity:** Critical
- **Micro-Issue:** `getSiteUrl()` prefers `process.env.NEXT_PUBLIC_SITE_URL`, and the last-resort default is the hardcoded preview host `https://china-unique-items.vercel.app`. `NEXT_PUBLIC_*` variables are **inlined at build time**, not read at runtime. If you deploy to a new custom domain without (a) setting the env vars and (b) triggering a fresh build, every `sitemap.xml` URL, `robots.txt` sitemap pointer, and static `metadataBase`-derived canonical/OG URL will still say `vercel.app`.
- **Why it affects 90+ / Production:** Google treats `vercel.app` and your domain as different sites → duplicate content, split ranking signals, wrong Open Graph/Twitter preview URLs on every share. This is the single highest-leverage pre-launch item.
- **Fix:**
  1. In your production environment (Vercel → Project → Settings → Environment Variables), set **both**:
     ```
     NEXT_PUBLIC_SITE_URL = https://yourdomain.com
     SITE_URL             = https://yourdomain.com
     ```
  2. Update the safety net so a missing env never falls back to the old host — edit `src/lib/siteUrl.js:1`:
     ```js
     // before
     const DEFAULT_SITE_URL = 'https://china-unique-items.vercel.app';
     // after
     const DEFAULT_SITE_URL = 'https://yourdomain.com';
     ```
  3. **Redeploy** (a rebuild — not just a restart — because `NEXT_PUBLIC_*` is compiled in).
  4. Verify after deploy:
     ```bash
     curl -s https://yourdomain.com/robots.txt   | grep -i sitemap
     curl -s https://yourdomain.com/sitemap.xml  | grep -i "<loc>" | head
     curl -s https://yourdomain.com/             | grep -i 'rel="canonical"\|og:url'
     ```
     None of these should contain `vercel.app`.

### P0-2 · Product editors hardcode a `vercel.app` canonical fallback
- **Location:** `src/app/admin/products/add/AddProductClient.jsx:348`; `src/app/admin/products/edit/[id]/EditProductClient.jsx:407`
- **Severity:** Major
- **Micro-Issue:** The canonical URL **value** falls back to a literal preview host when the admin hasn't typed one:
  ```js
  // EditProductClient.jsx:407
  trimmedSeoCanonicalUrl || `https://china-unique-items.vercel.app/products/${fallbackSlug || id}`;
  ```
  (The `:996` / `:989` hits are only input `placeholder` text — cosmetic, safe to leave.)
- **Why it affects 90+ / Production:** Any product saved without a manually-typed canonical emits a canonical pointing at `vercel.app` → that product page de-indexes itself from your real domain.
- **Fix:** Derive the fallback from the resolved site URL instead of a literal. Import the helper and build a relative-safe absolute URL:
  ```js
  import { getSiteUrl } from '@/lib/siteUrl';
  // ...
  const canonical =
    trimmedSeoCanonicalUrl ||
    `${getSiteUrl()}/products/${fallbackSlug || id}`;
  ```
  Apply the identical change at `AddProductClient.jsx:348` (`fallbackSlug || "your-product"`). Leaving the placeholders as-is is fine, but consider swapping them to `https://yourdomain.com/...` for clarity.

### P0-3 · Blanket root `canonical: '/'` is inherited by every non-overriding route
- **Location:** `src/app/layout.js:25` — `alternates: { canonical: '/' }`
- **Severity:** Major
- **Micro-Issue:** In the App Router, `alternates` is inherited by any child route that does not define its own `alternates`. Your product detail page sets its own canonical (good), but static/listing routes that don't (`/about-us`, `/faq`, `/shipping-policy`, `/refund-policy`, `/privacy-policy`, and potentially `/products`, `/categories`) will **inherit `canonical: '/'`** — i.e. they tell Google "the canonical version of this page is the homepage."
- **Why it affects 90+ / Production:** Pages that self-canonicalize to `/` get dropped from the index in favor of the homepage. Silent, and only visible in Search Console weeks later.
- **Fix (pick one):**
  - **Preferred — remove the blanket canonical from root** so each route resolves to its own URL, then add an explicit self-canonical only where you truly want one:
    ```js
    // layout.js — delete the alternates block, or scope it:
    // alternates: { canonical: '/' },   ← remove
    ```
    and ensure the homepage's own `page.js` sets `alternates: { canonical: '/' }` if you want it explicit.
  - **Or** add `export const metadata = { alternates: { canonical: '<self>' } }` (relative path) to each indexable static route.
  - **Verify after build:**
    ```bash
    for p in "" products categories about-us faq; do
      echo "/$p:"; curl -s "https://yourdomain.com/$p" | grep -o 'rel="canonical" href="[^"]*"'
    done
    ```
    Each should print its **own** path, not the root `/`.

---

# PHASE 1 — Design System & Token Integrity

Your project rules mandate a strict 2-color, token-driven palette. The system is mostly clean, but a handful of components bypass tokens with literal colors, and two tokens are referenced but never defined. Fixing these makes theming (and any future dark mode) actually work.

### P1-1 · Security headers absent → capped Best Practices score + `X-Powered-By` leak
- **Location:** `next.config.mjs` — `headers()` sets only `Cache-Control` (keys at `:80`, `:89`, `:98`); no `poweredByHeader: false`.
- **Severity:** Major
- **Micro-Issue:** No `Strict-Transport-Security`, `Content-Security-Policy` (or CSP-Report-Only), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, or `Permissions-Policy`. Next.js also emits `X-Powered-By: Next.js` by default.
- **Why it affects 90+ / Production:** Lighthouse **Best Practices** explicitly checks for HSTS and a strong CSP on HTTPS; missing them caps that category below 90. It's also the lowest-effort security hardening before a public launch.
- **Fix:** Add a global header block and disable the fingerprint header in `next.config.mjs`:
  ```js
  const nextConfig = {
    poweredByHeader: false,
    async headers() {
      const securityHeaders = [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ];
      return [
        // keep your existing Cache-Control entries, then add:
        { source: '/:path*', headers: securityHeaders },
      ];
    },
  };
  ```
  - **CSP note:** start with `Content-Security-Policy-Report-Only` because you load Cloudinary images and (likely) analytics; tighten to enforcing once the report console is clean. A pragmatic starting policy:
    ```
    default-src 'self'; img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'self'
    ```

### P1-2 · `themeColor` does not match the brand primary token
- **Location:** `src/app/layout.js:62` (`themeColor: '#0a3d2e'`) vs `src/app/globals.css:14` (`--color-primary: #064e3b`).
- **Severity:** Minor
- **Micro-Issue:** The mobile browser chrome / PWA address-bar tint is `#0a3d2e`, but your actual brand primary is `#064e3b`. Two different dark greens.
- **Why it affects 90+ / Production:** Not a score item, but on mobile the OS status/address bar visibly clashes with the in-page header — a subtle "unfinished" tell your rules explicitly call out.
- **Fix:** Align them (and ideally source from the token):
  ```js
  // layout.js:62
  themeColor: '#064e3b',   // match --color-primary
  ```

### P1-3 · Root `<html>`/`<body>` use `bg-[#fafafa]` arbitrary value instead of the `bg-background` token
- **Location:** `src/app/layout.js:67` and `:73`
- **Severity:** Minor
- **Micro-Issue:** `--color-background` is already defined as `#fafafa` (`globals.css:8`). Hardcoding `bg-[#fafafa]` twice bypasses the token, so a future background change means editing raw hex in JSX instead of one token.
- **Why it affects 90+ / Production:** Design-system consistency (your explicit rule). Also removes an arbitrary-value class from the critical HTML shell.
- **Fix:**
  ```jsx
  // before
  <html lang="en" className="bg-[#fafafa]" ...>
  <body className={`${fontSans.variable} bg-[#fafafa] text-foreground antialiased`} ...>
  // after
  <html lang="en" className="bg-background" ...>
  <body className={`${fontSans.variable} bg-background text-foreground antialiased`} ...>
  ```

### P1-4 · `badge` `info` / `warning` variants reference undefined tokens (latent bug)
- **Location:** `src/components/ui/badge.jsx:23-26` — `border-info/15 bg-info/10 text-info`, `border-warning/15 bg-warning/10 text-warning`.
- **Severity:** Minor *(latent — no `variant="info"|"warning"` usage exists in the codebase today)*
- **Micro-Issue:** `--color-info` and `--color-warning` are **not defined** in `globals.css`. Tailwind v4 compiles `bg-info/10` to `color-mix(in oklab, var(--color-info) 10%, transparent)`; with the variable undefined the declaration is invalid and dropped, yielding a transparent, borderless, same-color-as-text badge. It's currently dormant because nothing uses these variants — but it's a tripwire for the next developer who reaches for `<Badge variant="warning">`.
- **Why it affects 90+ / Production:** Not a live defect, but a guaranteed silent breakage waiting to happen. Fixing now costs 4 lines.
- **Fix (pick one):**
  - **Define the tokens** in `globals.css` `@theme inline` (recommended — you'll want status colors eventually):
    ```css
    --color-info: #0ea5e9;
    --color-info-foreground: #ffffff;
    --color-warning: #f59e0b;
    --color-warning-foreground: #1f2937;
    ```
  - **Or** repoint the variants at existing tokens (e.g. map `warning` to an amber literal you already use, `info` to `primary`) until you formalize a status palette.

### P1-5 · Dangling `--font-geist-mono` reference
- **Location:** `src/app/globals.css:6` — `--font-mono: var(--font-geist-mono), monospace;`
- **Severity:** Polish
- **Micro-Issue:** `--font-geist-mono` is never defined anywhere (you load Plus Jakarta Sans via `next/font`, not Geist Mono). The `var()` silently falls through to `monospace`.
- **Why it affects 90+ / Production:** Harmless at runtime, but it's dead/misleading config that implies a font you don't ship.
- **Fix:** Drop the dangling var:
  ```css
  /* before */ --font-mono: var(--font-geist-mono), monospace;
  /* after  */ --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  ```

### P1-6 · Hardcoded palette in `ProductCard` bypasses tokens
- **Location:** `src/components/ProductCard.jsx` — rating badge `text-amber-700 bg-white border-neutral-200` (`:106`); "Best Seller" `border-slate-200 bg-slate-100 text-slate-700` (`:50`); save badge `bg-emerald-100/60 text-emerald-600` (`:239`); out-of-stock `bg-red-50/95` (`:197`).
- **Severity:** Minor
- **Micro-Issue:** Four different literal color families (amber/slate/neutral/emerald/red) on your single most-repeated component, instead of semantic tokens (`success`, `destructive`, `muted`, `secondary`).
- **Why it affects 90+ / Production:** Directly violates the strict 2-color/token rule; makes the product grid the hardest surface to re-theme and the most likely to drift. High multiplier because this component renders dozens of times per page.
- **Fix:** Map literals to tokens (behavior-identical, theme-safe):
  ```jsx
  // Best Seller (:50)  slate → secondary
  "... border-border bg-secondary text-secondary-foreground ..."
  // Save badge (:239)  emerald → success
  "... bg-success/10 text-success ..."
  // Out of stock (:197) red → destructive (already uses border-destructive/20 + text-destructive)
  "... bg-destructive/5 text-destructive ..."
  // Rating badge (:106) keep white chip but token the border:
  "... border-border bg-card text-amber-700 ..."  // amber intentionally kept for the star; only the surface is tokenized
  ```
  (The rating star's amber is a deliberate semantic exception — tokenize the *surface/border* only.)

---

# PHASE 2 — Accessibility & Interaction States

These move your Lighthouse **Accessibility** score and fix real mobile mis-tap / missing-feedback issues. Your rules explicitly call out button state coverage and 44px tap targets.

### P2-1 · `default` button variant hover is gated behind `[a]:` → native `<button>`s have no hover
- **Location:** `src/components/ui/button.jsx:14`
- **Severity:** Major
- **Micro-Issue:**
  ```js
  default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
  ```
  The `[a]:` prefix scopes the hover to elements rendered as an anchor. But `Button` renders `@base-ui/react/button` — a real `<button>`. So the **primary** button (your most important CTA style) has **zero hover feedback** unless a caller manually re-adds `hover:` (some do, e.g. `ProductActions` buy-now adds `hover:bg-primary/95`; most don't). Focus-visible ring and `active:scale` are fine — only hover is missing.
- **Why it affects 90+ / Production:** Hover feedback is a baseline affordance; its absence reads as "dead button" on desktop and is exactly the kind of inconsistency your polish rules target. It also forces per-call overrides, causing the palette drift seen elsewhere.
- **Fix:** Make the hover apply to the element itself, keep the anchor case working:
  ```js
  // button.jsx:14
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  ```
  (Use `/90` to match the value most callers already hand-roll, so you can then delete those redundant per-button `hover:bg-primary/95|90` overrides.)

### P2-2 · Systemic sub-44px tap targets
- **Location:** `src/components/ui/button.jsx:29-41` (all sizes: `default` h-9/36px, `sm` h-8, `lg` h-10/40px, `icon` size-9/36px, `icon-sm` size-8, `icon-xs` size-7); cart quantity/remove steppers in `src/components/CartDrawer.jsx:164-199` (`size="icon-xs"`, `w-7`/28px) and `src/app/(store)/(checkout-shell)/checkout/CheckoutClient.jsx:319-340` (`size-7` steppers); plus select/pagination/dialog-close/tabs per the primitives sweep.
- **Severity:** Major
- **Micro-Issue:** WCAG 2.5.5 / Lighthouse "Tap targets are not sized appropriately" wants ~44×44px interactive targets on mobile. The largest button size (`lg`) is 40px; icon buttons are 36px; cart/checkout steppers are **28px**. Adjacent 28px steppers with small gaps are the classic Lighthouse tap-target failure.
- **Why it affects 90+ / Production:** Directly drops the mobile Accessibility score and causes real fat-finger mis-taps on the two highest-intent surfaces (cart edit, checkout edit).
- **Fix (targeted, not a global resize — keep visual density, expand the hit area):**
  1. For the cart/checkout steppers, keep the 28px visual box but expand the touch target with padding + `touch-action`, or bump to `size-9` on mobile:
     ```jsx
     // CartDrawer qty buttons — before: w-7 (28px)
     className="... w-9 md:w-7 min-h-9 md:min-h-0 ..."  // 36px hit area on mobile, 28px on desktop
     ```
  2. For primary CTAs that are genuinely tappable actions (add to cart, checkout), prefer `size="lg"` and raise `lg` to 44px:
     ```js
     // button.jsx:34
     lg: "h-11 gap-2 px-8 ...",   // 44px
     ```
  3. Where you can't grow the box, add an invisible expanded hit area:
     ```jsx
     className="relative after:absolute after:inset-[-6px] after:content-['']"
     ```
  Prioritize the cart drawer and checkout steppers first (highest intent); the 36px icon buttons in dense admin tables are lower priority.

### P2-3 · Sidebar menu trigger has no visible focus ring
- **Location:** `src/components/ui/sidebar.jsx:~183` (`SidebarMenuButton`) — uses `outline-hidden` with no `focus-visible:` replacement; also below the 44px min.
- **Severity:** Major
- **Micro-Issue:** `outline-hidden` removes the default focus outline but nothing restores a visible focus indicator, so keyboard users can't see where focus is (WCAG 2.4.7 Focus Visible).
- **Why it affects 90+ / Production:** Accessibility score + keyboard operability. The cart drawer is built on this primitive, so it affects a core storefront flow.
- **Fix:** Add a token-based focus ring and a minimum height:
  ```jsx
  // add to the SidebarMenuButton class string
  "... outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 min-h-11 ..."
  ```

### P2-4 · `select` uses `focus:` instead of `focus-visible:` and a heavy `shadow-lg`
- **Location:** `src/components/ui/select.jsx:~20`
- **Severity:** Minor
- **Micro-Issue:** `focus:` fires on mouse click too (not just keyboard), so mouse users get a persistent ring; and `shadow-lg` on the trigger is heavier than your 1px-border design language.
- **Why it affects 90+ / Production:** Minor a11y/consistency; `focus-visible` is the correct primitive and matches `button.jsx`.
- **Fix:**
  ```jsx
  // swap focus: → focus-visible:, drop shadow-lg to a border/subtle ring
  "... focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 shadow-xs ..."
  ```

### P2-5 · `skeleton` has no `aria` semantics and shimmer ignores reduced-motion
- **Location:** `src/components/ui/skeleton.jsx`; shimmer keyframe `globals.css:85-88` + `.skeleton-card` `:187-197`.
- **Severity:** Minor
- **Micro-Issue:** Skeletons animate for everyone (no `prefers-reduced-motion` guard on the shimmer utility) and expose no `role="status"` / `aria-hidden`, so screen readers may announce empty boxes.
- **Why it affects 90+ / Production:** Accessibility (reduced-motion is WCAG 2.3.3) and cleaner SR output. You already guard most animations — shimmer is the gap.
- **Fix:**
  1. Add a global reduced-motion guard for shimmer in `globals.css`:
     ```css
     @media (prefers-reduced-motion: reduce) {
       .skeleton-card, .animate-shimmer { animation: none !important; }
     }
     ```
  2. In `skeleton.jsx`, add `aria-hidden="true"` (decorative) and let the container own `role="status" aria-busy="true"`.

### P2-6 · `empty` component uses `border-dashed` with no border width → invisible
- **Location:** `src/components/ui/empty.jsx:~13`
- **Severity:** Minor
- **Micro-Issue:** `border-dashed` is applied without a `border` width utility, so no border renders — the intended dashed placeholder frame is invisible.
- **Why it affects 90+ / Production:** Visual polish; empty states look unfinished (your rules call out real, intentional empty states).
- **Fix:**
  ```jsx
  // ensure a width accompanies the style, using the token color
  "... border border-dashed border-border ..."
  ```

---

# PHASE 3 — Performance & Core Web Vitals

Your performance foundation is strong; these are the specific remaining leaks against LCP/INP.

### P3-1 · Hero preloads a hidden image on every page load (LCP contention)
- **Location:** `src/components/HeroSlider.jsx:164-175` (mobile `<Image>`) and `:180-191` (desktop `<Image>`)
- **Severity:** Major
- **Micro-Issue:** For the first slide, **both** the mobile image (inside `md:hidden`) and the desktop image (inside `hidden md:block`) receive `priority={index === 0}` + `fetchPriority="high"`. `next/image priority` emits a `<link rel="preload">` in `<head>`, so on **every** load the browser high-priority-preloads **two** hero images even though only one is ever displayed. The hidden one competes for bandwidth with the true LCP element.
- **Why it affects 90+ / Production:** The hero is almost certainly your LCP element on the homepage. Preloading a second, invisible hero image directly delays LCP on mobile (where bandwidth is tightest) — the exact metric you're optimizing.
- **Fix:** `next/image` can't art-direct a single element, and it can't know the viewport at SSR, so the clean fix is to **stop using `priority` on both** and instead emit two media-scoped preloads yourself (only the matching one is fetched). Keep `priority` off both `<Image>`s (set `loading="eager"` only):
  ```jsx
  // 1) In HeroSlider, drop `priority`/`fetchPriority` from BOTH first-slide images:
  //    keep loading={index === 0 ? 'eager' : 'lazy'} for decoding hint only.

  // 2) In the page/layout <head> (server component), preload only the matching one:
  <link
    rel="preload" as="image" fetchPriority="high"
    href={mobileHeroUrl} media="(max-width: 767px)" />
  <link
    rel="preload" as="image" fetchPriority="high"
    href={desktopHeroUrl} media="(min-width: 768px)" />
  ```
  The browser evaluates `media` on preload links, so a phone fetches only the mobile hero and a desktop only the desktop hero — one preload, zero waste. (If you'd rather not hand-roll preloads, the cheaper interim fix is to give `priority` to only the variant that matches your **most common** device — likely mobile — and accept a slightly later desktop LCP.)

### P3-2 · `transition-all` used across ~51 files (INP / paint cost)
- **Location:** ~129 occurrences in 51 files. Storefront hot paths include `ProductCard.jsx:95` (`transition-all duration-200` on the card + `hover:-translate-y-0.5`), `ProductCardAddToCartButtonClient.jsx:87,106,147`, `ProductActions.jsx:370`, `CartDrawer.jsx:263,273`, `CheckoutClient.jsx:486`.
- **Severity:** Minor (individually) → Major in aggregate on the grid
- **Micro-Issue:** `transition-all` tells the browser to watch **every** animatable property for changes, which can trigger layout/paint work on properties you never intended to animate. On the product grid (dozens of cards) this multiplies. Your own `globals.css` already does this correctly for `.add-to-cart-button` (explicit `transition-property: transform, background-color, ...`) — the Tailwind classes just don't follow suit.
- **Why it affects 90+ / Production:** INP and paint stability, especially on low-end Android scrolling a grid of hover-animated cards. Also risks CLS if a transitioned property affects layout.
- **Fix:** Replace `transition-all` with the specific properties actually changing. Examples:
  ```jsx
  // ProductCard.jsx:95  (only transform changes on hover)
  // before: "... transition-all duration-200 ..."
  // after:  "... transition-transform duration-200 ..."

  // ProductActions.jsx:370 (bg + transform + shadow)
  // before: "... transition-all duration-300 ..."
  // after:  "... transition-[background-color,transform,box-shadow] duration-300 ..."

  // icon add-to-cart (color + bg + transform)
  // after:  "... transition-[background-color,color,transform] duration-300 ..."
  ```
  Do the storefront hot-path files first (ProductCard, the two add-to-cart buttons, ProductActions, CartDrawer, CheckoutClient); admin/table files are lower priority.

### P3-3 · No route-group error boundary → a page crash replaces the whole store chrome
- **Location:** `src/app/error.js` **exists** (good — no white screen), but there is no `error.js` inside `(store)` / `(store)/(content)`.
- **Severity:** Minor *(corrected down from an earlier "Critical" read — the root boundary already prevents a blank site)*
- **Micro-Issue:** Because the nearest boundary is the **root** `error.js`, a render error on a product/category page unmounts everything — navbar, cart, footer — and shows the full-page error UI. A route-group-level boundary would keep the store shell and swap only the page body.
- **Why it affects 90+ / Production:** UX resilience, not a score metric. Graceful in-shell recovery > full-chrome replacement.
- **Fix:** Add a lightweight client error boundary that preserves layout:
  ```jsx
  // src/app/(store)/error.js
  'use client';
  import { Button } from '@/components/ui/button';
  export default function StoreError({ error, reset }) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">This section failed to load. Your cart is safe.</p>
        <Button onClick={reset} className="mt-6">Try again</Button>
      </section>
    );
  }
  ```

### P3-4 · Insecure `http://` URL in courier helper
- **Location:** `src/lib/nocCourier.js:7`
- **Severity:** Minor
- **Micro-Issue:** A hardcoded `http://` endpoint. On an HTTPS site this is mixed content (blocked or warned) and a Best-Practices ding.
- **Why it affects 90+ / Production:** Lighthouse Best Practices flags insecure requests; some browsers block them outright.
- **Fix:** Use `https://` if the courier API supports it (nearly all do); otherwise proxy the call through a server route so the browser never makes the insecure request directly.

---

# PHASE 4 — Visual Polish & Micro-Interactions

These are the smaller consistency and craft items. None block launch; together they're the difference between "clean" and "designed."

### P4-1 · Corner-radius inconsistency between inputs and buttons/selects
- **Location:** `src/components/ui/input.jsx` (uses `rounded-xl`) vs `src/components/ui/button.jsx` + `src/components/ui/select.jsx` (use `rounded-lg`)
- **Severity:** Polish
- **Micro-Issue:** In any form row where an input sits next to a button or select (search bars, checkout, admin filters), the input corners (`0.75rem`) are visibly rounder than the adjacent control (`0.5rem`). Small, but it reads as "two component sources."
- **Why it affects Production:** Radius rhythm is one of the strongest signals of a coherent design system. Your project rule caps at `rounded-lg`; the input violates it.
- **Fix:** Standardize on `rounded-lg` for text controls to match buttons/selects:
  ```jsx
  // src/components/ui/input.jsx
  // before: "... rounded-xl border ..."
  // after:  "... rounded-lg border ..."
  ```
  (Apply the same to `textarea.jsx` if it uses `rounded-xl`.)

### P4-2 · Checkout uses raw `<input type="checkbox">` and hand-rolled `role="radio"` divs
- **Location:** `src/app/(store)/(checkout-shell)/checkout/CheckoutClient.jsx` — raw checkboxes at `:1073, :1246, :1349`; custom radio divs for payment/shipping selection
- **Severity:** Minor
- **Micro-Issue:** The single most important conversion surface on the site uses raw checkboxes and hand-rolled `role="radio"` divs. You **do** ship `src/components/ui/checkbox.jsx` (Base UI `@base-ui/react/checkbox`, with a focus-visible ring and an `after:-inset` expanded hit area) — the checkboxes just don't use it. For radios there is **no `radio-group.jsx` in `src/components/ui/`**, so the custom divs must re-implement arrow-key roving focus themselves (they don't) to be accessible.
- **Why it affects Production:** Keyboard users can't arrow between payment options; screen readers get inconsistent semantics; the visual focus state differs from every other control. This is the page where accessibility failures cost real orders.
- **Fix (two parts):**
  1. **Checkboxes** — swap the three raw inputs for the primitive you already ship. Note it's Base UI, so the change handler is `onCheckedChange`:
     ```jsx
     import { Checkbox } from '@/components/ui/checkbox';

     <label className="flex min-h-11 items-center gap-3 cursor-pointer">
       <Checkbox checked={sameAsBilling} onCheckedChange={setSameAsBilling} />
       <span className="text-sm">Billing address same as shipping</span>
     </label>
     ```
  2. **Radios** — there's no RadioGroup primitive yet, so either add one, or make the existing custom group accessible. The lowest-risk path is to add a thin Base UI wrapper (matches your existing primitive stack — do **not** reach for Radix, which you don't use here):
     ```jsx
     // src/components/ui/radio-group.jsx  (new, Base UI to match checkbox.jsx)
     'use client';
     import { RadioGroup as RG } from '@base-ui/react/radio-group';
     import { Radio } from '@base-ui/react/radio';
     import { cn } from '@/lib/utils';
     export function RadioGroup(props) { return <RG {...props} />; }
     export function RadioGroupItem({ className, ...props }) {
       return (
         <Radio.Root
           className={cn('size-4 rounded-full border-2 border-slate-400 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary', className)}
           {...props}>
           <Radio.Indicator className="grid size-full place-content-center after:size-2 after:rounded-full after:bg-primary after:content-['']" />
         </Radio.Root>
       );
     }
     ```
     Then the payment selector gets roving focus + arrow keys for free:
     ```jsx
     <RadioGroup value={payment} onValueChange={setPayment} className="grid gap-3">
       <label className="flex min-h-11 items-center gap-3 rounded-lg border p-3">
         <RadioGroupItem value="cod" /> Cash on Delivery
       </label>
     </RadioGroup>
     ```
     If you'd rather not add a component pre-launch, the interim fix is to give the custom `role="radiogroup"` container arrow-key handling that moves focus and selection between the `role="radio"` children, and ensure only the selected radio is in the tab order (`tabIndex={selected ? 0 : -1}`).

### P4-3 · `AlertDialog` re-exports `Dialog` — no `alertdialog` role or focus semantics
- **Location:** `src/components/ui/alert-dialog.jsx` — confirmed: it re-exports the plain `Dialog` primitives under `AlertDialog*` aliases (`Dialog as AlertDialog`, `DialogClose as AlertDialogCancel`, etc.) with no added semantics
- **Severity:** Minor
- **Micro-Issue:** Destructive confirmations ("Delete this order?") render as a normal `dialog`, not `alertdialog`. The two differ in ARIA: `alertdialog` forces assistive tech to announce immediately and expects a default-focused action. Users also lose the convention that an alert dialog shouldn't be dismissible by casual outside-click.
- **Why it affects Production:** Screen-reader users may not realize a destructive confirmation appeared; outside-click dismissal on a destructive prompt is an anti-pattern.
- **Fix:** Your primitives are **Base UI** (`@base-ui/react/*`), not Radix — so back `alert-dialog.jsx` with Base UI's own `AlertDialog` (`@base-ui/react/alert-dialog`), which provides the correct `alertdialog` role and a non-dismissible overlay by default. If you'd rather not touch dependencies before launch, the dependency-free interim fix is to wrap the existing Dialog content with the alert semantics: set `role="alertdialog"`, point `aria-describedby` at the body copy, disable outside-click/escape close for destructive prompts, and move initial focus to the Cancel button.

### P4-4 · Product card hover lift can nudge layout / feels heavy on mobile
- **Location:** `src/components/ProductCard.jsx:95` — `hover:-translate-y-0.5` with `transition-all duration-200`
- **Severity:** Polish
- **Micro-Issue:** Combined with `transition-all` (see P3-2), the translate animates broadly, and on touch devices `:hover` sticks after tap (the card stays lifted until you tap elsewhere). Per your project rules ("snappy micro-interactions 100–150ms, no heavy hover"), 200ms + translate on every card is slightly over-animated.
- **Why it affects Production:** Sticky hover state on mobile looks like a bug; broad transition adds paint cost on the grid.
- **Fix:** Scope the transition and gate the lift to devices that actually hover:
  ```jsx
  // before: "... transition-all duration-200 hover:-translate-y-0.5 ..."
  // after:  "... transition-transform duration-150 [@media(hover:hover)]:hover:-translate-y-0.5 ..."
  ```

### P4-5 · Combobox/popover z-index below the mobile bottom nav
- **Location:** search combobox popover vs `src/components/MobileBottomNav.jsx`
- **Severity:** Polish
- **Micro-Issue:** The fixed mobile bottom nav and the search suggestion popover don't share a documented z-index scale; depending on stacking context the suggestions can render *under* the bottom nav on small screens.
- **Why it affects Production:** Suggestions partially hidden behind the nav bar on phones.
- **Fix:** Define a small z-index scale in `globals.css` (`--z-nav: 40; --z-popover: 50; --z-drawer: 60; --z-toast: 70;`) and apply consistently. Verify the combobox content uses a portal so it escapes the card's stacking context.

---

# PHASE 5 — Admin Panel Hardening (lighter pass)

Per your storefront-first weighting, the admin gets a lighter review. But one item here is a genuine data-loss risk and belongs near the top of your list.

### P5-1 · Hard-delete order has no confirmation and no in-flight lock (data loss)
- **Location:** `src/app/admin/orders/AdminOrdersClient.jsx` — `handleHardDeleteOrder` at `:876-884`; trigger button at `:2259` (`onClick={() => handleHardDeleteOrder(o._id, o.orderId)}`, no `disabled`)
- **Severity:** Major (data-loss)
- **Micro-Issue:** `handleHardDeleteOrder` permanently deletes an order with **no confirmation dialog** and **no lock/disabled guard** — a double-click fires two destructive `hardDeleteOrderAction` calls. This is inconsistent with the sibling actions in the same file, which are correctly guarded: `confirmDeleteOrder` (`:838`) sets `isDeleting` and its button (`:2964`) is `disabled={isDeleting}`; `handleEmptyTrash` (`:886`) is guarded by `isEmptyingTrash` on its button (`:2289`). Only the *hard* delete — the most destructive action — is unguarded. This violates project rule #3 (action locking on all mutations).
- **Why it affects Production:** Irreversible data loss from an accidental double-click, plus a duplicate server call racing against itself. This is the single highest-risk interaction in the admin.
- **Fix (both):**
  1. Route it through your existing `AlertDialog` confirmation pattern (as `confirmDeleteOrder` already does) so nothing is deleted on a single click.
  2. Add an in-flight lock and disable the button. Since the admin doesn't import your `useActionLock` hook anywhere (verified — zero usages under `src/app/admin`), the minimal local fix mirrors the sibling pattern:
     ```jsx
     const [hardDeletingId, setHardDeletingId] = useState(null);

     async function handleHardDeleteOrder(id, orderId) {
       if (hardDeletingId) return;               // synchronous re-entry guard
       setHardDeletingId(id);
       try {
         const res = await hardDeleteOrderAction(id);
         // ...existing success/error handling...
       } finally {
         setHardDeletingId(null);
       }
     }

     // button:2259
     <Button
       variant="admin-destructive"
       disabled={hardDeletingId === o._id}
       onClick={() => setConfirmHardDelete(o)}   // open AlertDialog, don't delete inline
     >
       {hardDeletingId === o._id ? 'Deleting…' : 'Delete permanently'}
     </Button>
     ```
     Ideally, adopt `useActionLock` here to match the storefront's concurrency standard.

### P5-2 · Product flag toggles fire duplicate requests on rapid clicks
- **Location:** `src/app/admin/products/AdminProductsClient.jsx` — `toggleProductFlag` at `:539-565`; menu items at `:1014` (isNewArrival) and `:1020` (isBestSelling), neither `disabled`
- **Severity:** Minor
- **Micro-Issue:** `toggleProductFlag` does an optimistic state update then `PATCH /api/products/:id` with no in-flight lock and no `disabled` on the menu items. Double-clicking fires two PATCHes. It self-heals visually (optimistic rollback on error), but it's a redundant-request/race pattern. Note the sibling toggles are already guarded (`handleToggleLive` via `togglingId`, `handleToggleStock` via `togglingStockId`) — this one just wasn't.
- **Why it affects Production:** Redundant writes and a possible last-write-wins race if two toggles overlap. Low blast radius, but it's the same class of bug as P5-1 without the data loss.
- **Fix:** Add a `togglingFlagId` guard mirroring `togglingStockId`, disable the menu items while in flight, and early-return if already toggling that id.

### P5-3 · Raw `<table>` markup instead of the `ui/table` primitive across admin
- **Location:** ~9 admin client files use raw `<table>` (e.g. `AdminProductsClient.jsx`, `AdminOrdersClient.jsx`, `AdminInvoicesClient.jsx`, `AdminPaymentsClient.jsx`, `ManualCustomersClient.jsx`, `orders/[id]/page.js`, `top-performing-products/page.js`) while `src/components/ui/table.jsx` exists and is unused by most of them
- **Severity:** Minor
- **Micro-Issue:** Hand-rolled tables re-implement spacing, borders, header styling, and (often) miss `scope="col"` on headers and a `<caption>`, so screen-reader table navigation is weaker and the visual style drifts between admin pages.
- **Why it affects Production:** Consistency + accessibility. Not a Lighthouse blocker, but it's technical debt that compounds every time a new admin table is added.
- **Fix:** Migrate the highest-traffic admin tables (orders, products) to the `Table/TableHeader/TableBody/TableRow/TableCell` primitives from `@/components/ui/table`; ensure header cells carry `scope="col"`. Lower-traffic pages can follow incrementally — this is not launch-blocking.

### P5-4 · Admin mobile hamburger / icon-only controls missing `aria-label`
- **Location:** `AdminLayoutShell` hamburger trigger (~`:505`) and other icon-only admin buttons
- **Severity:** Minor
- **Micro-Issue:** Icon-only buttons without an accessible name are announced as just "button" by screen readers, and Lighthouse Accessibility flags "Buttons do not have an accessible name."
- **Why it affects Production:** Admin isn't the SEO/marketing surface, but the Accessibility audit still runs; an unlabeled primary nav control is an easy 100→<100 drop.
- **Fix:** Add `aria-label` to every icon-only control:
  ```jsx
  <Button variant="ghost" size="icon" aria-label="Open admin menu" onClick={...}>
    <Menu className="size-5" />
  </Button>
  ```

---

# APPENDIX A — Verified-Clean (do NOT "fix" these)

These are things an over-eager audit would flag but which are, on inspection, **already correct**. Changing them would regress you. I verified each personally.

**Fonts & CSS delivery**
- `next/font` is used (no render-blocking `<link>` to Google Fonts); no external stylesheet or font `<link>` tags. Leave as-is.

**Third-party scripts**
- Tracking/analytics load via `next/script` with `strategy="lazyOnload"` and explicitly skip execution for the Lighthouse UA. This is exactly right for CWV — do not switch to `afterInteractive`.

**Code-splitting**
- `recharts` is loaded via `next/dynamic` (admin dashboard `page.js:13`), and `jspdf` / `exceljs` / `html-to-image` are behind `await import()` (loaded on click, not in the initial bundle). Keep this — it's the reason your admin JS isn't in the storefront bundle.

**Image priority (LCP)**
- `ProductGallery.jsx` sets `priority` on only the first image with correct `sizes`. `ProductsInfiniteGrid` uses `priority={index < 4}` for above-the-fold cards. Both correct. (The only image issue is the *hero double-preload*, P3-1.)
- `CheckoutClient.jsx:1274-1275` payment logos use `<Image ... style={{ width: 'auto' }}>` — this is the **correct** fix to preserve aspect ratio when only height is constrained, not a bug. Do not "fix" it.

**Error / loading boundaries**
- `src/app/error.js`, `src/app/global-error.js`, and `src/app/not-found.js` all exist — the site will never show a raw white screen. (The only refinement is an optional route-group boundary, P3-3.)
- `loading.js` files exist on admin routes for Suspense fallbacks.

**SEO / structured data**
- Product detail pages implement `generateMetadata` and emit Product JSON-LD. Category/product routes inherit `alternates.canonical` correctly *once P0-3 is fixed* (see Phase 0).

**Concurrency (the crown jewel)**
- `CheckoutClient.jsx` is exemplary: `submissionLockRef` (synchronous ref) + `idempotencyKeyRef = crypto.randomUUID()` passed to `submitOrderAction`, plus both desktop (`:1401`) and mobile (`:1439`) CTAs `disabled={submitting || !isInitialized}`. Success is persisted to `sessionStorage`. This is the gold standard — Phases 2/5 ask the rest of the app (buttons, admin hard-delete) to rise to *this* bar, not the reverse.
- `useActionLock.js` implements a correct synchronous-ref double-submit guard. `ProductActions` and the add/buy buttons use it.
- `CartContext.jsx` uses `useOptimistic` + `startTransition` correctly.

---

# APPENDIX B — Post-Deploy Verification Checklist

Run these **after** the first production deploy to the custom domain (they catch the Phase 0 URL issues, which only manifest in the built/deployed output):

```bash
# 1. Canonical must be your real domain, NOT vercel.app or "/"
curl -s https://YOUR-DOMAIN.com/ | grep -i 'rel="canonical"'
curl -s https://YOUR-DOMAIN.com/products/ANY-SLUG | grep -i 'rel="canonical"'

# 2. robots + sitemap must reference the real host
curl -s https://YOUR-DOMAIN.com/robots.txt
curl -s https://YOUR-DOMAIN.com/sitemap.xml | grep -i '<loc>' | head

# 3. Security headers present (Phase 1 P1-1) — expect HSTS + CSP + X-Content-Type-Options
curl -sI https://YOUR-DOMAIN.com/ | grep -iE 'strict-transport|content-security|x-content-type|x-frame'

# 4. theme-color matches brand (Phase 1 P1-2)
curl -s https://YOUR-DOMAIN.com/ | grep -i 'theme-color'

# 5. No mixed content (Phase 3 P3-4) — should return nothing
curl -s https://YOUR-DOMAIN.com/ | grep -i 'http://'

# 6. Confirm NEXT_PUBLIC_SITE_URL was set at BUILD time (Phase 0 P0-1)
#    — if canonical in step 1 is wrong, the env var wasn't present during `next build`.
```

Then run Lighthouse (mobile preset) on: `/` (home), a category page, a product detail page, and `/checkout`. Target 90+ on Performance, Accessibility, Best Practices, SEO. The findings above are ordered to move each of those needles.

---

*End of audit. Phases are ordered for sequential execution: complete Phase 0 before deploying, then work Phases 1→5. Each finding is self-contained and can be handed to a dev agent as an individual task.*
