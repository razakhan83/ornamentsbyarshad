/**
 * NOC Express Courier API Helper Module
 * Base API URL: http://api.shipnoc.com/api
 * Supports 2 NOC Accounts / Portals (portal_1, portal_2)
 */

const BASE_URL = 'http://api.shipnoc.com/api';

export const NOC_PORTALS = [
  { id: 'portal_1', name: 'Main Account (unique items)' },
  { id: 'portal_2', name: 'Secondary Account (aamsaman)' },
];

/**
 * Resolves credentials for a given portal key ('portal_1' | 'portal_2')
 */
export function getNocCredentials(portalKey = 'portal_1') {
  const key = portalKey === 'portal_2' ? '2' : '1';

  const userName = process.env[`NOC_PORTAL_${key}_USERNAME`] || process.env.NOC_USERNAME || '';
  const password = process.env[`NOC_PORTAL_${key}_PASSWORD`] || process.env.NOC_PASSWORD || '';
  let signature = process.env[`NOC_PORTAL_${key}_SIGNATURE`] || process.env.NOC_SIGNATURE || '';

  // Smart concatenation fallback: NOC API requires Signature format (UserName + Password + SecretKey)
  if (signature && !signature.includes(password)) {
    signature = `${userName}${password}${signature}`;
  }

  return { userName, password, signature };
}

async function safeParseNocResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    const preview = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    throw new Error(`Invalid response from NOC API (HTTP ${response.status}): ${preview || 'Non-JSON response'}`);
  }
}

/**
 * 1. Book Parcels (Single or Bulk)
 * Endpoint: POST /api/BookParcel
 */
export async function bookNocParcels(parcels, portalKey = 'portal_1') {
  const { userName, password, signature } = getNocCredentials(portalKey);

  if (!userName || !password) {
    throw new Error(`NOC Express credentials for '${portalKey}' are missing. Please configure NOC_PORTAL_${portalKey === 'portal_2' ? '2' : '1'}_USERNAME and PASSWORD in .env.local.`);
  }

  const payload = {
    UserName: userName,
    Password: password,
    Signature: signature,
    Parcels: parcels.map((p) => ({
      ConsigneeName: String(p.consigneeName || '').trim(),
      ConsigneeAddress: String(p.consigneeAddress || '').trim(),
      ConsigneeEmail: (() => {
        const email = String(p.consigneeEmail || '').trim();
        return email && email.includes('@') && email.includes('.') ? email : 'customer@chinaunique.pk';
      })(),
      ConsigneeCellNo: String(p.consigneeCellNo || '').trim(),
      ItemType: String(p.itemType || 'Mix').trim(),
      City: String(p.city || '').trim(),
      Quantity: String(p.quantity || 1),
      CODAmount: String(p.codAmount ?? 0),
      Weight: String(p.weight ?? 1),
      SpecialInstruction: String(p.specialInstruction || '').trim(),
    })),
  };

  const urls = [
    'http://api.shipnoc.com/api/BookParcel',
    'https://api.shipnoc.com/api/BookParcel',
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const text = await response.text();
        const clean = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
        throw new Error(`NOC API HTTP error (${response.status}): ${clean || response.statusText}`);
      }

      const data = await safeParseNocResponse(response);
      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('NOC API BookParcel service unreachable. Please check network connection.');
}

/**
 * 2. Get Supported Cities
 * Endpoint: GET /api/GetCity
 */
export async function fetchNocCities(portalKey = 'portal_1') {
  const { userName, password, signature } = getNocCredentials(portalKey);
  const query = `UserName=${encodeURIComponent(userName)}&Password=${encodeURIComponent(password)}&Signature=${encodeURIComponent(signature)}`;
  const urls = [
    `http://api.shipnoc.com/api/GetCity?${query}`,
    `https://api.shipnoc.com/api/GetCity?${query}`,
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await safeParseNocResponse(response);
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('NOC API GetCity service unreachable');
}

/**
 * 3. Get Parcel Tracking History
 * Endpoint: GET /api/GetParcelTracking
 */
export async function trackNocParcel(parcelNo, portalKey = 'portal_1') {
  const { userName, password, signature } = getNocCredentials(portalKey);
  const query = `UserName=${encodeURIComponent(userName)}&Password=${encodeURIComponent(password)}&Signature=${encodeURIComponent(signature)}&ParcelNo=${encodeURIComponent(parcelNo)}`;

  const urls = [
    `http://api.shipnoc.com/api/GetParcelTracking?${query}`,
    `https://api.shipnoc.com/api/GetParcelTracking?${query}`,
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await safeParseNocResponse(response);
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('NOC API tracking service unreachable');
}

/**
 * 4. Cancel Parcel
 * Endpoint: POST /api/CancelParcel
 */
export async function cancelNocParcel(parcelNos, portalKey = 'portal_1') {
  const { userName, password, signature } = getNocCredentials(portalKey);

  const payload = {
    UserName: userName,
    Password: password,
    Signature: signature,
    Parcels: (Array.isArray(parcelNos) ? parcelNos : [parcelNos]).map((pNo) => ({
      ParcelNo: String(pNo).trim(),
    })),
  };

  const response = await fetch(`${BASE_URL}/CancelParcel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    const clean = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new Error(`NOC API HTTP error (${response.status}): ${clean || response.statusText}`);
  }

  const data = await safeParseNocResponse(response);
  return data;
}

/**
 * 5. Fetch Live NOC Portal Dashboard (Automated Scraper)
 * Automatically logs in to shipnoc.com and fetches the live table of booked parcels,
 * extracting Courier Partners (Leopard, TCS, NOC, etc.) and 3rd Party CNs.
 */
export async function fetchNocPortalDashboard(portalKey = 'portal_1', fromDate, toDate) {
  const creds = getNocCredentials(portalKey);
  if (!creds.userName || !creds.password) {
    return [];
  }

  try {
    // 1. Fetch Login Page to retrieve ASP.NET ViewState & Session Cookie
    const getRes = await fetch('https://shipnoc.com/login.aspx', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const getHtml = await getRes.text();
    const setCookies = getRes.headers.get('set-cookie')?.split(';')[0] || '';

    const vs = getHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const vsg = getHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
    const ev = getHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

    const params = new URLSearchParams();
    params.set('__VIEWSTATE', vs);
    params.set('__VIEWSTATEGENERATOR', vsg);
    params.set('__EVENTVALIDATION', ev);
    params.set('txtLoginName', creds.userName);
    params.set('txtPassword', creds.password);
    params.set('btnLogin', 'Login');

    // 2. Submit Login
    const loginRes = await fetch('https://shipnoc.com/login.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': setCookies,
        'User-Agent': 'Mozilla/5.0',
      },
      body: params.toString(),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const sessionCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || setCookies;

    // 3. Fetch UserDashboard.aspx to get dashboard viewstate
    const dashGet = await fetch('https://shipnoc.com/UserDashboard.aspx', {
      headers: { 'Cookie': sessionCookie, 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    const dashHtml = await dashGet.text();
    const dVs = dashHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const dVsg = dashHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
    const dEv = dashHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

    // Calculate search date range (default to last 45 days)
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);

    const searchParams = new URLSearchParams();
    searchParams.set('__VIEWSTATE', dVs);
    searchParams.set('__VIEWSTATEGENERATOR', dVsg);
    searchParams.set('__EVENTVALIDATION', dEv);
    searchParams.set('ctl00$ContentPlaceHolder1$txtfromdate', fromDate || defaultFrom);
    searchParams.set('ctl00$ContentPlaceHolder1$txttodate', toDate || defaultTo);
    searchParams.set('ctl00$ContentPlaceHolder1$btnseacrh', 'Search');

    // 4. Submit Search
    const searchRes = await fetch('https://shipnoc.com/UserDashboard.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0',
      },
      body: searchParams.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });

    const resultHtml = await searchRes.text();
    const trMatches = resultHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

    // Extract table header indices if present
    const headerMap = {};
    const thMatches = resultHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
    if (thMatches.length > 0) {
      thMatches.forEach((th, idx) => {
        const text = th.replace(/<[^>]+>/g, '').trim().toLowerCase();
        if (text.includes('courier')) headerMap.courier = idx;
        if (text.includes('parcel') || text.includes('cn') || text.includes('tracking')) headerMap.parcelNo = idx;
        if (text.includes('third') || text.includes('3rd') || text.includes('reference')) headerMap.thirdPartyNo = idx;
        if (text.includes('current status') || (text.includes('status') && !text.includes('date') && !text.includes('time'))) headerMap.status = idx;
        if (text.includes('consignee') || text.includes('customer') || text.includes('name')) headerMap.consignee = idx;
        if (text.includes('city') || text.includes('destination')) headerMap.city = idx;
        if (text.includes('date') || text.includes('time')) headerMap.date = idx;
      });
    }

    const parsedRows = [];
    for (const tr of trMatches) {
      const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (tdMatches.length >= 5) {
        const cleanTds = tdMatches.map((td) => td.replace(/<[^>]+>/g, '').trim());
        const courier = headerMap.courier !== undefined ? cleanTds[headerMap.courier] : cleanTds[2];
        const parcelNo = headerMap.parcelNo !== undefined ? cleanTds[headerMap.parcelNo] : cleanTds[3];
        const thirdPartyNo = headerMap.thirdPartyNo !== undefined ? cleanTds[headerMap.thirdPartyNo] : cleanTds[4];
        const consignee = headerMap.consignee !== undefined ? cleanTds[headerMap.consignee] : cleanTds[6];
        const city = headerMap.city !== undefined ? cleanTds[headerMap.city] : cleanTds[8];

        let currentStatus = headerMap.status !== undefined ? cleanTds[headerMap.status] : '';
        let statusDate = headerMap.date !== undefined ? cleanTds[headerMap.date] : '';

        // If currentStatus was mistakenly populated with a date string, discard it
        if (currentStatus && currentStatus.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
          if (!statusDate) statusDate = currentStatus;
          currentStatus = '';
        }

        // Search specifically for status keywords across all td cells
        if (!currentStatus) {
          for (const td of cleanTds) {
            const upper = td.toUpperCase();
            if (td.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) continue; // skip date cells
            if (
              upper === 'INTRANSIT' ||
              upper === 'IN TRANSIT' ||
              upper === 'DELIVERED' ||
              upper === 'RECEIVED AT OFFICE' ||
              upper === 'OUT FOR DELIVERY' ||
              upper === 'RUNSHEET' ||
              upper === 'RUNSHEET DISPATCHED' ||
              upper === 'RETURN TO ORIGIN' ||
              upper === 'RETURN' ||
              upper === 'PAYMENT DONE' ||
              upper === 'UNDELIVERED' ||
              upper === 'BOOKED' ||
              upper.includes('TRANSIT') ||
              upper.includes('DELIVER') ||
              upper.includes('OFFICE') ||
              upper.includes('RETURN')
            ) {
              currentStatus = td;
              break;
            }
          }
        }

        if (!statusDate) {
          for (const td of cleanTds) {
            if (td.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/)) {
              statusDate = td;
              break;
            }
          }
        }

        if (parcelNo && (parcelNo.match(/^\d+$/) || parcelNo.length > 5)) {
          const is3rdPartyValid =
            thirdPartyNo &&
            thirdPartyNo !== 'N/A' &&
            thirdPartyNo !== 'NA' &&
            thirdPartyNo.toLowerCase() !== 'null' &&
            thirdPartyNo.toLowerCase() !== 'undefined';

          parsedRows.push({
            courier: courier || 'NOC',
            parcelNo: parcelNo.trim(),
            thirdPartyNo: is3rdPartyValid ? thirdPartyNo.trim() : '',
            status: currentStatus && !currentStatus.match(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/) ? currentStatus.trim() : '',
            statusDate: statusDate ? statusDate.trim() : '',
            consignee: consignee || '',
            city: city || '',
            portalKey,
          });
        }
      }
    }

    return parsedRows;
  } catch (err) {
    console.error(`[NOC Portal Auto-Scrape Error] Failed to fetch portal dashboard for ${portalKey}:`, err);
    return [];
  }
}
