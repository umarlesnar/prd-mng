import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { StoreUser } from '@/models/StoreUser';
import { Store } from '@/models/Store';

async function putHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    const body = await req.json();
    
    const storeUser = await StoreUser.findById(id);
    if (!storeUser) {
      return NextResponse.json({ error: 'Store user not found' }, { status: 404 });
    }

    // Verify user has admin access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== storeUser.store_id.toString() || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can update store users' }, { status: 403 });
      }
    } else {
      const storeUserAdmin = await StoreUser.findOne({
        user_account_id: authContext.userId,
        store_id: storeUser.store_id,
        role: 'admin',
      });
      if (!storeUserAdmin) {
        const store = await Store.findById(storeUser.store_id);
        if (!store || store.owner_user_id.toString() !== authContext.userId) {
          return NextResponse.json({ error: 'Only admin users can update store users' }, { status: 403 });
        }
      }
    }

    const updatedStoreUser = await StoreUser.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ storeUser: updatedStoreUser });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function deleteHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    
    const storeUser = await StoreUser.findById(id);
    if (!storeUser) {
      return NextResponse.json({ error: 'Store user not found' }, { status: 404 });
    }

    // Verify user has admin access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== storeUser.store_id.toString() || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can delete store users' }, { status: 403 });
      }
    } else {
      const storeUserAdmin = await StoreUser.findOne({
        user_account_id: authContext.userId,
        store_id: storeUser.store_id,
        role: 'admin',
      });
      if (!storeUserAdmin) {
        const store = await Store.findById(storeUser.store_id);
        if (!store || store.owner_user_id.toString() !== authContext.userId) {
          return NextResponse.json({ error: 'Only admin users can delete store users' }, { status: 403 });
        }
      }
    }

    await StoreUser.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Store user removed' });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const PUT = putHandler;
export const DELETE = deleteHandler;
