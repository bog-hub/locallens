// app/api/businesses/[id]/photos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// POST /api/businesses/[id]/photos — add a photo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const { url, publicId, caption } = await req.json();

    if (!url)      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    if (!publicId) return NextResponse.json({ error: 'publicId is required' }, { status: 400 });

    const business = await Business.findByIdAndUpdate(
      id,
      {
        $push: {
          photos: {
            url,
            publicId,   // ← stored so we can delete from Cloudinary later
            caption,
            uploadedBy: session.user.id,
            createdAt:  new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/businesses/[id]/photos]', err);
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
  }
}

// DELETE /api/businesses/[id]/photos — remove a photo and delete from Cloudinary
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const { url, publicId } = await req.json();

    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    // ── 1. Verify the photo belongs to this business before deleting ──
    const business = await Business.findOne({ _id: id, 'photos.url': url });
    if (!business) {
      return NextResponse.json({ error: 'Photo not found on this business' }, { status: 404 });
    }

    // ── 2. Verify requester is the owner or an admin ──
    const isOwner = business.owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 3. Remove from MongoDB ──
    await Business.findByIdAndUpdate(id, { $pull: { photos: { url } } });

    // ── 4. Delete from Cloudinary ──
    // Use stored publicId if available, otherwise extract from URL as fallback
    const cloudinaryId = publicId ?? extractPublicId(url);
    if (cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryId);
      } catch (err) {
        // Non-fatal — DB record is already gone, log and continue
        console.error('[Cloudinary] Failed to delete asset:', cloudinaryId, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/businesses/[id]/photos]', err);
    return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 });
  }
}

/**
 * Fallback: extract Cloudinary publicId from a URL.
 * e.g. https://res.cloudinary.com/demo/image/upload/v1234/locallens/businesses/abc.jpg
 * → locallens/businesses/abc
 */
function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}