import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductTemplate } from '@/models/ProductTemplate';
import { Batch } from '@/models/Batch';
import { ProductItem } from '@/models/ProductItem';
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

    // Get batches for this template
    const batches = await Batch.find({ product_template_id: template._id })
      .sort({ created_at: -1 });

    return NextResponse.json({ template, batches });
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
    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const authContext = await getAuthenticatedUser(req);
    const storeId = await getAuthenticatedStoreId(req);
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const storeIdString = typeof storeId === 'string' ? storeId : String(storeId);
    const { id } = await params;

    const template = await ProductTemplate.findOne({
      _id: id,
      store_id: storeIdString,
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get all batches for this template
    const batches = await Batch.find({ product_template_id: id });

    // Delete all product items for all batches
    for (const batch of batches) {
      await ProductItem.deleteMany({ batch_id: batch._id });
    }

    // Delete all batches
    await Batch.deleteMany({ product_template_id: id });

    // Delete the template
    await ProductTemplate.deleteOne({ _id: id });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'product_templates',
      entityId: template._id,
      action: 'delete',
      oldValue: template,
    });

    return NextResponse.json({ message: 'Template and all batches and items deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const DELETE = deleteHandler;
