# Codex Prompt — Skeleton Loading System (Next.js, Cache-Aware, Zero Flicker)

## Context
This project uses Next.js with cache components (`unstable_cache` / route segment caching / `use cache`).
Goal: make the entire store feel instant — no full-screen refresh, no flicker, no "everything pops at once."
Every loading state must be a **skeleton that matches the shape of the real content**, and must respect
already-cached data (show cached data immediately, never re-show a skeleton for data we already have).

Do NOT touch business logic, API calls, or data-fetching logic unless required to wire up Suspense boundaries.
This is a UX/loading-state pass on top of the existing app.

---

## Core Rules (apply everywhere)

1. **Cache-first render**: If a page/route's data is already in the Next.js cache (via `unstable_cache`, cached
   fetch, or the cache component), render it immediately with NO skeleton. Skeletons only show when data is
   genuinely being fetched for the first time (cache miss) or during client-side lazy loads.

2. **Per-route skeletons, not global ones**: Every route segment gets its own `loading.tsx` (or Suspense
   fallback) that matches THAT page's layout — never fall back to the home page skeleton or a generic spinner.
   - Product listing page → grid-of-cards skeleton
   - Product detail page → image block + title + price + description block skeleton
   - Cart page → line-item row skeletons
   - Checkout page → skeleton shaped exactly like the real form fields (label + input block placeholders),
     not a generic block
   - Order page → skeleton shaped like order cards/rows

3. **No full-page refresh / no flicker on navigation**:
   - Use `next/link` with default prefetching enabled.
   - Wrap route transitions so the old content doesn't hard-unmount and repaint white — use React's
     `useTransition` / Suspense so the current UI stays visible until the new segment is ready, then the
     skeleton for the NEW page fades in immediately (instant navigation feel), followed by a smooth
     crossfade into real content once loaded.
   - Any layout that persists across routes (header, nav, cart icon) must NOT re-render or flash.

4. **Images — blur-first, not skeleton-first**:
   - Every image that has a blur placeholder (`placeholder="blur"` / blurDataURL) should show the blur
     version immediately — never a gray skeleton box over an image that already has a blur source available.
   - While the full-res image is loading, overlay a **subtle shimmer animation on top of the blur image**
     (not a solid skeleton block replacing it) so it reads as "content is here, just sharpening up."
   - On load complete: crossfade blur → sharp image over ~250–300ms, no snap/pop.
   - Only use a plain skeleton box for images that have NO blur placeholder at all.

5. **Skeletons must be "smart", not generic gray boxes**:
   - Match dimensions/aspect ratio of the real content exactly (avoid layout shift — reserve exact height/width).
   - Use rounded corners / shapes consistent with the real component (e.g., pill-shaped price skeleton,
     circular avatar skeleton).
   - Use the existing slate-based design system (no default Tailwind gray, no heavy shadows) —
     shimmer color should use `bg-slate-200` / `bg-slate-800` (dark mode) with a moving gradient shimmer,
     not a flat pulse.
   - Animation: a soft left-to-right shimmer sweep (like shadcn/ui skeleton conventions) OR a gentle pulse —
     pick ONE consistent animation style and use it everywhere for visual consistency.

6. **Lazy-loaded sections (infinite scroll / "load more" grids)**:
   - New items appear progressively as they resolve — do NOT wait for the entire batch to load before
     showing anything. Each item transitions from skeleton → content independently as its data arrives.
   - Stagger the reveal slightly (~40–60ms delay between items) so it doesn't feel like a jump-cut.

7. **Interaction-triggered navigation (click product/cart/checkout)**:
   - On click, the destination route should open **instantly** (no delay waiting for full data) showing
     that page's skeleton right away, then swap to real content as it resolves.
   - This applies to: product card click → product detail page, cart icon/click → cart page,
     "Checkout" click → checkout page (form-shaped skeleton until real form mounts).

8. **Order page fix (separate small task)**:
   - Increase border clarity between individual order cards/rows so they don't visually blend into each
     other — use a slightly more visible border (e.g., `border-slate-300` light / `border-slate-700` dark)
     or subtle separation via spacing + border instead of relying on background color alone.

---

## Implementation approach — figure this out from the codebase

Don't assume file structure, routing setup, or existing components — inspect the actual codebase first
(routes, existing cache usage, existing image components, existing skeleton/shadcn components if any) and
implement in a way that fits how this project is already structured. Follow Next.js official best practices
for loading UI, Suspense boundaries, and streaming (loading.tsx conventions, colocated Suspense, etc.).

General shape of what's needed (adapt to actual project structure, don't force this exact file list):
- Loading/Suspense fallback for each route: home, product listing, product detail, cart, checkout, orders —
  reuse or extend existing components where they already exist instead of duplicating.
- A shared, reusable skeleton primitive (check if one already exists via shadcn/ui before creating a new one).
- A shared reusable blur-image wrapper (check for an existing image component to extend first) handling:
  blur placeholder → shimmer overlay while loading → crossfade to sharp image on load.
- Suspense boundaries placed correctly so cached data renders instantly and only genuinely-loading
  parts show skeletons (partial/streaming rendering, not all-or-nothing).
- Order page: updated border/spacing styling for order cards.

## Before writing code
Read through the relevant parts of the codebase (routing structure, current data-fetching/cache setup,
existing UI components) so the implementation matches how this project actually works, instead of
guessing a generic Next.js pattern.

## What NOT to do
- Don't add a global top-loading-bar spinner as a replacement for skeletons.
- Don't wrap the whole app in one big Suspense boundary (that causes full-page skeleton/flicker) —
  boundaries should be scoped per section/route.
- Don't change existing cache logic/config — only consume it correctly for render timing.
