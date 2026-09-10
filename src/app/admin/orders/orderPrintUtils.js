import { PAKISTAN_CITIES } from '@/lib/cities';

export function sanitizePdfText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPrintCurrency(value) {
  return `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
}

export function formatPrintAddress(order) {
  return [order?.customerAddress, order?.customerCity].filter(Boolean).join(', ') || 'N/A';
}

export function buildPrintDocument({ title, content }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --page-bg: #eef2f7;
        --paper-bg: #ffffff;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cbd5e1;
        --line-soft: #e2e8f0;
        --panel: #f8fafc;
        --accent: #111827;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: var(--page-bg); color: var(--ink); font-family: Arial, Helvetica, sans-serif; }
      body { padding: 24px; }
      .print-shell { width: 210mm; min-height: 297mm; margin: 0 auto; background: var(--paper-bg); box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12); }
      .print-page { width: 100%; min-height: 297mm; padding: 10mm; }
      .print-page + .print-page { margin-top: 16px; }
      .page-break { break-before: page; page-break-before: always; }
      table { width: 100%; border-collapse: collapse; }
      thead { display: table-header-group; }
      tr, img, .avoid-break { break-inside: avoid; page-break-inside: avoid; }
      img { max-width: 100%; display: block; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        html, body { width: 210mm; background: #fff; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { padding: 0; }
        .print-shell { width: auto; min-height: auto; margin: 0; box-shadow: none; }
        .print-page { min-height: auto; padding: 0; }
        .print-page + .print-page { margin-top: 0; }
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

export function openPrintWindow(title) {
  if (typeof window === 'undefined') return null;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a;">Preparing print view...</body></html>`);
  printWindow.document.close();
  return printWindow;
}

export function writePrintWindow(printWindow, title, content) {
  if (!printWindow || printWindow.closed) return;
  printWindow.document.open();
  printWindow.document.write(buildPrintDocument({ title, content }));
  printWindow.document.close();
}

export const blobToPngDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new window.Image();

    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = Math.max(1, image.naturalWidth || image.width || 1);
        const height = Math.max(1, image.naturalHeight || image.height || 1);
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to create image canvas.');
        }

        context.drawImage(image, 0, 0, width, height);
        const pngDataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);
        resolve(pngDataUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image file.'));
    };

    image.src = objectUrl;
  });

export const loadImageDataUrl = async (url) => {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return null;

  try {
    const response = await fetch(safeUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToPngDataUrl(blob);
  } catch {
    return null;
  }
};

export const collectSourcingSlipData = async (ordersToExport) => {
  const sourcingMap = new Map();

  ordersToExport.forEach((order) => {
    (Array.isArray(order.items) ? order.items : []).forEach((item, index) => {
      const productKey = String(item.productId || `${item.name || 'item'}-${index}`).trim();
      const existing = sourcingMap.get(productKey) || {
        image: item.image || '',
        itemName: sanitizePdfText(item.name || 'Unnamed item'),
        totalQuantity: 0,
        vendors: [],
      };

      existing.totalQuantity += Number(item.quantity || 0);
      if (!existing.image && item.image) {
        existing.image = item.image;
      }

      if (!existing.itemName) {
        existing.itemName = sanitizePdfText(item.name || 'Unnamed item');
      }

      const vendorMap = new Map(
        existing.vendors.map((vendor) => [
          `${vendor.vendorId || vendor.name}-${vendor.vendorProductName}-${vendor.vendorPrice}`,
          vendor,
        ])
      );

      (Array.isArray(item.sourcingVendors) ? item.sourcingVendors : []).forEach((vendor) => {
        const vendorKey = `${vendor.vendorId || vendor.name}-${vendor.vendorProductName}-${vendor.vendorPrice}`;
        if (!vendorMap.has(vendorKey)) {
          vendorMap.set(vendorKey, vendor);
        }
      });

      existing.vendors = Array.from(vendorMap.values());
      sourcingMap.set(productKey, existing);
    });
  });

  const sourcingRows = Array.from(sourcingMap.values());
  const imageEntries = await Promise.all(
    sourcingRows.map(async (row) => [row.image, await loadImageDataUrl(row.image)])
  );
  const imageLookup = new Map(imageEntries);

  const grandTotalCost = sourcingRows.reduce((total, row) => {
    const vendorPrices = row.vendors
      .map((vendor) => Number(vendor.vendorPrice))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (vendorPrices.length === 0) return total;
    return total + Math.min(...vendorPrices) * Number(row.totalQuantity || 0);
  }, 0);

  return {
    sourcingRows,
    imageLookup,
    grandTotalCost,
  };
};

export const renderSourcingPrintMarkup = (ordersToExport, sourcingRows, imageLookup, grandTotalCost) => {
  const generatedAt = new Date().toLocaleString('en-PK');
  const rowsMarkup = sourcingRows.map((row) => {
    const vendorsMarkup = row.vendors.length > 0
      ? row.vendors.map((vendor) => {
          const vendorName = escapeHtml(vendor.name || 'Vendor');
          const vendorProductName = escapeHtml(vendor.vendorProductName || '');
          const priceLabel = vendor.vendorPrice != null
            ? formatPrintCurrency(vendor.vendorPrice)
            : 'Price N/A';

          return `<li><strong>${vendorName}</strong>${vendorProductName ? ` (${vendorProductName})` : ''}<span>${escapeHtml(priceLabel)}</span></li>`;
        }).join('')
      : '<li><strong>No vendor data</strong><span>Price N/A</span></li>';

    const imageMarkup = imageLookup.get(row.image)
      ? `<img src="${imageLookup.get(row.image)}" alt="${escapeHtml(row.itemName)}" />`
      : '<div class="print-sourcing-image-fallback">No image</div>';

    return `
      <tr>
        <td class="print-sourcing-image-cell">${imageMarkup}</td>
        <td class="print-sourcing-name-cell">${escapeHtml(row.itemName)}</td>
        <td>
          <ul class="print-vendor-list">${vendorsMarkup}</ul>
        </td>
        <td class="print-qty-cell">${escapeHtml(String(row.totalQuantity || 0))}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="print-shell">
      <section class="print-page">
        <style>
          .print-sourcing-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10mm; padding: 7mm; border: 1px solid var(--line); border-radius: 5mm; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); }
          .print-sourcing-header h1 { margin: 0 0 6px; font-size: 22px; }
          .print-sourcing-meta { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
          .print-sourcing-summary { min-width: 58mm; padding: 4mm; border: 1px solid var(--line-soft); border-radius: 4mm; background: var(--panel); text-align: right; }
          .print-sourcing-summary-label { margin: 0 0 4px; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
          .print-sourcing-summary-value { margin: 0; font-size: 20px; font-weight: 700; }
          .print-sourcing-table th, .print-sourcing-table td { border: 1px solid var(--line); padding: 10px; vertical-align: top; }
          .print-sourcing-table th { background: #e2e8f0; font-size: 12px; text-align: left; }
          .print-sourcing-table td { font-size: 12px; }
          .print-sourcing-image-cell { width: 32mm; }
          .print-sourcing-name-cell { width: 45mm; font-weight: 700; }
          .print-qty-cell { width: 18mm; text-align: center; font-weight: 700; }
          .print-sourcing-image-cell img, .print-sourcing-image-fallback { width: 26mm; height: 26mm; border: 1px solid var(--line-soft); border-radius: 3mm; object-fit: cover; background: #fff; }
          .print-sourcing-image-fallback { display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
          .print-vendor-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
          .print-vendor-list li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dashed var(--line-soft); padding-bottom: 4px; }
          .print-vendor-list li:last-child { border-bottom: 0; padding-bottom: 0; }
        </style>
        <header class="print-sourcing-header avoid-break">
          <div>
            <h1>Daily Sourcing Slip</h1>
            <p class="print-sourcing-meta">Generated: ${escapeHtml(generatedAt)}</p>
            <p class="print-sourcing-meta">Orders selected: ${escapeHtml(String(ordersToExport.length))}</p>
          </div>
          <div class="print-sourcing-summary">
            <p class="print-sourcing-summary-label">Grand Total Cost</p>
            <p class="print-sourcing-summary-value">${escapeHtml(formatPrintCurrency(grandTotalCost))}</p>
          </div>
        </header>
        <table class="print-sourcing-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Item / Variant</th>
              <th>Vendor List</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>${rowsMarkup}</tbody>
        </table>
      </section>
    </div>
  `;
};

export const renderPackingPrintMarkup = (selectedRecords) => {
  const slipsMarkup = selectedRecords.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsMarkup = items.map((item) => `
      <tr>
        <td>${escapeHtml(item.name || 'Unnamed item')}</td>
        <td class="packing-qty">${escapeHtml(String(Number(item.quantity || 0)))}</td>
      </tr>
    `).join('');

    return `
      <article class="packing-slip avoid-break">
        <header class="packing-slip-header">
          <h1 class="packing-slip-title">PACKING SLIP</h1>
          <div class="packing-slip-order-id">${escapeHtml(order.orderId || 'N/A')}</div>
        </header>
        <div class="packing-slip-meta avoid-break">
          <div><strong>Name:</strong> ${escapeHtml(order.customerName || 'N/A')}</div>
          <div><strong>Phone:</strong> ${escapeHtml(order.customerPhone || 'N/A')}</div>
          <div><strong>Address:</strong> ${escapeHtml(formatPrintAddress(order))}</div>
        </div>
        <table class="packing-slip-table">
          <thead>
            <tr>
              <th>Items</th>
              <th class="packing-qty">Qty</th>
            </tr>
          </thead>
          <tbody>${itemsMarkup}</tbody>
        </table>
      </article>
    `;
  }).join('');

  return `
    <div class="print-shell">
      <section class="print-page">
        <style>
          .packing-slip-list { display: grid; gap: 14px; }
          .packing-slip { border: 1px solid var(--line); border-radius: 5mm; overflow: hidden; background: #fff; }
          .packing-slip-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 5mm 6mm; background: #0f172a; color: #fff; }
          .packing-slip-title { margin: 0; font-size: 20px; letter-spacing: 0.08em; }
          .packing-slip-order-id { font-size: 14px; font-weight: 700; }
          .packing-slip-meta { display: grid; gap: 8px; padding: 6mm; border-bottom: 1px solid var(--line-soft); background: #f8fafc; font-size: 13px; }
          .packing-slip-meta strong { color: var(--ink); }
          .packing-slip-table th, .packing-slip-table td { border: 1px solid var(--line); padding: 10px 12px; font-size: 13px; text-align: left; }
          .packing-slip-table th { background: #e2e8f0; }
          .packing-qty { width: 22mm; text-align: center; font-weight: 700; }
          @media print { .packing-slip-list { gap: 10px; } }
        </style>
        <div class="packing-slip-list">${slipsMarkup}</div>
      </section>
    </div>
  `;
};
