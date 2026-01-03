import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Warranty } from '@/models/Warranty';
import { Product } from '@/models/Product';

export async function GET(req: NextRequest, { params }: { params: Promise<{ serial: string }> }) {
  try {
    const { serial } = await params;
    await connectDB();
    
    const product = await Product.findOne({ serial_number: serial });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const warranty = await Warranty.findOne({ product_id: product._id })
      .populate('product_id')
      .populate('customer_id')
      .populate('store_id');

    if (!warranty) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    return NextResponse.json({ warranty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
