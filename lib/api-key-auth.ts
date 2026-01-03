import { NextRequest } from 'next/server';
import { connectDB } from './db';
import { ApiKeyManagement } from '@/models/ApiKeyManagement';
import mongoose from 'mongoose';

/**
 * Validates API key from request header and returns store_id
 */
export async function validateApiKey(req: NextRequest): Promise<string> {
  await connectDB();

  const apiKey = req.headers.get('X-API-Key') || req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Check if the API key is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(apiKey)) {
    throw new Error('Invalid API key format');
  }

  const apiKeyDoc = await ApiKeyManagement.findById(apiKey);

  if (!apiKeyDoc) {
    throw new Error('Invalid API key');
  }

  if (apiKeyDoc.status !== 'Enabled') {
    throw new Error('API key is disabled');
  }

  // Check if API key has expired
  if (apiKeyDoc.expired_at && new Date(apiKeyDoc.expired_at) < new Date()) {
    throw new Error('API key has expired');
  }

  return apiKeyDoc.store_id.toString();
}
