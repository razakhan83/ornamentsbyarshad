import { optimizeCloudinaryUrl } from '@/lib/cloudinaryImage';

const FALLBACK_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeDI9IjEwMCUiIHkxPSIwJSIgeTI9IjEwMCUiPjxzdG9wIHN0b3AtY29sb3I9IiNlZWYyZjciIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjZDVkZGVhIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=";

export async function generateBlurDataURLFromDataUrl(dataUrl) {
  // If it's already a data URL, we use it directly or return the fallback
  return dataUrl || FALLBACK_BLUR_DATA_URL;
}

export async function generateBlurDataURLFromRemoteUrl(url) {
  const source = String(url || '').trim();
  if (!source) return FALLBACK_BLUR_DATA_URL;

  try {
    // If it's a Cloudinary URL, request an extremely tiny (20x20px), low-quality format
    // so the downloaded payload is incredibly miniscule and loads instantly.
    const optimizedUrl = optimizeCloudinaryUrl(source, {
      width: 20,
      height: 20,
      crop: 'fill',
      quality: 30,
      format: 'jpg',
    });

    const response = await fetch(optimizedUrl || source, { cache: "no-store" });
    if (!response.ok) {
      return FALLBACK_BLUR_DATA_URL;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("[Blur Generator] Failed to generate placeholder for remote URL, using fallback:", error.message);
    return FALLBACK_BLUR_DATA_URL;
  }
}

