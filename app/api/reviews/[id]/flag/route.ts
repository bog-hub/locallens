// app/api/reviews/[id]/flag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import mongoose from 'mongoose';

// How many flags before a review is auto-marked for admin review
const FLAG_THRESHOLD = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to report a review' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
    }

    await connectDB();

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Prevent users flagging their own review
    if (review.user.toString() === session.user.id) {
      return NextResponse.json({ error: 'You cannot report your own review' }, { status: 400 });
    }

    const alreadyFlagged = review.flaggedBy.map(String).includes(session.user.id);
    if (alreadyFlagged) {
      return NextResponse.json({ error: 'You have already reported this review' }, { status: 409 });
    }

    // Add flag
    review.flaggedBy.push(new mongoose.Types.ObjectId(session.user.id));
    review.flagCount = review.flaggedBy.length;

    // Auto-mark for admin attention once threshold is reached
    if (review.flagCount >= FLAG_THRESHOLD) {
      review.flagged = true;
    }

    await review.save();

    return NextResponse.json({
      success:   true,
      flagCount: review.flagCount,
      flagged:   review.flagged,
    });
  } catch (err: any) {
    console.error('[POST /api/reviews/[id]/flag]', err);
    return NextResponse.json({ error: 'Failed to report review' }, { status: 500 });
  }
}