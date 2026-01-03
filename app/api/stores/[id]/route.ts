import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Store } from '@/models/Store';
import { StoreUser } from '@/models/StoreUser';
import { logAudit } from '@/lib/audit-logger';
import { uploadBase64File } from '@/lib/file-uploader';

async function getHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    
    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    
    const store = await Store.findById(id);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Verify user has access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // User account - verify they own the store or have access via store user
      if (store.owner_user_id.toString() !== authContext.userId) {
        // Check if they have a store user in this store
        const storeUser = await StoreUser.findOne({
          user_account_id: authContext.userId,
          store_id: id,
        });
        if (!storeUser) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function putHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    
    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);

    // Verify user is admin of this store
    let storeUser;
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== id || authContext.storeUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can update store settings' }, { status: 403 });
      }
      storeUser = authContext.storeUser;
    } else {
      // User account - check if they own the store or are admin store user
      const store = await Store.findById(id);
      if (store?.owner_user_id.toString() !== authContext.userId) {
        storeUser = await StoreUser.findOne({
          user_account_id: authContext.userId,
          store_id: id,
          role: 'admin',
        });
        if (!storeUser) {
          return NextResponse.json({ error: 'Only admin users can update store settings' }, { status: 403 });
        }
      }
    }

    const oldStore = await Store.findById(id);
    if (!oldStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    let body = await req.json();

    // If store_logo is a base64 string, upload it and get the path
    if (body.store_logo && body.store_logo.startsWith('data:image')) {
      try {
        const logoPath = await uploadBase64File(
          body.store_logo, 
          `store-logo-${id}.png`, 
          'logos'
        );
        body.store_logo = logoPath;
      } catch (uploadError: any) {
        console.error('Failed to upload logo:', uploadError);
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 400 });
      }
    }

    const store = await Store.findByIdAndUpdate(id, body, { new: true });

    await logAudit({
      userId: authContext.userId,
      storeId: store!._id,
      entity: 'stores',
      entityId: store!._id,
      action: 'update',
      oldValue: oldStore,
      newValue: store,
    });

    return NextResponse.json({ store });
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

    // Only user_accounts who own the store can delete it
    if (authContext.accountType !== 'user_account') {
      return NextResponse.json({ error: 'Only store owners can delete stores' }, { status: 403 });
    }

    const store = await Store.findById(id);
    if (!store || store.owner_user_id.toString() !== authContext.userId) {
      return NextResponse.json({ error: 'Only store owners can delete stores' }, { status: 403 });
    }

    const deletedStore = await Store.findByIdAndDelete(id);
    if (!deletedStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await logAudit({
      userId: authContext.userId,
      storeId: deletedStore._id,
      entity: 'stores',
      entityId: deletedStore._id,
      action: 'delete',
      oldValue: deletedStore,
    });

    return NextResponse.json({ message: 'Store deleted' });
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