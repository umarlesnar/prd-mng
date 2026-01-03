import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount } from '@/models/UserAccount';
import { Store } from '@/models/Store';
import { StoreUser } from '@/models/StoreUser';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const simpleSignupSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  store_name: z.string().min(1, "Store name is required"),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  serial_prefix: z.string().default('PRD'),
  serial_suffix: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const validated = simpleSignupSchema.parse(body);

    // Check if email already exists in user_accounts
    const existingUser = await UserAccount.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({
        error: 'Email already exists. Please login instead.',
      }, { status: 400 });
    }

    const password_hash = await hashPassword(validated.password);

    // Step 1: Create user account (main account)
    const userAccount = await UserAccount.create({
      full_name: validated.full_name,
      email: validated.email.toLowerCase(),
      phone: validated.phone,
      password_hash,
      business_name: validated.store_name,
    });

    // Step 2: Create store with owner_user_id pointing to user_account
    const store = await Store.create({
      store_name: validated.store_name,
      address: validated.store_address,
      contact_phone: validated.store_phone,
      serial_prefix: validated.serial_prefix,
      serial_suffix: validated.serial_suffix || '',
      owner_user_id: userAccount._id,
      serial_counter: 1,
    });

    // Step 3: Create store user (admin) linked to user_account
    const storeUser = await StoreUser.create({
      store_id: store._id,
      user_account_id: userAccount._id,
      full_name: validated.full_name,
      email: validated.email.toLowerCase(),
      phone: validated.phone,
      password_hash,
      role: 'admin',
      permissions: ['all'],
    });

    // Generate token with user_account ID (for user_account login)
    const token = generateToken(userAccount._id.toString());

    return NextResponse.json({
      token,
      user: {
        id: userAccount._id,
        email: userAccount.email,
        full_name: userAccount.full_name,
        phone: userAccount.phone,
        business_name: userAccount.business_name,
      },
      store: {
        id: store._id,
        store_name: store.store_name,
      },
      accountType: 'user_account',
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
