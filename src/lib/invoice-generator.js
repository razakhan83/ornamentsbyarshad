function getText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function getNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function formatCurrency(value) {
  return `Rs. ${getNumber(value).toLocaleString('en-PK')}`;
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const quantity = Math.max(1, getNumber(item?.quantity, 1));
    const unitPrice = getNumber(item?.price);

    return {
      name: getText(item?.name || item?.Name, `Item ${index + 1}`),
      image: getText(item?.image || item?.Image || item?.imageUrl),
      variant: getText(item?.variant),
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    };
  });
}

function splitLines(doc, value, width) {
  const text = getText(value);
  if (!text) return [];
  return doc.splitTextToSize(text, width);
}

async function loadImageDataUrl(url) {
  const src = getText(url);
  if (!src || typeof window === 'undefined') return null;

  try {
    const response = await fetch(src);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new window.Image();

      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
          const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
          canvas.width = sourceWidth;
          canvas.height = sourceHeight;

          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Unable to create image canvas.');
          }

          context.drawImage(image, 0, 0, sourceWidth, sourceHeight);

          const imageData = context.getImageData(0, 0, sourceWidth, sourceHeight);
          const { data } = imageData;
          let minX = sourceWidth;
          let minY = sourceHeight;
          let maxX = -1;
          let maxY = -1;

          for (let y = 0; y < sourceHeight; y += 1) {
            for (let x = 0; x < sourceWidth; x += 1) {
              const alpha = data[(y * sourceWidth + x) * 4 + 3];
              if (alpha > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }

          const hasVisiblePixels = maxX >= minX && maxY >= minY;
          const width = hasVisiblePixels ? maxX - minX + 1 : sourceWidth;
          const height = hasVisiblePixels ? maxY - minY + 1 : sourceHeight;
          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = width;
          outputCanvas.height = height;

          const outputContext = outputCanvas.getContext('2d');
          if (!outputContext) {
            throw new Error('Unable to create cropped image canvas.');
          }

          outputContext.drawImage(
            canvas,
            hasVisiblePixels ? minX : 0,
            hasVisiblePixels ? minY : 0,
            width,
            height,
            0,
            0,
            width,
            height,
          );

          const pngDataUrl = outputCanvas.toDataURL('image/png');
          URL.revokeObjectURL(objectUrl);
          resolve({
            dataUrl: pngDataUrl,
            width,
            height,
          });
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
  } catch {
    return null;
  }
}

// --- Color Palette ---------------------------------------------------------
const PALETTE = {
  text: [23, 23, 23],
  muted: [115, 115, 115],
  light: [163, 163, 163],
  line: [229, 229, 229],
  lineSoft: [243, 243, 243],
  soft: [250, 250, 250],
  white: [255, 255, 255],
  accent: [15, 118, 110],
  accentLight: [204, 251, 241],
  accentDark: [13, 87, 80],
  statusPaid: [22, 101, 52],
  statusPaidBg: [220, 252, 231],
  statusUnpaid: [146, 64, 14],
  statusUnpaidBg: [254, 243, 199],
};

// --- Drawing Helpers -------------------------------------------------------

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawLine(doc, x1, y1, x2, y2, color = PALETTE.line) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(x1, y1, x2, y2);
}

function drawText(doc, text, x, y, opts = {}) {
  const {
    size = 10,
    color = PALETTE.text,
    weight = 'normal',
    align = 'left',
    maxWidth,
  } = opts;

  doc.setFont('helvetica', weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);

  const drawOpts = { align };
  if (maxWidth) drawOpts.maxWidth = maxWidth;
  const content = Array.isArray(text)
    ? text.flat(Infinity).map((line) => String(line ?? ''))
    : String(text ?? '');
  doc.text(content, x, y, drawOpts);
}

function drawPill(doc, text, x, y, bgColor, textColor) {
  const pillW = doc.getTextWidth(text) + 16;
  const pillH = 18;
  drawRoundedRect(doc, x, y - 12, pillW, pillH, 4, bgColor);
  drawText(doc, text, x + 8, y, { size: 8, color: textColor, weight: 'bold' });
  return pillW;
}

function drawInfoSection(doc, { title, lines, x, y, width }) {
  drawText(doc, title, x, y, { size: 7.5, color: PALETTE.light, weight: 'bold' });

  let currentY = y + 12;
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : ['Not provided'];

  safeLines.forEach((line, index) => {
    const wrapped = doc.splitTextToSize(getText(line, 'Not provided'), width);
    drawText(doc, wrapped, x, currentY, {
      size: index === 0 ? 9.5 : 8.5,
      weight: index === 0 ? 'bold' : 'normal',
      color: index === 0 ? PALETTE.text : PALETTE.muted,
    });
    currentY += wrapped.length * 11 + 2;
  });

  return currentY;
}

// --- Main Generator --------------------------------------------------------

export const generateInvoice = async (order, branding = {}) => {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const items = normalizeItems(order?.items);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(getNumber(order?.totalAmount, subtotal), subtotal);
  const shipping = Math.max(total - subtotal, 0);

  const paymentMethod = getText(order?.paymentStatus, 'COD');
  const invoiceNumber = getText(order?.orderId, 'Draft');
  const storeName = getText(branding?.storeName || order?.storeName, 'Ornaments by Arshad');
  const supportEmail = getText(branding?.supportEmail, 'support@ornamentsbyarshad.com');
  const businessAddress = getText(branding?.businessAddress, 'Business address not available');
  const customerName = getText(order?.customerName, 'Customer');
  const customerPhone = getText(order?.customerPhone);
  const customerEmail = getText(order?.customerEmail);
  const customerAddress = getText(order?.customerAddress, 'Address not provided');
  const customerCity = getText(order?.customerCity);
  const landmark = getText(order?.landmark);
  const notes = getText(order?.notes);
  const baseUrl = getText(
    branding?.baseUrl,
    typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ornamentsbyarshad.com'),
  );
  const logoUrl = getText(branding?.darkLogoUrl || branding?.lightLogoUrl);
  const invoiceLogoScalePercent = Math.min(200, Math.max(40, getNumber(branding?.invoiceLogoScalePercent, 100)));
  const invoiceLogoScale = invoiceLogoScalePercent / 100;
  const issueDate = formatDate(order?.createdAt);
  const dueDate = formatDate(order?.dueDate || order?.createdAt);

  doc.setFillColor(...PALETTE.white);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const recipientLines = [
    customerName,
    ...splitLines(doc, customerAddress, 240),
    customerCity,
    landmark ? `Landmark: ${landmark}` : '',
    customerPhone ? `Phone: ${customerPhone}` : '',
    customerEmail ? `Email: ${customerEmail}` : '',
  ].filter(Boolean);

  function drawTableHeader(y) {
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 24, 'F');
    drawLine(doc, margin, y, pageWidth - margin, y, PALETTE.line);
    drawLine(doc, margin, y + 24, pageWidth - margin, y + 24, PALETTE.line);

    drawText(doc, '#', margin + 6, y + 16, { size: 9, weight: 'bold' });
    drawText(doc, 'Description', margin + 34, y + 16, { size: 9, weight: 'bold' });
    drawText(doc, 'Qty', pageWidth - margin - 170, y + 16, { size: 9, weight: 'bold', align: 'right' });
    drawText(doc, 'Unit Price', pageWidth - margin - 90, y + 16, { size: 9, weight: 'bold', align: 'right' });
    drawText(doc, 'Amount', pageWidth - margin - 6, y + 16, { size: 9, weight: 'bold', align: 'right' });
  }

  function startNewPage() {
    doc.addPage();
    doc.setFillColor(...PALETTE.white);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  let y = margin;

  const logoDataUrl = await loadImageDataUrl(logoUrl);
  let logoHeight = 0;
  if (logoDataUrl?.dataUrl) {
    const maxLogoWidth = 92 * invoiceLogoScale;
    const maxLogoHeight = 30 * invoiceLogoScale;
    const widthRatio = maxLogoWidth / Math.max(1, logoDataUrl.width || maxLogoWidth);
    const heightRatio = maxLogoHeight / Math.max(1, logoDataUrl.height || maxLogoHeight);
    const scale = Math.min(widthRatio, heightRatio, 1);
    const renderWidth = Math.max(46, (logoDataUrl.width || maxLogoWidth) * scale);
    const renderHeight = Math.max(15, (logoDataUrl.height || maxLogoHeight) * scale);
    logoHeight = renderHeight;

    doc.addImage(
      logoDataUrl.dataUrl,
      'PNG',
      margin,
      y,
      renderWidth,
      renderHeight,
      undefined,
      'FAST',
    );
  }

  drawText(doc, 'Invoice', pageWidth - margin, y + 14, {
    size: 24,
    weight: 'bold',
    color: PALETTE.text,
    align: 'right',
  });
  drawText(doc, `Invoice No.: ${invoiceNumber}`, pageWidth - margin, y + 36, {
    size: 10,
    color: PALETTE.text,
    align: 'right',
  });
  drawText(doc, `Date: ${issueDate}`, pageWidth - margin, y + 52, {
    size: 10,
    color: PALETTE.text,
    align: 'right',
  });
  drawText(doc, `Due Date: ${dueDate}`, pageWidth - margin, y + 68, {
    size: 10,
    color: PALETTE.text,
    align: 'right',
  });

  y = y + 108;
  drawText(doc, 'Recipient:', margin, y, {
    size: 10,
    weight: 'bold',
    color: PALETTE.text,
  });
  drawText(doc, recipientLines, margin, y + 16, {
    size: 9.5,
    color: PALETTE.text,
    maxWidth: contentWidth * 0.55,
  });

  y += 16 + recipientLines.length * 12 + 20;

  drawTableHeader(y);
  y += 24;

  if (!items.length) {
    drawLine(doc, margin, y + 22, pageWidth - margin, y + 22, PALETTE.line);
    drawText(doc, 'No items found', margin + 34, y + 15, {
      size: 10,
      color: PALETTE.muted,
    });
    y += 24;
  }

  items.forEach((item, index) => {
    const descriptionLines = doc.splitTextToSize(
      [item.name, item.variant].filter(Boolean).join(item.variant ? ' - ' : ''),
      contentWidth - 220,
    );
    const rowHeight = Math.max(24, descriptionLines.length * 12 + 8);

    if (y + rowHeight + 170 > pageHeight) {
      startNewPage();
      y = margin;
      drawTableHeader(y);
      y += 24;
    }

    drawLine(doc, margin, y + rowHeight, pageWidth - margin, y + rowHeight, PALETTE.line);
    drawText(doc, String(index + 1), margin + 6, y + 15, {
      size: 9.5,
      color: PALETTE.text,
    });
    drawText(doc, descriptionLines, margin + 34, y + 15, {
      size: 9.5,
      color: PALETTE.text,
      maxWidth: contentWidth - 220,
    });
    drawText(doc, String(item.quantity), pageWidth - margin - 170, y + 15, {
      size: 9.5,
      color: PALETTE.text,
      align: 'right',
    });
    drawText(doc, formatCurrency(item.unitPrice), pageWidth - margin - 90, y + 15, {
      size: 9.5,
      color: PALETTE.text,
      align: 'right',
    });
    drawText(doc, formatCurrency(item.total), pageWidth - margin - 6, y + 15, {
      size: 9.5,
      color: PALETTE.text,
      align: 'right',
    });

    y += rowHeight;
  });

  y += 24;

  const totalsWidth = 210;
  const totalsX = pageWidth - margin - totalsWidth;
  drawLine(doc, totalsX, y, pageWidth - margin, y, PALETTE.line);
  drawText(doc, 'Subtotal:', totalsX, y + 16, { size: 10, color: PALETTE.text });
  drawText(doc, formatCurrency(subtotal), pageWidth - margin, y + 16, {
    size: 10,
    color: PALETTE.text,
    align: 'right',
  });
  drawText(doc, 'Delivery Charges:', totalsX, y + 34, { size: 10, color: PALETTE.text });
  drawText(doc, formatCurrency(shipping), pageWidth - margin, y + 34, {
    size: 10,
    color: PALETTE.text,
    align: 'right',
  });
  drawLine(doc, totalsX, y + 42, pageWidth - margin, y + 42, PALETTE.line);
  drawText(doc, 'Total:', totalsX, y + 60, { size: 11, weight: 'bold', color: PALETTE.text });
  drawText(doc, formatCurrency(total), pageWidth - margin, y + 60, {
    size: 11,
    weight: 'bold',
    color: PALETTE.text,
    align: 'right',
  });

  y += 96;

  drawText(doc, notes || 'It was a pleasure doing business with you.', margin, y, {
    size: 10,
    color: PALETTE.muted,
    maxWidth: contentWidth * 0.8,
  });

  y += 42;
  drawText(
    doc,
    [
      storeName,
      ...splitLines(doc, businessAddress, contentWidth * 0.5),
      customerPhone ? `Phone: ${customerPhone}` : '',
      supportEmail ? `Email: ${supportEmail}` : '',
      `Payment: ${paymentMethod}`,
    ].filter(Boolean),
    margin,
    y,
    {
      size: 9.5,
      color: PALETTE.text,
      maxWidth: contentWidth * 0.5,
    },
  );

  doc.save(`Invoice_${invoiceNumber}.pdf`);
};
