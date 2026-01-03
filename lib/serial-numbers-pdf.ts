import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';

export async function generateSerialNumbersPDF(
  serialNumbers: string[],
  productData: {
    brand: string;
    product_model: string;
    category: string;
    manufacturing_date: string;
    base_warranty_months: number;
    store_logo?: string;
    whatsapp_number?: string;
  }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  /* ---------- LOGO ---------- */
  let logoImage: any = null;
  let logoW = 0;
  let logoH = 0;

  if (productData.store_logo) {
    try {
      const logoPath = path.join(process.cwd(), 'public', productData.store_logo);
      const bytes = await fs.readFile(logoPath);
      logoImage = await pdfDoc.embedPng(bytes).catch(() =>
        pdfDoc.embedJpg(bytes)
      );

      const scaled = logoImage.scale(0.09);
      logoW = scaled.width;
      logoH = scaled.height;
    } catch {}
  }

  /* ---------- GRID ---------- */
  const cardsPerPage = 10;
  const cols = 2;
  const cardWidth = 240;
  const cardHeight = 120;
  const margin = 40;
  const gap = 20;

  for (let i = 0; i < serialNumbers.length; i++) {
    const indexInPage = i % cardsPerPage;

    if (indexInPage === 0) {
      pdfDoc.addPage([595, 842]);
    }

    const page = pdfDoc.getPages().at(-1)!;
    const { height } = page.getSize();

    const col = indexInPage % cols;
    const row = Math.floor(indexInPage / cols);

    const x = margin + col * (cardWidth + gap);
    const y = height - margin - (row + 1) * (cardHeight + gap);

    /* ---------- CARD ---------- */
    page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });

    const pad = 14;
    let cursorY = y + cardHeight - 26;

    /* ---------- HEADER ---------- */
    page.drawText(`Product: ${productData.brand}`, {
      x: x + pad,
      y: cursorY,
      size: 11,
      font: fontBold,
    });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: x + cardWidth - logoW - pad,
        y: y + cardHeight - logoH - 12,
        width: logoW,
        height: logoH,
      });
    }

    cursorY -= 16;

    page.drawText(`Model: ${productData.product_model}`, {
      x: x + pad,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35),
    });

    cursorY -= 14;

    page.drawText(`Serial: ${serialNumbers[i]}`, {
      x: x + pad,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35),
    });

    /* ---------- DIVIDER ---------- */
    page.drawLine({
      start: { x: x + pad, y: y + 40 },
      end: { x: x + cardWidth - pad, y: y + 40 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });

    /* ---------- QR ---------- */
    if (productData.whatsapp_number) {
      try {
        const qr = await QRCode.toBuffer(
          `https://wa.me/${productData.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(serialNumbers[i])}`,
          { width: 70, margin: 1 }
        );
        const qrImg = await pdfDoc.embedPng(qr);

        page.drawImage(qrImg, {
          x: x + pad,
          y: y + 8,
          width: 30,
          height: 30,
        });
      } catch {}
    }

    /* ---------- FOOTER ---------- */
    page.drawText(
      `Warranty: ${productData.base_warranty_months} months`,
      {
        x: x + pad + 40,
        y: y + 20,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.45, 0.45),
      }
    );

    page.drawText(`MFD: ${productData.manufacturing_date}`, {
      x: x + cardWidth - 90,
      y: y + 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  return Buffer.from(await pdfDoc.save());
}
