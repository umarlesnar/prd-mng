import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Warranty } from '@/models/Warranty';
import { ProductItem } from '@/models/ProductItem';
import { Customer } from '@/models/Customer';
import { Store } from '@/models/Store';
import { generateQRCode } from '@/lib/qr-generator';
import { generateWarrantyPDF } from '@/lib/pdf-generator';
import { calculateWarrantyEnd } from '@/lib/utils';
import { logAudit } from '@/lib/audit-logger';
import { validateApiKey } from '@/lib/api-key-auth';
import { z } from 'zod';

const warrantyRegistrationSchema = z.object({
  product_serial_number: z.string().min(1, 'Product serial number is required'),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional().or(z.literal('')),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_address: z.string().optional().or(z.literal('')),
}).refine(
  (data) => (data.customer_phone && data.customer_phone.trim()) || (data.customer_email && data.customer_email.trim()),
  'Either customer_phone or customer_email is required'
);

async function postHandler(req: NextRequest) {
  try {
    await validateApiKey(req);
    await connectDB();

    const body = await req.json();
    const validated = warrantyRegistrationSchema.parse(body);

    // Find product item by serial number
    const productItem = await ProductItem.findOne({
      serial_number: validated.product_serial_number,
    }).populate('batch_id').populate('product_template_id');

    if (!productItem) {
      return NextResponse.json(
        { error: 'Product not found with the provided serial number' },
        { status: 404 }
      );
    }

    const storeId = productItem.store_id.toString();
    const batch = productItem.batch_id as any;
    const template = productItem.product_template_id as any;

    // Find or create customer by phone or email
    const filterConditions: any[] = [];
    if (validated.customer_phone) filterConditions.push({ phone: validated.customer_phone });
    if (validated.customer_email) filterConditions.push({ email: validated.customer_email });

    let customer = await Customer.findOne({
      $or: filterConditions,
      store_id: storeId,
    });

    if (!customer) {
      customer = await Customer.create({
        customer_name: validated.customer_name,
        phone: validated.customer_phone || '',
        email: validated.customer_email || '',
        address: validated.customer_address || '',
        store_id: storeId,
        user_id: productItem.user_id,
      });
    } else {
      // Update customer info if provided
      if (validated.customer_name) customer.customer_name = validated.customer_name;
      if (validated.customer_phone) customer.phone = validated.customer_phone;
      if (validated.customer_email) customer.email = validated.customer_email;
      if (validated.customer_address) customer.address = validated.customer_address;
      await (customer as any).save();
    }

    // Check if warranty already exists for this product-customer combination
    const existingWarranty = await Warranty.findOne({
      product_id: productItem._id,
      customer_id: customer._id,
      store_id: storeId,
    });

    if (existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty already exists for this product', warranty: existingWarranty },
        { status: 400 }
      );
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Use product item details for warranty
    const warranty_start = new Date();
    const warranty_end = calculateWarrantyEnd(warranty_start, batch.warranty_period_months);

    // Generate QR code
    let qr_code_url = '';
    try {
      qr_code_url = await generateQRCode(productItem.serial_number);
    } catch (qrError: any) {
      console.error('QR Code generation failed:', qrError.message);
    }

    // Create warranty first
    const warranty = await Warranty.create({
      product_id: productItem._id,
      customer_id: customer._id,
      store_id: storeId,
      user_id: store.owner_user_id,
      warranty_start,
      warranty_end,
      qr_code_url,
      status: 'active',
    });

    // Generate PDF after warranty creation
    let warranty_pdf_url = '';
    try {
      warranty_pdf_url = await generateWarrantyPDF({
        store_name: store.store_name,
        store_logo: store.store_logo,
        store_address: store.address,
        store_phone: store.contact_phone,
        customer_name: customer.customer_name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        customer_address: customer.address,
        product_model: template.product_model,
        brand: template.brand,
        category: template.category,
        serial_number: productItem.serial_number,
        manufacturing_date: batch.manufacturing_date
          ? new Date(batch.manufacturing_date).toLocaleDateString()
          : new Date().toLocaleDateString(),
        warranty_start: warranty_start.toLocaleDateString(),
        warranty_end: warranty_end.toLocaleDateString(),
      });

      // Update warranty with PDF URL
      const updatedWarranty = await Warranty.findByIdAndUpdate(
        warranty._id,
        { warranty_pdf_url },
        { new: true }
      );
    } catch (pdfError: any) {
      console.error('PDF generation failed:', pdfError.message);
    }

    await logAudit({
      userId: store.owner_user_id.toString(),
      storeId: storeId.toString(),
      entity: 'warranties',
      entityId: warranty._id,
      action: 'create',
      newValue: warranty,
    });

    return NextResponse.json(
      {
        warranty,
        message: 'Warranty registered successfully',
      },
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
        { error: 'Warranty already exists for this product and customer combination' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const POST = postHandler;
