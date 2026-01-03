import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/models/Product';
import { generateBulkSerialNumbers } from '@/lib/serial-generator';
import { logAudit } from '@/lib/audit-logger';

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
    const { quantity, product_model, category, brand, manufacturing_date, base_warranty_months } = body;

    if (!quantity || quantity < 1 || quantity > 10000) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 10000' }, { status: 400 });
    }

    if (!product_model || !category || !brand || !manufacturing_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    
    // Generate serial numbers in bulk
    const serialData = await generateBulkSerialNumbers(storeIdString, quantity);
    const serialNumbers = serialData.map(data => data.serial_number);

    // Prepare bulk insert data
    const productsToCreate = serialData.map(data => ({
      product_model,
      category,
      brand,
      manufacturing_date: new Date(manufacturing_date),
      base_warranty_months,
      user_id: userId,
      store_id: storeIdString,
      ...data,
    }));

    // Bulk insert products
    const products = await Product.insertMany(productsToCreate, { ordered: false });

    // Single audit log for the batch
    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'products',
      entityId: null,
      action: 'bulk_create',
      newValue: { quantity, product_model, category, brand },
    });

    return NextResponse.json({ products, serialNumbers, quantity }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    if (errorMessage === 'Missing authorization token' || errorMessage === 'Invalid or expired token') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create batch products' }, { status: 400 });
  }
}

export const POST = postHandler;
