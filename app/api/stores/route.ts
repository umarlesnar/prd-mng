import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Store } from '@/models/Store';
import { StoreUser } from '@/models/StoreUser';
import { storeSchema } from '@/middleware/validation';
import { logAudit } from '@/lib/audit-logger';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();

    const { getAuthenticatedUser } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);

    if (authContext.accountType === 'store_user') {
      // Store user - return their store
      const store = await Store.findById(authContext.storeId);
      if (!store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      return NextResponse.json({ stores: [store] });
    } else {
      // User account - return all stores they own
      const stores = await Store.find({ owner_user_id: authContext.userId });
      return NextResponse.json({ stores });
    }
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

    // Only user_accounts can create stores
    if (authContext.accountType !== 'user_account') {
      return NextResponse.json({ error: 'Only user accounts can create stores' }, { status: 403 });
    }

    const userAccount = authContext.userAccount;
    const body = await req.json();
    const validated = storeSchema.parse(body);

    // Create the store with owner_user_id pointing to user_account
    const store = await Store.create({
      ...validated,
      owner_user_id: userAccount._id,
    });

    // Create or update store user for this user account in the new store
    let storeUser = await StoreUser.findOne({
      user_account_id: userAccount._id,
      store_id: store._id,
    });

    if (!storeUser) {
      // Create new store user (admin) linked to user account
      storeUser = await StoreUser.create({
        store_id: store._id,
        user_account_id: userAccount._id,
        full_name: userAccount.full_name,
        email: userAccount.email,
        phone: userAccount.phone,
        password_hash: userAccount.password_hash, // Use same password
        role: 'admin',
        permissions: ['all'],
      });
    }

    await logAudit({
      userId: userAccount._id.toString(),
      storeId: store._id,
      entity: 'stores',
      entityId: store._id,
      action: 'create',
      newValue: store,
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;