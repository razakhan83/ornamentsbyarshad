const MAX_SEO_KEYWORDS = 10;
const MAX_SEO_KEYWORDS_LENGTH = 250;

export function normalizeSeoKeywords(input, maxKeywords = MAX_SEO_KEYWORDS) {
  const values = Array.isArray(input)
    ? input
    : String(input ?? "").split(",");

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const keyword = String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (!keyword) {
      continue;
    }

    const dedupeKey = keyword.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(keyword);

    if (normalized.length >= maxKeywords) {
      break;
    }
  }

  return normalized;
}

export function formatSeoKeywords(input, maxKeywords = MAX_SEO_KEYWORDS) {
  const keywords = normalizeSeoKeywords(input, maxKeywords);
  const fitted = [];

  for (const keyword of keywords) {
    const candidate = [...fitted, keyword].join(", ");
    if (candidate.length > MAX_SEO_KEYWORDS_LENGTH) {
      break;
    }

    fitted.push(keyword);
  }

  return fitted.join(", ");
}
