import { NextRequest, NextResponse } from 'next/server';
import { uploadBlob } from '../../../lib/walrus';

export async function POST(request: NextRequest) {
  const { b64 } = await request.json();
  if (!b64) {
    return NextResponse.json({ error: 'b64 body required' }, { status: 400 });
  }
  try {
    const buffer = Buffer.from(b64, 'base64');
    const blobId = await uploadBlob(new Uint8Array(buffer));
    return NextResponse.json({ blobId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}