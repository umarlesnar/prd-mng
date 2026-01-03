import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductItem } from '@/models/ProductItem';
import { Batch } from '@/models/Batch';

export async function GET(req: NextRequest, { params }: { params: Promise<{ serial: string }> }) {
  try {
    const { serial } = await params;
    await connectDB();
    const product = await ProductItem.findOne({ serial_number: serial });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ serial: string }> }) {
  try {
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    await getAuthenticatedStoreId(req);
    const { serial } = await params;
    await connectDB();
    
    const productItem = await ProductItem.findOne({ _id: serial });
    if (!productItem) {
      return NextResponse.json({ error: 'Product item not found' }, { status: 404 });
    }

    const batchId = productItem.batch_id;
    const result = await ProductItem.deleteOne({ _id: serial });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Product item not found' }, { status: 404 });
    }

    // Update batch quantity
    const remainingItems = await ProductItem.countDocuments({ batch_id: batchId });
    await Batch.findByIdAndUpdate(batchId, { quantity: remainingItems });

    return NextResponse.json({ message: 'Product item deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
