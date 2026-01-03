import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Batch } from '@/models/Batch';
import { ProductItem } from '@/models/ProductItem';
import { ProductTemplate } from '@/models/ProductTemplate';

async function getHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const { id } = await params;

    const batch = await Batch.findOne({
      _id: id,
      store_id: storeIdString,
    }).populate('product_template_id');

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Get all product items for this batch
    const productItems = await ProductItem.find({ batch_id: id })
      .sort({ created_at: 1 });

    return NextResponse.json({ batch, productItems });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function deleteHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const { id } = await params;

    const batch = await Batch.findOne({
      _id: id,
      store_id: storeIdString,
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Delete all product items in this batch
    await ProductItem.deleteMany({ batch_id: id });

    // Delete the batch
    await Batch.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Batch and all items deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const DELETE = deleteHandler;
