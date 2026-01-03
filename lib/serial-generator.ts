import { Store } from '@/models/Store';
import { ProductItem } from '@/models/ProductItem';
import { Types } from 'mongoose';

function generateRandomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateSerialNumber(
  storeId: string | Types.ObjectId
): Promise<{
  serial_number: string;
  serial_prefix_used: string;
  serial_suffix_used: string;
}> {
  const store = await Store.findById(storeId);

  if (!store) {
    throw new Error('Store not found');
  }

  let isUnique = false;
  let serial_number = '';
  const maxRetries = 50;
  let attempts = 0;

  while (!isUnique && attempts < maxRetries) {
    const randomAlpha = generateRandomAlphanumeric(6);
    serial_number = `${store.serial_prefix}${randomAlpha}${store.serial_suffix || ''}`;

    const existing = await ProductItem.findOne({ serial_number });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique serial number after multiple attempts');
  }
  
  return {
    serial_number,
    serial_prefix_used: store.serial_prefix,
    serial_suffix_used: store.serial_suffix || '',
  };
}

export async function generateBulkSerialNumbers(
  storeId: string | Types.ObjectId,
  quantity: number
): Promise<{
  serial_number: string;
  serial_prefix_used: string;
  serial_suffix_used: string;
}[]> {
  const store = await Store.findById(storeId);
  if (!store) {
    throw new Error('Store not found');
  }

  const batchSize = 100;
  const results = [];
  
  for (let i = 0; i < quantity; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, quantity - i);
    const candidates = new Set<string>();
    
    // Generate unique candidates for this batch
    while (candidates.size < currentBatchSize) {
      const randomAlpha = generateRandomAlphanumeric(6);
      const serial = `${store.serial_prefix}${randomAlpha}${store.serial_suffix || ''}`;
      candidates.add(serial);
    }
    
    const candidateArray = Array.from(candidates);
    
    // Check existing serials in bulk
    const existing = await ProductItem.find(
      { serial_number: { $in: candidateArray } },
      { serial_number: 1 }
    );
    
    const existingSet = new Set(existing.map(item => item.serial_number));
    const uniqueSerials = candidateArray.filter(serial => !existingSet.has(serial));
    
    // If we don't have enough unique serials, generate more
    while (uniqueSerials.length < currentBatchSize) {
      const randomAlpha = generateRandomAlphanumeric(6);
      const serial = `${store.serial_prefix}${randomAlpha}${store.serial_suffix || ''}`;
      
      if (!existingSet.has(serial) && !uniqueSerials.includes(serial)) {
        uniqueSerials.push(serial);
      }
    }
    
    // Add to results
    for (let j = 0; j < currentBatchSize; j++) {
      results.push({
        serial_number: uniqueSerials[j],
        serial_prefix_used: store.serial_prefix,
        serial_suffix_used: store.serial_suffix || '',
      });
    }
  }
  
  return results;
}