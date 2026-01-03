import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ApiKeyManagement } from '@/models/ApiKeyManagement';
import { StoreUser } from '@/models/StoreUser';
import { Store } from '@/models/Store';
import { z } from 'zod';

const apiKeySchema = z.object({
  store_id: z.string(),
  name: z.string().min(1, 'Name is required'),
  expired_at: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    
    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Verify user has access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== storeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // User account - check if they own the store or have access via store user
      const store = await Store.findById(storeId);
      if (!store || store.owner_user_id.toString() !== authContext.userId) {
        const storeUser = await StoreUser.findOne({
          user_account_id: authContext.userId,
          store_id: storeId,
        });
        if (!storeUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
      }
    }

    const apiKeys = await ApiKeyManagement.find({ store_id: storeId })
      .sort({ created_at: -1 });

    return NextResponse.json({ apiKeys });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function postHandler(req: NextRequest) {
  try {
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = apiKeySchema.parse(body);

    // Verify user has admin access to this store
    if (authContext.accountType === 'store_user') {
      // Store user - check if they're admin of this store
      if (authContext.storeId !== validated.store_id || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can create API keys' }, { status: 403 });
      }
    } else {
      // User account - check if they own the store or are admin store user
      const storeUser = await StoreUser.findOne({
        user_account_id: authContext.userId,
        store_id: validated.store_id,
        role: 'admin',
      });
      if (!storeUser) {
        // Check if they own the store
        const store = await Store.findById(validated.store_id);
        if (!store || store.owner_user_id.toString() !== authContext.userId) {
          return NextResponse.json({ error: 'Only admin users can create API keys' }, { status: 403 });
        }
      }
    }

    const apiKey = await ApiKeyManagement.create({
      store_id: validated.store_id,
      name: validated.name,
      status: 'Enabled',
      expired_at: validated.expired_at ? new Date(validated.expired_at) : undefined,
    });

    // The _id of the API key is the actual API key that external systems will use
    return NextResponse.json({ 
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        store_id: apiKey.store_id,
        status: apiKey.status,
        expired_at: apiKey.expired_at,
        created_at: apiKey.created_at,
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;
