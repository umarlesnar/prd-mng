import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductItem } from '@/models/ProductItem';
import { productSchema } from '@/middleware/validation'; // Note: You should also update your Zod schema to expect manufacturing_date instead of purchase_date
import { generateSerialNumber } from '@/lib/serial-generator';
import { logAudit } from '@/lib/audit-logger';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    // Enforce data isolation - only show products from the authenticated user's store
    const storeId = await getAuthenticatedStoreId(req);
    
    // Ensure storeId is a string
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId'); // Optional filter by user
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { store_id: storeIdString }; // Always filter by authenticated user's store
    if (userId) query.user_id = userId;

    const products = await ProductItem.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .populate('batch_id', 'manufacturing_date warranty_period_months quantity')
      .populate('product_template_id', 'brand product_model category');

    const total = await ProductItem.countDocuments(query);

    return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit) });
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
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const body = await req.json();
    // Remove store_id from body if present - we override it with authenticated store
    const { store_id: _, ...bodyWithoutStoreId } = body;
    const validated = { ...bodyWithoutStoreId };
    
    // Ensure storeId is a string
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    
    const serialData = await generateSerialNumber(storeIdString);

    const product = await ProductItem.create({
      ...validated,
      ...serialData,
      user_id: userId,
      store_id: storeIdString,
      manufacturing_date: new Date(validated.manufacturing_date),
    });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'products',
      entityId: product._id,
      action: 'create',
      newValue: product,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;