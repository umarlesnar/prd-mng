import { NextRequest, NextResponse } from 'next/server';

export function withAuth(handler: (req: NextRequest, context: any) => Promise<NextResponse>) {
  return handler;
}
