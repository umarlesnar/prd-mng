import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductTemplate } from '@/models/ProductTemplate';
import { Batch } from '@/models/Batch';
import { ProductItem } from '@/models/ProductItem';
import { generateSerialNumber } from '@/lib/serial-generator';
import { logAudit } from '@/lib/audit-logger';

async function getHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const { id } = await params;

    const template = await ProductTemplate.findOne({
      _id: id,
      store_id: storeIdString,
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const batches = await Batch.find({ product_template_id: id })
      .sort({ created_at: -1 });

    return NextResponse.json({ batches });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function postHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const authContext = await getAuthenticatedUser(req);
    const storeId = await getAuthenticatedStoreId(req);
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const body = await req.json();
    const { quantity, manufacturing_date, warranty_period_months } = body;

    if (!quantity || quantity < 1 || quantity > 10000) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 10000' }, { status: 400 });
    }

    if (!manufacturing_date || !warranty_period_months) {
      return NextResponse.json({ error: 'Manufacturing date and warranty period are required' }, { status: 400 });
    }

    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const { id } = await params;

    const template = await ProductTemplate.findOne({
      _id: id,
      store_id: storeIdString,
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create batch
    const batch = await Batch.create({
      product_template_id: id,
      store_id: storeIdString,
      user_id: userId,
      manufacturing_date: new Date(manufacturing_date),
      warranty_period_months,
      quantity,
    });

    // Generate product items for this batch
    const productItemsToCreate = [];
    const serialNumbers = [];

    for (let i = 0; i < quantity; i++) {
      const serialData = await generateSerialNumber(storeIdString, template.product_model);
      serialNumbers.push(serialData.serial_number);
      
      productItemsToCreate.push({
        batch_id: batch._id,
        product_template_id: id,
        store_id: storeIdString,
        user_id: userId,
        ...serialData,
      });
    }

    const productItems = await ProductItem.insertMany(productItemsToCreate);

    // Log audit for batch and items
    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'batches',
      entityId: batch._id,
      action: 'create',
      newValue: batch,
    });

    for (const item of productItems) {
      await logAudit({
        userId: userId,
        storeId: storeIdString,
        entity: 'product_items',
        entityId: item._id,
        action: 'create',
        newValue: item,
      });
    }

    return NextResponse.json({ 
      batch, 
      productItems, 
      serialNumbers,
      quantity 
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    if (errorMessage === 'Missing authorization token' || errorMessage === 'Invalid or expired token') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;
