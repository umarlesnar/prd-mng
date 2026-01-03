import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { StoreUser } from '@/models/StoreUser';
import { Store } from '@/models/Store'; // Use static import
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const storeUserSchema = z.object({
  store_id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  password: z.string().min(6),
  role: z.enum(['admin', 'manager', 'staff']),
  permissions: z.array(z.string()).default([]),
});

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    
    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    const authContext = await getAuthenticatedUser(req);
    
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('store_id') || await getAuthenticatedStoreId(req);

    if (!storeId) {
        return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Verify user has access to this store
    if (authContext.accountType === 'store_user') {
      if (authContext.storeId !== storeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    } else {
      // User account - verify they own the store or have a store user in it
      if (authContext.storeId !== storeId && !authContext.storeUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Only return store users from the same store
    const storeUsers = await StoreUser.find({ store_id: storeId })
      .populate('store_id', 'store_name')
      .select('-password_hash')
      .sort({ created_at: -1 });

    return NextResponse.json({ storeUsers });
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
    const validated = storeUserSchema.parse(body);

    // Verify the store exists and user has access
    const store = await Store.findById(validated.store_id);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to create store users for this store
    if (authContext.accountType === 'store_user') {
      // Store user - must be admin of the same store
      if (authContext.storeId !== validated.store_id) {
        return NextResponse.json(
          { error: 'Unauthorized access to this store' },
          { status: 403 }
        );
      }
      if (authContext.storeUser?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admin users can create store users' },
          { status: 403 }
        );
      }
    } else {
      // User account - must own the store or be admin in it
      if (store.owner_user_id.toString() !== authContext.userId) {
        // Check if they have a store user with admin role in this store
        const storeUser = await StoreUser.findOne({
          user_account_id: authContext.userId,
          store_id: validated.store_id,
        });
        if (!storeUser || storeUser.role !== 'admin') {
          return NextResponse.json(
            { error: 'Unauthorized access to this store' },
            { status: 403 }
          );
        }
      }
    }

    // Check if email is already used in this store
    const existingStoreUser = await StoreUser.findOne({
      store_id: validated.store_id,
      email: validated.email.toLowerCase(),
    });

    if (existingStoreUser) {
      return NextResponse.json({ error: 'Email is already registered in this store' }, { status: 400 });
    }

    // Hash password and create store user
    const hashedPassword = await hashPassword(validated.password);

    const storeUser = await StoreUser.create({
      store_id: validated.store_id,
      full_name: validated.full_name,
      email: validated.email.toLowerCase(),
      phone: validated.phone,
      password_hash: hashedPassword,
      role: validated.role,
      permissions: validated.permissions || [],
    });

    // Return store user without password hash
    const storeUserResponse = storeUser.toObject();
    const { password_hash, ...storeUserWithoutPassword } = storeUserResponse;

    return NextResponse.json({ storeUser: storeUserWithoutPassword }, { status: 201 });

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