import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Claim } from '@/models/Claim';
import { Warranty } from '@/models/Warranty';
import { claimSchema } from '@/middleware/validation';
import { logAudit } from '@/lib/audit-logger';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    // Enforce data isolation - only show claims from the authenticated user's store
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = String(storeId);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { store_id: storeIdString }; // Always filter by authenticated user's store
    
    const claims = await Claim.find(query)
      .populate({
        path: 'warranty_id',
        populate: [{ path: 'product_id' }, { path: 'customer_id' }],
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    const total = await Claim.countDocuments(query);

    return NextResponse.json({ claims, total, page, pages: Math.ceil(total / limit) });
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

    // 1. Extract User ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const authContext = await getAuthenticatedUser(req);
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = String(storeId);
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const body = await req.json();
    const validated = claimSchema.parse(body);

    const warranty = await Warranty.findById(validated.warranty_id);
    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    // Verify warranty belongs to authenticated user's store
    if (warranty.store_id.toString() !== storeIdString) {
      return NextResponse.json({ error: 'Warranty does not belong to your store' }, { status: 403 });
    }

    const claim = await Claim.create({
      ...validated,
      store_id: storeIdString,
      timeline_events: [
        {
          timestamp: new Date(),
          action: 'Claim created',
          user_id: userId,
        },
      ],
    });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'claims',
      entityId: claim._id,
      action: 'create',
      newValue: claim,
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;