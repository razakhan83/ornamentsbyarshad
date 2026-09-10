'use client';

export async function generateVisualInvoicePdf(elementId = 'printable-invoice-container', filename = 'Invoice.pdf') {
  try {
    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');

    const pages = document.querySelectorAll(`.${elementId}-page`);
    const container = document.getElementById(elementId);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Options for html-to-image with high DPI and clean rendering
    const imgOptions = {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    };

    if (pages && pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const dataUrl = await toPng(pageEl, imgOptions);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    } else if (container) {
      const dataUrl = await toPng(container, imgOptions);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgHeightMm = (img.height * pdfWidth) / img.width;

      if (imgHeightMm <= pdfHeight) {
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeightMm, undefined, 'FAST');
      } else {
        let heightLeft = imgHeightMm;
        let position = 0;

        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeightMm, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeightMm, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Visual PDF Generation Error:', error);
    throw error;
  }
}
