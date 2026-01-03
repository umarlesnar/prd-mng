import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Claim } from '@/models/Claim';
import { logAudit } from '@/lib/audit-logger';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']),
  notes: z.string().optional(),
});

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    // 1. Extract User ID from Token to ensure it's a valid ObjectId
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const { getAuthenticatedUserId } = await import('@/lib/auth-helpers');
    const userId = getAuthenticatedUserId(req);

    const body = await req.json();
    const { status, notes } = statusSchema.parse(body);

    const oldClaim = await Claim.findById(id);
    if (!oldClaim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const claim = await Claim.findByIdAndUpdate(
      id,
      {
        status,
        $push: {
          timeline_events: {
            timestamp: new Date(),
            action: `Status changed to ${status}`,
            user_id: userId, 
            notes,
          },
        },
      },
      { new: true }
    );

    // FIXED: Use actual userId for audit log as well
    await logAudit({
      userId: userId, 
      storeId: claim!.store_id,
      entity: 'claims',
      entityId: claim!._id,
      action: 'update',
      oldValue: { status: oldClaim.status },
      newValue: { status },
    });

    return NextResponse.json({ claim });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const PUT = handler;