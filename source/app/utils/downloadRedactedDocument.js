import { PDFDocument } from 'pdf-lib';
import { pdfjs } from 'react-pdf';

export const ExportTypes = {
  PDF: 'pdf',
  PNG: 'png',
};

const getMimeTypeFromExportType = (exportType) => {
  switch (exportType) {
    case ExportTypes.PDF:
      return 'application/pdf';
    case ExportTypes.PNG:
      return 'image/png';
  }
};

export const downloadRedactedDocument = async (document, type) => {
  const blob = await getDocumentBlob(document, type);

  const a = window.document.createElement('a');
  a.href = URL.createObjectURL(blob, { type: getMimeTypeFromExportType(type) });
  a.target = '_blank';
  a.style.display = 'none';
  a.download = document.objectName
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, `-REDACTED.${type}`);
  a.click();
};

const getDocumentBlob = (document, type) => {
  switch (type) {
    case ExportTypes.PDF:
      return getPDFBlob(document);
    case ExportTypes.PNG:
      return getPNGBlob(document);
  }

  throw new Error(`Invalid export type: ${type}`);
};

const getRedactedDocumentCanvases = async (document) => {
  const pdfDoc = await pdfjs.getDocument(document.searchablePdfURL).promise;

  // canvas for each page so we can draw redactions relative to each page's dimensions
  return Promise.all(
    Array(pdfDoc.numPages)
      .fill(null)
      .map(async (_, i) => {
        const page = await pdfDoc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1 });

        const canvas = window.document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport }).promise;

        const pageRedactions = document.redactions ? document.redactions[i + 1] : null;

        if (pageRedactions) {
          context.fillStyle = '#000';
          const margin = 2;

          Object.values(pageRedactions).forEach((redaction) => {
            context.fillRect(
              redaction.Left * canvas.width - margin,
              redaction.Top * canvas.height - margin,
              redaction.Width * canvas.width + 2 * margin,
              redaction.Height * canvas.height + 2 * margin,
            );
          });
        }

        return canvas;
      }),
  );
};

const getPDFBlob = async (document) => {
  const pdfDoc = await PDFDocument.create();

  const redactedDocumentPNGs = await getRedactedDocumentCanvases(document).then((canvases) =>
    Promise.all(
      canvases.map(
        (canvas) =>
          new Promise((resolve) =>
            canvas.toBlob(async (blob) => {
              const arrayBuffer = await blob.arrayBuffer();
              const png = await pdfDoc.embedPng(arrayBuffer);
              resolve(png);
            }),
          ),
      ),
    ),
  );

  redactedDocumentPNGs.forEach((png) => {
    const page = pdfDoc.addPage([png.width, png.height]);
    page.drawImage(png);
  });

  const redactedPdfBytes = await pdfDoc.save();

  return new Blob([redactedPdfBytes.buffer]);
};

const getPNGBlob = async (document) => {
  const pageCanvases = await getRedactedDocumentCanvases(document);

  // combine pages
  const canvas = window.document.createElement('canvas');

  const heights = pageCanvases.map((canvas) => canvas.height);
  const totalHeight = heights.reduce((total, height) => total + height, 0);

  const widths = pageCanvases.map((canvas) => canvas.width);

  canvas.height = totalHeight;
  canvas.width = Math.max(...widths);

  const startingYs = [];
  heights.forEach((height, i) => startingYs.push(i === 0 ? 0 : height + startingYs[i - 1]));

  const context = canvas.getContext('2d');

  pageCanvases.forEach((pageCanvas, i) => {
    context.drawImage(pageCanvas, 0, startingYs[i]);
  });

  return new Promise((resolve) => canvas.toBlob(resolve));
};
