// ── Category Color Palettes ───────────────────────────────────────────────────
// 8 distinct pastel backgrounds. Each category section on the home page and
// product detail pages gets a different colour so users can instantly tell
// sections apart on both mobile and desktop.
//
// The `bg` property is a Tailwind class used when the class is statically
// resolvable. The `style` property is an inline-CSS fallback for dynamically
// generated category names that Tailwind JIT can't pre-scan.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTES = [
  // 0 – Mint Green  (kitchen, fresh, food)
  {
    bg: 'bg-[#edf7f2]',
    style: { backgroundColor: '#edf7f2' },
    text: 'text-emerald-800',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200',
    accent: '#10b981',
    hex: '#edf7f2',
  },
  // 1 – Soft Lavender  (home decor, lifestyle)
  {
    bg: 'bg-[#f3f0fb]',
    style: { backgroundColor: '#f3f0fb' },
    text: 'text-violet-800',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    border: 'border-violet-200',
    accent: '#7c3aed',
    hex: '#f3f0fb',
  },
  // 2 – Powder Blue  (health, beauty, personal care)
  {
    bg: 'bg-[#eaf4fb]',
    style: { backgroundColor: '#eaf4fb' },
    text: 'text-sky-800',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    border: 'border-sky-200',
    accent: '#0ea5e9',
    hex: '#eaf4fb',
  },
  // 3 – Warm Peach  (fashion, apparel, gifts)
  {
    bg: 'bg-[#fef3ee]',
    style: { backgroundColor: '#fef3ee' },
    text: 'text-orange-800',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    border: 'border-orange-200',
    accent: '#f97316',
    hex: '#fef3ee',
  },
  // 4 – Soft Lemon  (toys, kids, fun)
  {
    bg: 'bg-[#fefce8]',
    style: { backgroundColor: '#fefce8' },
    text: 'text-yellow-800',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    border: 'border-yellow-200',
    accent: '#eab308',
    hex: '#fefce8',
  },
  // 5 – Light Teal  (electronics, tech)
  {
    bg: 'bg-[#edfafa]',
    style: { backgroundColor: '#edfafa' },
    text: 'text-teal-800',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    border: 'border-teal-200',
    accent: '#14b8a6',
    hex: '#edfafa',
  },
  // 6 – Rose Blush  (beauty, gifts, accessories)
  {
    bg: 'bg-[#fff0f4]',
    style: { backgroundColor: '#fff0f4' },
    text: 'text-rose-800',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-200',
    accent: '#f43f5e',
    hex: '#fff0f4',
  },
  // 7 – Cool Gray  (automotive, tools, sports)
  {
    bg: 'bg-[#f3f4f6]',
    style: { backgroundColor: '#f3f4f6' },
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    border: 'border-gray-200',
    accent: '#6b7280',
    hex: '#f3f4f6',
  },
];

// Named overrides — these guarantee a consistent colour for well-known categories
const CATEGORY_COLOR_MAP = {
  'kitchen accessories': PALETTES[0],
  'kitchen':             PALETTES[0],
  'kitchenware':         PALETTES[0],
  'home decor':          PALETTES[1],
  'home & living':       PALETTES[1],
  'health & beauty':     PALETTES[2],
  'beauty':              PALETTES[6],
  'personal care':       PALETTES[2],
  'fashion':             PALETTES[3],
  'clothing':            PALETTES[3],
  'apparel':             PALETTES[3],
  'stationery':          PALETTES[4],
  'office':              PALETTES[4],
  'toys & games':        PALETTES[4],
  'kids':                PALETTES[4],
  'electronics':         PALETTES[5],
  'gadgets':             PALETTES[5],
  'tech':                PALETTES[5],
  'sports & fitness':    PALETTES[7],
  'sports':              PALETTES[7],
  'pet supplies':        PALETTES[0],
  'automotive':          PALETTES[7],
  'tools':               PALETTES[7],
  'gifts':               PALETTES[6],
  'accessories':         PALETTES[3],
  'storage':             PALETTES[5],
  'lighting':            PALETTES[4],
  'baby':                PALETTES[2],
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Returns a colour palette for a given category name.
 *  Falls back to a hash-based palette for unknown categories
 *  so every category still gets a distinct, consistent colour. */
export function getCategoryColor(categoryName) {
  if (!categoryName) return PALETTES[0];

  const key = categoryName.toLowerCase().trim();
  if (CATEGORY_COLOR_MAP[key]) return CATEGORY_COLOR_MAP[key];

  return PALETTES[hashString(key) % PALETTES.length];
}

/** Returns a colour palette by array position (0, 1, 2 …).
 *  Use this when you want guaranteed alternating colors regardless of
 *  category name — e.g. home page sections where the Nth section
 *  should always get the Nth palette color. */
export function getCategoryColorByIndex(index) {
  return PALETTES[Math.abs(index) % PALETTES.length];
}

export function getAllCategoryColors() {
  return { ...CATEGORY_COLOR_MAP };
}
