import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { customerSchema } from '@/middleware/validation';
import { logAudit } from '@/lib/audit-logger';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    // Enforce data isolation - only show customers from the authenticated user's store
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { store_id: storeIdString }; // Always filter by authenticated user's store
    if (userId) query.user_id = userId;
    
    const customers = await Customer.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    const total = await Customer.countDocuments(query);

    return NextResponse.json({ customers, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'No store access available') {
      return NextResponse.json({ error: 'No store access available. Please create or select a store first.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function postHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const authContext = await getAuthenticatedUser(req);
    const storeId = await getAuthenticatedStoreId(req);
    // Ensure storeId is a string
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const body = await req.json();
    // Remove store_id from body if present (we override it)
    const { store_id, ...bodyWithoutStoreId } = body;
    const validated = { ...customerSchema.parse(bodyWithoutStoreId) }; // Don't include store_id in validated

    const customer = await Customer.create({
      ...validated,
      user_id: userId,
      store_id: storeIdString,
    });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'customers',
      entityId: customer._id,
      action: 'create',
      newValue: customer,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;
