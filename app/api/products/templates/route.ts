import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductTemplate } from '@/models/ProductTemplate';
import { logAudit } from '@/lib/audit-logger';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { store_id: storeIdString };

    const templates = await ProductTemplate.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    const total = await ProductTemplate.countDocuments(query);

    return NextResponse.json({ templates, total, page, pages: Math.ceil(total / limit) });
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
    const { brand, product_model, category } = body;

    if (!brand || !product_model || !category) {
      return NextResponse.json({ error: 'Brand, model, and category are required' }, { status: 400 });
    }

    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);

    const template = await ProductTemplate.create({
      brand,
      product_model,
      category,
      user_id: userId,
      store_id: storeIdString,
    });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'product_templates',
      entityId: template._id,
      action: 'create',
      newValue: template,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;

