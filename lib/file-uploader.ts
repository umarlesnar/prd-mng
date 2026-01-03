import fs from 'fs/promises';
import path from 'path';
import { getS3Config, uploadToS3, deleteFromS3 } from './s3-config';

const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

export async function uploadFile(file: File, folder: string = 'general'): Promise<string> {
  const s3Config = getS3Config();

  if (STORAGE_TYPE === 's3' && s3Config.isConfigured) {
    return uploadFileToS3(file, folder);
  }

  // Fallback to local storage
  return uploadFileLocally(file, folder);
}

async function uploadFileLocally(file: File, folder: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, buffer);

  return `/uploads/${folder}/${filename}`;
}

async function uploadFileToS3(file: File, folder: string): Promise<string> {
  const s3Config = getS3Config();
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const key = `uploads/${folder}/${filename}`;

  try {
    const url = await uploadToS3(s3Config.bucket, key, buffer, file.type || 'application/octet-stream');
    return url;
  } catch (error) {
    console.error('S3 upload failed, falling back to local storage:', error);
    return uploadFileLocally(file, folder);
  }
}

export async function uploadBase64File(base64Data: string, filename: string, folder: string = 'general'): Promise<string> {
  const s3Config = getS3Config();

  if (STORAGE_TYPE === 's3' && s3Config.isConfigured) {
    return uploadBase64FileToS3(base64Data, filename, folder);
  }

  // Fallback to local storage
  return uploadBase64FileLocally(base64Data, filename, folder);
}

async function uploadBase64FileLocally(base64Data: string, filename: string, folder: string): Promise<string> {
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

async function uploadBase64FileToS3(base64Data: string, filename: string, folder: string): Promise<string> {
  const s3Config = getS3Config();
  const base64Image = base64Data.split(';base64,').pop();
  if (!base64Image) throw new Error('Invalid base64 data');

  const buffer = Buffer.from(base64Image, 'base64');
  const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const key = `uploads/${folder}/${sanitizedFilename}`;

  try {
    const contentType = base64Data.split(':')[1]?.split(';')[0] || 'application/octet-stream';
    const url = await uploadToS3(s3Config.bucket, key, buffer, contentType);
    return url;
  } catch (error) {
    console.error('S3 upload failed, falling back to local storage:', error);
    return uploadBase64FileLocally(base64Data, filename, folder);
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const s3Config = getS3Config();

  if (STORAGE_TYPE === 's3' && s3Config.isConfigured && filePath.includes('amazonaws.com')) {
    return deleteFileFromS3(filePath, s3Config.bucket);
  }

  // Fallback to local storage
  return deleteFileLocally(filePath);
}

async function deleteFileLocally(filePath: string): Promise<void> {
  try {
    if (filePath && filePath.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      await fs.unlink(fullPath);
    }
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.warn('Failed to delete file:', filePath, error);
  }
}

async function deleteFileFromS3(fileUrl: string, bucket: string): Promise<void> {
  try {
    // Extract key from S3 URL: https://bucket.s3.amazonaws.com/uploads/folder/filename
    const key = fileUrl.split('.s3.amazonaws.com/')[1];
    if (!key) throw new Error('Invalid S3 URL');

    await deleteFromS3(bucket, key);
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.warn('Failed to delete S3 file:', fileUrl, error);
  }
}
