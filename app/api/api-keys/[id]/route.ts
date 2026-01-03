import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ApiKeyManagement } from '@/models/ApiKeyManagement';
import { StoreUser } from '@/models/StoreUser';
import { Store } from '@/models/Store';
import { z } from 'zod';

const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['Enabled', 'Disabled']).optional(),
  expired_at: z.string().optional(),
});

async function getHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const { id } = await params;
    const apiKey = await ApiKeyManagement.findById(id);

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify user has access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== apiKey.store_id.toString()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      const store = await Store.findById(apiKey.store_id);
      if (!store || store.owner_user_id.toString() !== authContext.userId) {
        const storeUser = await StoreUser.findOne({
          user_account_id: authContext.userId,
          store_id: apiKey.store_id,
        });
        if (!storeUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ apiKey });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function putHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();
    const validated = updateApiKeySchema.parse(body);

    const apiKey = await ApiKeyManagement.findById(id);
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify user has admin access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== apiKey.store_id.toString() || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can update API keys' }, { status: 403 });
      }
    } else {
      const storeUser = await StoreUser.findOne({
        user_account_id: authContext.userId,
        store_id: apiKey.store_id,
        role: 'admin',
      });
      if (!storeUser) {
        const store = await Store.findById(apiKey.store_id);
        if (!store || store.owner_user_id.toString() !== authContext.userId) {
          return NextResponse.json({ error: 'Only admin users can update API keys' }, { status: 403 });
        }
      }
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.expired_at !== undefined) {
      updateData.expired_at = validated.expired_at ? new Date(validated.expired_at) : null;
    }

    const updatedApiKey = await ApiKeyManagement.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return NextResponse.json({ apiKey: updatedApiKey });
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

async function deleteHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const { id } = await params;

    const apiKey = await ApiKeyManagement.findById(id);
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify user has admin access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== apiKey.store_id.toString() || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can delete API keys' }, { status: 403 });
      }
    } else {
      const storeUser = await StoreUser.findOne({
        user_account_id: authContext.userId,
        store_id: apiKey.store_id,
        role: 'admin',
      });
      if (!storeUser) {
        const store = await Store.findById(apiKey.store_id);
        if (!store || store.owner_user_id.toString() !== authContext.userId) {
          return NextResponse.json({ error: 'Only admin users can delete API keys' }, { status: 403 });
        }
      }
    }

    await ApiKeyManagement.findByIdAndDelete(id);

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const PUT = putHandler;
export const DELETE = deleteHandler;
