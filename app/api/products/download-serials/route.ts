import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { generateSerialNumbersPDF } from '@/lib/serial-numbers-pdf';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9\-_]/g, '_');
}

async function postHandler(req: NextRequest) {
  try {
    await connectDB();
    const { getAuthenticatedStoreId } = await import('@/lib/auth-helpers');
    
    await getAuthenticatedStoreId(req);

    const body = await req.json();
    const { serialNumbers, productData } = body;

    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return NextResponse.json({ error: 'Invalid serial numbers' }, { status: 400 });
    }

    if (!productData || !productData.brand) {
      return NextResponse.json({ error: 'Missing product data' }, { status: 400 });
    }

    const pdfBuffer = await generateSerialNumbersPDF(serialNumbers, productData);

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedBrand = sanitizeFilename(productData.brand);
    const filename = `serial-numbers-${sanitizedBrand}-${timestamp}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    if (errorMessage === 'Missing authorization token' || errorMessage === 'Invalid or expired token') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 400 });
  }
}

export const POST = postHandler;
