import sanitizeHtml from 'sanitize-html';

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const RICH_TEXT_SANITIZER_OPTIONS = {
  allowedTags: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'hr',
    'i',
    'iframe',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'u',
    'ul',
    'video',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    iframe: ['src', 'title', 'allow', 'allowfullscreen', 'frameborder'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    video: ['src', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'poster', 'preload'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
    iframe: ['https'],
    video: ['http', 'https'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }, true),
  },
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function looksLikeHtml(value = "") {
  return HTML_TAG_PATTERN.test(String(value));
}

export function sanitizeRichTextHtml(value = "") {
  return sanitizeHtml(String(value || ''), RICH_TEXT_SANITIZER_OPTIONS).trim();
}

export function stripHtmlTags(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatRichTextDescriptionHtml(value = "") {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (looksLikeHtml(normalizedValue)) {
    return sanitizeRichTextHtml(normalizedValue);
  }

  return escapeHtml(normalizedValue).replace(/\n/g, "<br />");
}
