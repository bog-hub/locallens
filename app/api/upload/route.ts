// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAGIC_BYTES } from '@/lib/validations';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ── Folder-specific compression profiles ──────────────────────────────────
// Each profile defines dimensions and quality appropriate for its context.
// Cloudinary's `quality: 'auto'` and `fetch_format: 'auto'` serve WebP/AVIF
// to browsers that support it — significant storage and bandwidth savings.

const UPLOAD_PROFILES: Record<string, { transformation: object[] }> = {
  // Business cover images — landscape, high detail
  'locallens/businesses': {
    transformation: [
      { width: 1200, height: 800, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
  // Review photos — slightly smaller, still good quality
  'locallens/reviews': {
    transformation: [
      { width: 900, height: 675, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
  // User avatars — square, small
  'locallens/avatars': {
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  },
  // Generic fallback
  'locallens': {
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
};

const ALLOWED_FOLDERS = Object.keys(UPLOAD_PROFILES);

/**
 * Verify the first bytes of the file match the declared MIME type.
 * Prevents extension spoofing e.g. a .exe renamed to .jpg.
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const folder   = (formData.get('folder') as string | null) ?? 'locallens';

    // ── 1. File presence ──
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ── 2. MIME type whitelist ──
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: `File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // ── 3. File size ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
    }

    // ── 4. Folder whitelist — prevent arbitrary path injection ──
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 });
    }

    // ── 5. Magic bytes — verify actual file content matches declared type ──
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match its declared type' },
        { status: 400 }
      );
    }

    // ── 6. Upload with folder-specific compression profile ──
    const base64   = buffer.toString('base64');
    const dataUri  = `data:${file.type};base64,${base64}`;
    const profile  = UPLOAD_PROFILES[folder] ?? UPLOAD_PROFILES['locallens'];

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      ...profile,
    });

    console.log(
      `[Upload] ${folder} | original: ${(file.size / 1024).toFixed(0)}KB → ` +
      `stored: ${(result.bytes / 1024).toFixed(0)}KB | format: ${result.format}`
    );

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}