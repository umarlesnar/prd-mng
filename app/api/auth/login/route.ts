import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount } from '@/models/UserAccount';
import { StoreUser } from '@/models/StoreUser';
// Import Store model for side-effects (registration)
import '@/models/Store'; 
import { comparePassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  store_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password, store_id } = loginSchema.parse(body);

    const emailLower = email.toLowerCase();

    // First, try to find in user_accounts (store owners/admins)
    const userAccount = await UserAccount.findOne({ email: emailLower });
    
    if (userAccount) {
      const isValid = await comparePassword(password, userAccount.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Find store user for this user account
      // Note: populate('store_id') requires the Store model to be registered
      const storeUser = await StoreUser.findOne({ 
        user_account_id: userAccount._id,
        ...(store_id ? { store_id } : {})
      }).populate('store_id');

      if (!storeUser) {
        // User account exists but no store yet
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
          accountType: 'user_account',
          needsStore: true,
        });
      }

      // User account with store - return both
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
        storeUser: {
          id: storeUser._id,
          store_id: storeUser.store_id,
          full_name: storeUser.full_name,
          email: storeUser.email,
          phone: storeUser.phone,
          role: storeUser.role,
          permissions: storeUser.permissions,
        },
        store: storeUser.store_id,
        accountType: 'user_account',
      });
    }

    // If not found in user_accounts, check store_users (employees)
    const query: any = { email: emailLower };
    if (store_id) {
      query.store_id = store_id;
    }

    const storeUser = await StoreUser.findOne(query).populate('store_id');
    
    if (!storeUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await comparePassword(password, storeUser.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate token with store user ID
    const token = generateToken(`store_user_${storeUser._id.toString()}`);

    return NextResponse.json({
      token,
      storeUser: {
        id: storeUser._id,
        store_id: storeUser.store_id,
        full_name: storeUser.full_name,
        email: storeUser.email,
        phone: storeUser.phone,
        role: storeUser.role,
        permissions: storeUser.permissions,
      },
      store: storeUser.store_id,
      accountType: 'store_user',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}