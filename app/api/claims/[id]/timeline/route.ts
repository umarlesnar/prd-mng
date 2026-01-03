import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Claim } from '@/models/Claim';
import { z } from 'zod';

const timelineSchema = z.object({
  action: z.string(),
  notes: z.string().optional(),
});

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    // 1. Extract User ID from Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const { getAuthenticatedUserId } = await import('@/lib/auth-helpers');
    const userId = getAuthenticatedUserId(req);

    const body = await req.json();
    const { action, notes } = timelineSchema.parse(body);

    const claim = await Claim.findByIdAndUpdate(
      id,
      {
        $push: {
          timeline_events: {
            timestamp: new Date(),
            action,
            user_id: userId, // FIXED: Uses valid ObjectId from token
            notes,
          },
        },
      },
      { new: true }
    );

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    return NextResponse.json({ claim });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const POST = handler;