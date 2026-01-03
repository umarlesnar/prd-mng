import fs from 'fs/promises';
import path from 'path';

export async function uploadFile(file: File, folder: string = 'general'): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, buffer);

  return `/uploads/${folder}/${filename}`;
}

export async function uploadBase64File(base64Data: string, filename: string, folder: string = 'general'): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const base64Image = base64Data.split(';base64,').pop();
  if (!base64Image) throw new Error('Invalid base64 data');

  const buffer = Buffer.from(base64Image, 'base64');
  const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filepath = path.join(uploadDir, sanitizedFilename);

  await fs.writeFile(filepath, buffer);

  return `/uploads/${folder}/${sanitizedFilename}`;
}
