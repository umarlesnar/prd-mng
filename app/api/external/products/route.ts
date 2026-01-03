import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ProductItem } from '@/models/ProductItem';
import { validateApiKey } from '@/lib/api-key-auth';

async function getHandler(req: NextRequest) {
  try {
    const storeId = await validateApiKey(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const serialNumber = searchParams.get('serial_number');

    const query: any = { store_id: storeId };
    if (serialNumber) {
      query.serial_number = serialNumber;
    }

    const products = await ProductItem.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .populate('batch_id', 'manufacturing_date warranty_period_months quantity')
      .populate('product_template_id', 'brand product_model category')
      .select('-__v');

    const total = await ProductItem.countDocuments(query);

    return NextResponse.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    if (error.message.includes('API key')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
