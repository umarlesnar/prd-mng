import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Warranty } from '@/models/Warranty';
import { Product } from '@/models/Product';
import { Customer } from '@/models/Customer';
import { Store } from '@/models/Store';
import { warrantySchema } from '@/middleware/validation';
import { generateQRCode } from '@/lib/qr-generator';
import { generateWarrantyPDF } from '@/lib/pdf-generator';
import { calculateWarrantyEnd } from '@/lib/utils';
import { logAudit } from '@/lib/audit-logger';
import { z } from 'zod';

async function getHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    // Enforce data isolation - only show warranties from the authenticated user's store
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = String(storeId);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { store_id: storeIdString }; // Always filter by authenticated user's store
    if (userId) query.user_id = userId;

    const warranties = await Warranty.find(query)
      .populate('product_id')
      .populate('customer_id')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    const total = await Warranty.countDocuments(query);

    return NextResponse.json({ warranties, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'No store access available') {
      return NextResponse.json({ error: 'No store access available. Please create or select a store first.' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

async function postHandler(req: NextRequest) {
  try {
    await connectDB();

    // 1. Extract User ID from Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const { getAuthenticatedUser, getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    const authContext = await getAuthenticatedUser(req);
    const storeId = await getAuthenticatedStoreId(req);
    const storeIdString = String(storeId);
    const userId = authContext.accountType === 'store_user' 
      ? authContext.userId 
      : (authContext.storeUser?._id?.toString() || authContext.userId);

    const body = await req.json();
    const validated = warrantySchema.parse(body);

    const product = await Product.findById(validated.product_id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const customer = await Customer.findById(validated.customer_id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify product belongs to authenticated user's store BEFORE proceeding
    if (product.store_id.toString() !== storeIdString) {
      return NextResponse.json({ error: 'Product does not belong to your store' }, { status: 403 });
    }

    // Verify customer belongs to authenticated user's store
    if (customer.store_id.toString() !== storeIdString) {
      return NextResponse.json({ error: 'Customer does not belong to your store' }, { status: 403 });
    }

    const store = await Store.findById(product.store_id);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const warranty_start = new Date(validated.warranty_start);
    const warranty_end = calculateWarrantyEnd(warranty_start, product.base_warranty_months);

    let qr_code_url = '';
    let warranty_pdf_url = '';

    // Try to generate QR code, but don't fail if it errors
    try {
      qr_code_url = await generateQRCode(product.serial_number);
    } catch (qrError: any) {
      console.error('QR Code generation failed:', qrError.message);
    }

    // Try to generate PDF, but don't fail if it errors
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
        product_model: product.product_model,
        brand: product.brand,
        category: product.category,
        serial_number: product.serial_number,
        // Use manufacturing_date here as requested previously
        manufacturing_date: product.manufacturing_date 
          ? new Date(product.manufacturing_date).toLocaleDateString() 
          : new Date().toLocaleDateString(),
        warranty_start: warranty_start.toLocaleDateString(),
        warranty_end: warranty_end.toLocaleDateString(),
      });
    } catch (pdfError: any) {
      console.error('PDF generation failed:', pdfError.message);
    }

    const warranty = await Warranty.create({
      product_id: validated.product_id,
      customer_id: validated.customer_id,
      store_id: storeIdString,
      user_id: userId, 
      warranty_start,
      warranty_end,
      qr_code_url,
      warranty_pdf_url,
      status: 'active',
    });

    await logAudit({
      userId: userId,
      storeId: storeIdString,
      entity: 'warranties',
      entityId: warranty._id,
      action: 'create',
      newValue: warranty,
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = getHandler;
export const POST = postHandler;