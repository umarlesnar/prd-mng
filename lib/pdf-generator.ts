import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { generateQRCodeBuffer } from './qr-generator';

interface WarrantyCardData {
  store_name: string;
  store_logo?: string;
  store_address?: string;
  store_phone?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  product_model: string;
  brand: string;
  category: string;
  serial_number: string;
  manufacturing_date: string;
  warranty_start: string;
  warranty_end: string;
}

export async function generateWarrantyPDF(data: WarrantyCardData): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  page.drawText('WARRANTY CERTIFICATE', {
    x: 50,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0.5),
  });

  yPosition -= 40;
  page.drawText(data.store_name, { x: 50, y: yPosition, size: 16, font: fontBold });
  
  yPosition -= 20;
  if (data.store_address) {
    page.drawText(data.store_address, { x: 50, y: yPosition, size: 10, font });
    yPosition -= 15;
  }
  if (data.store_phone) {
    page.drawText(`Phone: ${data.store_phone}`, { x: 50, y: yPosition, size: 10, font });
    yPosition -= 30;
  }

  page.drawLine({ start: { x: 50, y: yPosition }, end: { x: width - 50, y: yPosition }, thickness: 1 });
  yPosition -= 30;

  page.drawText('CUSTOMER DETAILS', { x: 50, y: yPosition, size: 14, font: fontBold });
  yPosition -= 20;
  page.drawText(`Name: ${data.customer_name}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Phone: ${data.customer_phone}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  if (data.customer_email) {
    page.drawText(`Email: ${data.customer_email}`, { x: 50, y: yPosition, size: 11, font });
    yPosition -= 18;
  }
  if (data.customer_address) {
    page.drawText(`Address: ${data.customer_address}`, { x: 50, y: yPosition, size: 11, font });
    yPosition -= 30;
  } else {
    yPosition -= 20;
  }

  page.drawText('PRODUCT DETAILS', { x: 50, y: yPosition, size: 14, font: fontBold });
  yPosition -= 20;
  page.drawText(`Brand: ${data.brand}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Model: ${data.product_model}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Category: ${data.category}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`Serial Number: ${data.serial_number}`, { x: 50, y: yPosition, size: 11, font: fontBold });
  yPosition -= 18;
  page.drawText(`Manufacturing Date: ${data.manufacturing_date}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 30;

  page.drawText('WARRANTY PERIOD', { x: 50, y: yPosition, size: 14, font: fontBold });
  yPosition -= 20;
  page.drawText(`Start Date: ${data.warranty_start}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 18;
  page.drawText(`End Date: ${data.warranty_end}`, { x: 50, y: yPosition, size: 11, font });
  yPosition -= 40;

  const qrBuffer = await generateQRCodeBuffer(data.serial_number);
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  const qrDims = qrImage.scale(0.5);
  
  page.drawImage(qrImage, {
    x: width - 150,
    y: yPosition - qrDims.height,
    width: qrDims.width,
    height: qrDims.height,
  });

  page.drawText('Scan to verify warranty', {
    x: width - 150,
    y: yPosition - qrDims.height - 20,
    size: 9,
    font,
  });

  yPosition -= 100;
  page.drawText('This warranty is valid subject to terms and conditions.', {
    x: 50,
    y: yPosition,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'warranties');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filename = `warranty-${data.serial_number}-${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);
    
    await fs.writeFile(filepath, pdfBytes);
    
    return `/uploads/warranties/${filename}`;
  } catch (error) {
    console.warn('Failed to write PDF to filesystem, returning empty string:', error);
    return '';
  }
}
