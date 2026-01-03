import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export async function generateQRCode(serialNumber: string): Promise<string> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${serialNumber}`;
  
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qr');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filename = `qr-${serialNumber}-${Date.now()}.png`;
    const filepath = path.join(uploadDir, filename);
    
    await QRCode.toFile(filepath, verifyUrl, {
      width: 300,
      margin: 2,
    });
    
    return `/uploads/qr/${filename}`;
  } catch (error) {
    console.warn('Failed to write QR code to filesystem, returning empty string:', error);
    return '';
  }
}

export async function generateQRCodeBuffer(serialNumber: string): Promise<Buffer> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${serialNumber}`;
  return await QRCode.toBuffer(verifyUrl, {
    width: 300,
    margin: 2,
  });
}
