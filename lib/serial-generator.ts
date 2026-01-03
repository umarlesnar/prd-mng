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
  storeId: string | Types.ObjectId,
  model?: string
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
  const maxRetries = 10;
  let attempts = 0;

  const modelPrefix = model 
    ? model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X')
    : '';

  while (!isUnique && attempts < maxRetries) {
    const randomAlpha = generateRandomAlphanumeric(8);
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const modelPart = modelPrefix ? `-${modelPrefix}-` : '';
    serial_number = `${store.serial_prefix}${modelPart}${randomAlpha}${randomNum}${store.serial_suffix || ''}`;

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