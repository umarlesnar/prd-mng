import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSerialNumbersPDF(
  serialNumbers: string[],
  productData: {
    brand: string;
    product_model: string;
    category: string;
    manufacturing_date: string;
    base_warranty_months: number;
  }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  page.drawText('PRODUCT BATCH SERIAL NUMBERS', {
    x: 50,
    y: yPosition,
    size: 20,
    font: fontBold,
    color: rgb(0, 0, 0.5),
  });

  yPosition -= 30;
  page.drawText(`Brand: ${productData.brand}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Model: ${productData.product_model}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Category: ${productData.category}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Manufacturing Date: ${productData.manufacturing_date}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Warranty: ${productData.base_warranty_months} months`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Total Units: ${serialNumbers.length}`, { x: 50, y: yPosition, size: 11, font: fontBold });
  yPosition -= 30;

  page.drawLine({ start: { x: 50, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 1 });
  yPosition -= 20;

  page.drawText('SERIAL NUMBERS', { x: 50, y: yPosition, size: 14, font: fontBold });
  yPosition -= 25;

  const itemsPerPage = 40;
  let itemCount = 0;

  for (let i = 0; i < serialNumbers.length; i++) {
    if (itemCount >= itemsPerPage) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
      itemCount = 0;
    }

    page.drawText(`${i + 1}. ${serialNumbers[i]}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: fontCourier,
    });

    yPosition -= 15;
    itemCount++;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
