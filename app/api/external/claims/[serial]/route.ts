import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Claim } from '@/models/Claim';
import { Warranty } from '@/models/Warranty';
import { ProductItem } from '@/models/ProductItem';
import { validateApiKey } from '@/lib/api-key-auth';
import { z } from 'zod';

const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, '').replace(/^91/, '');

const claimLookupSchema = z.object({
  customer_phone: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
}).refine(
  (data) => (data.customer_phone && data.customer_phone.trim()) || (data.customer_email && data.customer_email.trim()),
  'Either customer_phone or customer_email is required'
);

async function getHandler(req: NextRequest, { params }: { params: Promise<{ serial: string }> }) {
  try {
    const resolvedParams = await params;
    await validateApiKey(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const customerPhone = searchParams.get('customer_phone');
    const customerEmail = searchParams.get('customer_email');

    const validated = claimLookupSchema.parse({
      customer_phone: customerPhone,
      customer_email: customerEmail,
    });

    const productItem = await ProductItem.findOne({
      serial_number: resolvedParams.serial,
    });

    if (!productItem) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const warranties = await Warranty.find({
      product_id: productItem._id,
    }).populate('customer_id');

    if (warranties.length === 0) {
      return NextResponse.json(
        { error: 'Warranty not found for this product' },
        { status: 404 }
      );
    }

    let warranty = null;
    for (const w of warranties) {
      const customer = w.customer_id as any;
      let customerMatches = false;

      if (validated.customer_phone) {
        const normalizedPhone = normalizePhone(validated.customer_phone);
        customerMatches = normalizePhone(customer.phone) === normalizedPhone;
      }

      if (validated.customer_email && !customerMatches) {
        customerMatches = customer.email === validated.customer_email;
      }

      if (customerMatches) {
        warranty = w;
        break;
      }
    }

    if (!warranty) {
      return NextResponse.json(
        { error: 'Warranty not found for this product and customer' },
        { status: 404 }
      );
    }

    const claims = await Claim.find({
      warranty_id: warranty._id,
    })
      .populate('warranty_id')
      .sort({ created_at: -1 })
      .select('-__v');

    return NextResponse.json({ claims });
  } catch (error: any) {
    if (error.message.includes('API key')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
