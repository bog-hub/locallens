// app/api/businesses/[id]/claim/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Claim } from '@/lib/models/Claim';
import mongoose from 'mongoose';
import { rateLimit, getIP } from '@/lib/ratelimit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { validate, ClaimDocumentUploadSchema, MAGIC_BYTES, MAX_FILE_SIZE } from '@/lib/validations';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const DOC_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

type DocMime = typeof DOC_ALLOWED_TYPES[number];

const MAX_DOCS = 3;

const docUploadLimiter = new Ratelimit({
  redis:   new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! }),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix:  'rl:claim-docs',
});

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

// POST /api/businesses/[id]/claim/documents — upload one document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(docUploadLimiter, req, getIP(req));
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const labelRaw = formData.get('label');

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const labelValidation = validate(ClaimDocumentUploadSchema, { label: labelRaw });
    if (!labelValidation.success) return labelValidation.error;
    const { label } = labelValidation.data;

    if (!DOC_ALLOWED_TYPES.includes(file.type as DocMime)) {
      return NextResponse.json(
        { error: 'Accepted formats: PDF, JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match its declared type' },
        { status: 400 }
      );
    }

    const claim = await Claim.findOne({
      business: id,
      user:     session.user.id,
      status:   'verified',
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'No verified claim found. Complete OTP verification first.' },
        { status: 404 }
      );
    }

    if (claim.documents.length >= MAX_DOCS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_DOCS} documents allowed per claim` },
        { status: 400 }
      );
    }

    const base64  = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        'locallens/claim-docs',
      resource_type: 'auto',
    });

    claim.documents.push({
      url:        result.secure_url,
      publicId:   result.public_id,
      label,
      mimeType:   file.type,
      uploadedAt: new Date(),
    });

    await claim.save();

    return NextResponse.json({
      success:   true,
      documents: claim.documents,
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/businesses/[id]/claim/documents]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// PATCH /api/businesses/[id]/claim/documents — finalize claim (status → submitted)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const claim = await Claim.findOne({
      business: id,
      user:     session.user.id,
      status:   'verified',
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'No verified claim found' },
        { status: 404 }
      );
    }

    if (claim.documents.length === 0) {
      return NextResponse.json(
        { error: 'Upload at least one document before submitting' },
        { status: 400 }
      );
    }

    claim.status = 'submitted';
    await claim.save();

    return NextResponse.json({
      success: true,
      message: "Claim submitted for admin review. We'll email you when it's approved.",
    });

  } catch (err) {
    console.error('[PATCH /api/businesses/[id]/claim/documents]', err);
    return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
  }
}
