import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Claim } from '@/models/Claim';
import { Warranty } from '@/models/Warranty';
import { ProductItem } from '@/models/ProductItem';
import { validateApiKey } from '@/lib/api-key-auth';
import { logAudit } from '@/lib/audit-logger';
import { z } from 'zod';

const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, '').replace(/^91/, '');

const claimRegistrationSchema = z.object({
  product_serial_number: z.string().min(1, 'Product serial number is required'),
  customer_phone: z.string().optional().or(z.literal('')),
  customer_email: z.string().email().optional().or(z.literal('')),
  claim_type: z.enum(['repair', 'replacement', 'refund']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  attachments: z.array(z.string()).optional(),
}).refine(
  (data) => (data.customer_phone && data.customer_phone.trim()) || (data.customer_email && data.customer_email.trim()),
  'Either customer_phone or customer_email is required'
);

async function postHandler(req: NextRequest) {
  try {
    await validateApiKey(req);
    await connectDB();

    const body = await req.json();
    const validated = claimRegistrationSchema.parse(body);

    const productItem = await ProductItem.findOne({
      serial_number: validated.product_serial_number,
    });

    if (!productItem) {
      return NextResponse.json(
        { error: 'Product not found with the provided serial number' },
        { status: 404 }
      );
    }

    const storeId = productItem.store_id.toString();

    const warranties = await Warranty.find({
      product_id: productItem._id,
      store_id: storeId,
      status: 'active',
    }).populate('customer_id');

    if (warranties.length === 0) {
      return NextResponse.json(
        { error: 'No active warranty found for this product. Please register warranty first.' },
        { status: 404 }
      );
    }

    let warranty = null;
    for (const w of warranties) {
      const customer = w.customer_id as any;
      let customerMatches = false;

      if (validated.customer_phone) {
        const normalizedInputPhone = normalizePhone(validated.customer_phone);
        const normalizedDbPhone = normalizePhone(customer.phone);
        customerMatches = normalizedDbPhone === normalizedInputPhone;
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
        { error: 'Warranty does not exist for this customer and product combination' },
        { status: 404 }
      );
    }

    if (warranty.status !== 'active') {
      return NextResponse.json(
        { error: `Warranty is ${warranty.status}. Only active warranties can have claims.` },
        { status: 400 }
      );
    }

    const claim = await Claim.create({
      warranty_id: warranty._id,
      store_id: storeId,
      claim_type: validated.claim_type,
      description: validated.description,
      status: 'pending',
      attachments: validated.attachments || [],
      timeline_events: [
        {
          timestamp: new Date(),
          action: 'Claim created via external API',
        },
      ],
    });

    await logAudit({
      userId: warranty.user_id.toString(),
      storeId: storeId.toString(),
      entity: 'claims',
      entityId: claim._id,
      action: 'create',
      newValue: claim,
    });

    return NextResponse.json(
      { claim, message: 'Claim registered successfully' },
      { status: 201 }
    );
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
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Claim already exists for this warranty' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const POST = postHandler;
