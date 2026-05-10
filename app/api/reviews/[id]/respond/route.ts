// app/api/reviews/[id]/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import { Business } from '@/lib/models/Business';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const { body } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: 'Response body is required' }, { status: 400 });
    }

    const review = await Review.findById(id).populate('business');
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    // Confirm the current user owns the business
    const business = await Business.findById(review.business);
    if (!business || business.owner?.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    review.ownerResponse = { body: body.trim(), createdAt: new Date() };
    await review.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to post response' }, { status: 500 });
  }
}