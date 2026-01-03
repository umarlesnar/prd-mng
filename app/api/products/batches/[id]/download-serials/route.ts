import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Batch } from '@/models/Batch';
import { ProductItem } from '@/models/ProductItem';
import { ProductTemplate } from '@/models/ProductTemplate';
import { Store } from '@/models/Store';
import { generateSerialNumbersPDF } from '@/lib/serial-numbers-pdf';

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

    const template = batch.product_template_id as any;
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get all product items for this batch
    const productItems = await ProductItem.find({ batch_id: id })
      .sort({ created_at: 1 });

    const serialNumbers = productItems.map(item => item.serial_number);

    if (serialNumbers.length === 0) {
      return NextResponse.json({ error: 'No product items found in this batch' }, { status: 404 });
    }

    // Fetch store to get logo
    const store = await Store.findById(batch.store_id);

    // Generate PDF
    const pdfBuffer = await generateSerialNumbersPDF(serialNumbers, {
      brand: template.brand,
      product_model: template.product_model,
      category: template.category,
      manufacturing_date: batch.manufacturing_date.toISOString().split('T')[0],
      base_warranty_months: batch.warranty_period_months,
      store_logo: store?.store_logo,
      whatsapp_number: store?.contact_phone,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="batch-${id}-serials.pdf"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
