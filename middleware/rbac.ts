import { NextRequest, NextResponse } from 'next/server';
import { StoreUser } from '@/models/StoreUser';

export async function checkStoreAccess(userId: string, storeId: string) {
  const storeUser = await StoreUser.findOne({ user_id: userId, store_id: storeId });
  return !!storeUser;
}

export async function checkPermission(userId: string, storeId: string, permission: string) {
  const storeUser = await StoreUser.findOne({ user_id: userId, store_id: storeId });
  
  if (!storeUser) return false;
  if (storeUser.role === 'admin') return true;
  
  return storeUser.permissions.includes(permission);
}

export function withStoreAccess(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context: any) => {
    const user = (req as any).user;
    const storeId = context.params?.storeId || req.nextUrl.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    const hasAccess = await checkStoreAccess(user.userId, storeId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return handler(req, context);
  };
}
