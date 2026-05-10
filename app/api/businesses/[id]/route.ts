// app/api/businesses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { Review } from '@/lib/models/Review';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

// Fields an owner is NEVER allowed to set directly
const PROTECTED_FIELDS = [
  'owner', 'isClaimed', 'isVerified', 'averageRating',
  'reviewCount', 'slug', 'createdAt', 'updatedAt',
];

// GET /api/businesses/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const business = await Business.findOne({
      $or: [
        ...(id.match(/^[a-f\d]{24}$/i) ? [{ _id: id }] : []),
        { slug: id },
      ],
    }).lean();
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ business: JSON.parse(JSON.stringify(business)) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
  }
}

// PUT /api/businesses/[id] — update (owner or admin only)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const business = await Business.findById(id);
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isOwner = business.owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();

    // Strip protected fields — owners cannot self-verify, change ownership, etc.
    // Admins bypass this restriction.
    const sanitised = isAdmin
      ? body
      : Object.fromEntries(
          Object.entries(body).filter(([key]) => !PROTECTED_FIELDS.includes(key))
        );

    if (Object.keys(sanitised).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await Business.findByIdAndUpdate(
      id, sanitised, { new: true, runValidators: true }
    ).lean();

    return NextResponse.json(JSON.parse(JSON.stringify(updated)));
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE /api/businesses/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const business = await Business.findById(id);
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await Business.findByIdAndDelete(id);
    await Review.deleteMany({ business: id });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}