import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
  };
}

export const signupSchema = z.object({
  // User Fields
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  
  // Store Fields (Required for signup flow)
  store_name: z.string().min(1, "Store name is required"),
  
  // Optional Fields
  business_whatsapp: z.string().optional(),
});

export const storeSchema = z.object({
  store_name: z.string().min(1),
  store_logo: z.string().optional(),
  address: z.string().optional(),
  contact_phone: z.string().optional(),
  serial_prefix: z.string().default(''),
  serial_suffix: z.string().default(''),
  whatsapp_enabled: z.boolean().default(false),
  whatsapp_number: z.string().optional(),
});

export const customerSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  address: z.string().optional(),
  gst_number: z.string().optional(),
});

export const productSchema = z.object({
  store_id: z.string(),
  product_model: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().min(1),
  purchase_date: z.string(),
  base_warranty_months: z.number().min(1).default(12),
});

export const warrantySchema = z.object({
  product_id: z.string(),
  customer_id: z.string(),
  warranty_start: z.string(),
});

export const claimSchema = z.object({
  warranty_id: z.string(),
  claim_type: z.enum(['repair', 'replacement', 'refund']),
  description: z.string().min(1),
});