/**
 * Smart relative time & date formatting utility.
 * 
 * Rules:
 * - < 1 min: "Just now"
 * - 1 to 59 mins: "1 min ago" / "15 mins ago"
 * - 1 to 23 hours: "1 hour ago" / "4 hours ago"
 * - 1 to 2 days (calendar yesterday / 24-48h): "Yesterday"
 * - 2 to 29 days: "2 days ago" / "14 days ago"
 * - >= 30 days (1 month+): fallback to formatted date & time ("12 Jan 2026, 04:30 PM")
 */

export function parseDateSafe(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input !== 'string') return null;

  const raw = input.trim();
  if (!raw || raw === '—' || raw === 'N/A' || raw === 'null' || raw === 'undefined') return null;

  const now = new Date();

  // 1. Month name formats (e.g. "01-Sep-2026 18:30" or "01 Sep 2026, 06:30 PM")
  const MONTH_NAMES = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  const dMmmMatch = raw.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/,\s]+(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
  if (dMmmMatch) {
    const day = parseInt(dMmmMatch[1], 10);
    const mStr = dMmmMatch[2].toLowerCase();
    const month = MONTH_NAMES[mStr] !== undefined ? MONTH_NAMES[mStr] : -1;
    const year = parseInt(dMmmMatch[3], 10);
    let hour = dMmmMatch[4] ? parseInt(dMmmMatch[4], 10) : 0;
    const min = dMmmMatch[5] ? parseInt(dMmmMatch[5], 10) : 0;
    const sec = dMmmMatch[6] ? parseInt(dMmmMatch[6], 10) : 0;
    const ampm = dMmmMatch[7] ? dMmmMatch[7].toUpperCase() : null;

    if (month >= 0) {
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const constructed = new Date(year, month, day, hour, min, sec);
      if (!isNaN(constructed.getTime())) return constructed;
    }
  }

  // 2. Year-First format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    let hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const ampm = ymdMatch[7] ? ymdMatch[7].toUpperCase() : null;

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const constructed = new Date(year, month, day, hour, min, sec);
      if (!isNaN(constructed.getTime())) return constructed;
    }
  }

  // 3. Two number components: (num1)[-/.] (num2)[-/.] (year)
  // e.g. "8/31/2026 6:03:24 PM", "29-08-2026 15:40:00", "01/09/2026"
  const twoNumMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?$/i);
  if (twoNumMatch) {
    const n1 = parseInt(twoNumMatch[1], 10);
    const n2 = parseInt(twoNumMatch[2], 10);
    const year = parseInt(twoNumMatch[3], 10);
    let hour = twoNumMatch[4] ? parseInt(twoNumMatch[4], 10) : 0;
    const min = twoNumMatch[5] ? parseInt(twoNumMatch[5], 10) : 0;
    const sec = twoNumMatch[6] ? parseInt(twoNumMatch[6], 10) : 0;
    const ampm = twoNumMatch[7] ? twoNumMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    let day, month;
    if (n1 > 12) {
      // Must be DD-MM-YYYY (e.g. 29/8/2026 or 31-08-2026)
      day = n1;
      month = n2 - 1;
    } else if (n2 > 12) {
      // Must be MM-DD-YYYY (e.g. 8/31/2026 or 8/25/2026)
      month = n1 - 1;
      day = n2;
    } else {
      // Both <= 12 (e.g. 1/9/2026 or 01-09-2026)
      // Hyphen '-' is standard Pakistani DD-MM-YYYY, Slash '/' is US MM/DD/YYYY
      if (raw.includes('-')) {
        day = n1;
        month = n2 - 1;
      } else {
        month = n1 - 1;
        day = n2;
      }
    }

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const constructed = new Date(year, month, day, hour, min, sec);
      if (!isNaN(constructed.getTime())) {
        // Future date sanity check: if constructed date is in the future (> 5 mins), but swapping n1 and n2 gives a valid past date, swap them
        if (constructed.getTime() > now.getTime() + 300000 && n1 <= 31 && n2 <= 12) {
          const swapped = new Date(year, n1 - 1, n2, hour, min, sec);
          if (!isNaN(swapped.getTime()) && swapped.getTime() <= now.getTime() + 300000) {
            return swapped;
          }
        }
        return constructed;
      }
    }
  }

  // 4. Default Date constructor for ISO-8601 strings
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFullDateTime(input) {
  const d = parseDateSafe(input);
  if (!d) return typeof input === 'string' ? input : '—';
  
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatFullDate(input) {
  const d = parseDateSafe(input);
  if (!d) return '—';
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatFullTime(input) {
  const d = parseDateSafe(input);
  if (!d) return '—';
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatSmartTimeAgo(input) {
  const d = parseDateSafe(input);
  if (!d) {
    if (typeof input === 'string' && input.trim()) return input.trim();
    return '—';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // If timestamp is slightly in future (< 2 mins) due to clock skew
  if (diffMs < 0 && diffMs > -120000) {
    return 'Just now';
  }

  // If noticeably in the future (> 2 mins), return full formatted date
  if (diffMs <= -120000) {
    return formatFullDateTime(d);
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 1. Less than 60 seconds
  if (diffSec < 60) {
    return 'Just now';
  }

  // 2. Minutes (1 - 59)
  if (diffMin < 60) {
    return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  }

  // 3. Hours (1 - 23)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  // 4. Yesterday (1 day / 24-48h)
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // 5. Days (2 - 29 days)
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }

  // 6. 30+ days (1 month and older): Full Date & Time fallback
  return formatFullDateTime(d);
}

export function formatSmartTimeAgoWithExact(input) {
  const d = parseDateSafe(input);
  if (!d) {
    const fallbackText = typeof input === 'string' && input.trim() ? input.trim() : '—';
    return {
      relative: fallbackText,
      exact: fallbackText,
      full: fallbackText,
      isRecent: false,
    };
  }

  const relative = formatSmartTimeAgo(d);
  const exact = formatFullDateTime(d);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));

  return {
    relative,
    exact,
    full: `${exact} (${relative})`,
    isRecent: diffDays < 2,
  };
}
