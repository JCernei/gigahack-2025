import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // ensure Node runtime for file handling

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('photo');

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file received' }, { status: 400 });
  }

  // Read the file bytes (Buffer) for processing/storage
  const bytes = Buffer.from(await file.arrayBuffer());

  // TODO: store `bytes` somewhere (S3, Cloud Storage, DB, filesystem, etc.)
  // For the demo we just acknowledge:
  return NextResponse.json({
    ok: true,
    filename: file.name,
    size: bytes.length,
    // url: 'https://your-storage/capture-123.jpg'
  });
}
