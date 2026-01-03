import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { StoreUser } from '@/models/StoreUser';
import { UserAccount } from '@/models/UserAccount';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authContext = await getAuthenticatedUser(req);

    if (authContext.accountType === 'store_user') {
      // Store user (employee)
      const storeUser = authContext.storeUser;
      // Ensure store_id is a string, not a populated object
      const storeId = storeUser.store_id?.toString ? storeUser.store_id.toString() : (typeof storeUser.store_id === 'object' ? storeUser.store_id._id?.toString() : storeUser.store_id);
      
      return NextResponse.json({ 
        user: {
          _id: storeUser._id,
          full_name: storeUser.full_name,
          email: storeUser.email,
          phone: storeUser.phone,
          role: storeUser.role,
          permissions: storeUser.permissions,
          store_id: storeId,
        },
        storeUser: {
          ...storeUser.toObject(),
          store_id: storeId,
        },
        accountType: 'store_user',
      });
    } else {
      // User account (store owner/admin)
      const userAccount = authContext.userAccount;
      const storeUser = authContext.storeUser;
      
      return NextResponse.json({ 
        user: {
          _id: userAccount._id,
          full_name: userAccount.full_name,
          email: userAccount.email,
          phone: userAccount.phone,
          business_name: userAccount.business_name,
        },
        storeUser: storeUser ? {
          _id: storeUser._id,
          store_id: storeUser.store_id?.toString ? storeUser.store_id.toString() : (typeof storeUser.store_id === 'object' ? storeUser.store_id._id?.toString() : storeUser.store_id),
          role: storeUser.role,
          permissions: storeUser.permissions,
        } : null,
        accountType: 'user_account',
      });
    }
  } catch (error: any) {
    if (error.message === 'Missing authorization token' || error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
