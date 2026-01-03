import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export default s3Client;

export function getS3Config() {
  return {
    bucket: process.env.AWS_S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    isConfigured: !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    ),
  };
}

export async function uploadToS3(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function deleteFromS3(bucket: string, key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
}
