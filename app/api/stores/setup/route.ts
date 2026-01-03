import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Store } from '@/models/Store';
import { StoreUser } from '@/models/StoreUser';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';
import { z } from 'zod';

const setupStoreSchema = z.object({
  store_name: z.string().min(1),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  serial_prefix: z.string().default('PRD'),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const storeUserId = getAuthenticatedUserId(req);
    const currentStoreUser = await StoreUser.findById(storeUserId);
    
    if (!currentStoreUser) {
      return NextResponse.json({ error: 'Store user not found' }, { status: 404 });
    }

    // Check if user already has a store
    const existingStore = await Store.findById(currentStoreUser.store_id);
    if (existingStore) {
      return NextResponse.json({ success: true, storeId: existingStore._id, message: 'Store already exists' }, { status: 200 });
    }

    const body = await req.json();
    const validated = setupStoreSchema.parse(body);

    const store = await Store.create({
      store_name: validated.store_name,
      address: validated.store_address,
      contact_phone: validated.store_phone,
      serial_prefix: validated.serial_prefix,
      owner_user_id: storeUserId,
      serial_counter: 1
    });

    // Update store user's store_id
    await StoreUser.findByIdAndUpdate(storeUserId, {
      store_id: store._id,
    });

    return NextResponse.json({ success: true, storeId: store._id }, { status: 201 });

  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
