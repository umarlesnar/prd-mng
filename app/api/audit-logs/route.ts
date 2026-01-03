import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SystemAuditLog } from '@/models/SystemAuditLog';

async function handler(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = {};
    if (storeId) query.store_id = storeId;
    if (entity) query.entity = entity;
    if (entityId) query.entity_id = entityId;
    if (userId) query.user_id = userId;

    const logs = await SystemAuditLog.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const { StoreUser } = await import('@/models/StoreUser');
    const { UserAccount } = await import('@/models/UserAccount');

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        if (log.user_id) {
          const storeUser = await StoreUser.findById(log.user_id).select('full_name email').lean();
          if (storeUser) {
            return { ...log, user_id: storeUser };
          }
          const userAccount = await UserAccount.findById(log.user_id).select('full_name email').lean();
          if (userAccount) {
            return { ...log, user_id: userAccount };
          }
        }
        return log;
      })
    );

    const total = await SystemAuditLog.countDocuments(query);

    return NextResponse.json({ logs: enrichedLogs, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = handler;
