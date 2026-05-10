// app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import { Business } from '@/lib/models/Business';
import mongoose from 'mongoose';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user)               return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' },    { status: 403 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
    }

    const { action } = await req.json();
    if (!['unflag', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'action must be unflag or delete' }, { status: 400 });
    }

    await connectDB();
    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    if (action === 'unflag') {
      review.flagged   = false;
      review.flagCount = 0;
      review.flaggedBy = [];
      await review.save();
    }

    if (action === 'delete') {
      // Recalculate business rating after deletion
      await Review.findByIdAndDelete(id);
      const remaining = await Review.find({ business: review.business });
      const avg = remaining.length
        ? remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length
        : 0;
      await Business.findByIdAndUpdate(review.business, {
        averageRating: parseFloat(avg.toFixed(1)),
        reviewCount:   remaining.length,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[PATCH /api/admin/reviews/[id]]', err);
    return NextResponse.json({ error: err.message ?? 'Action failed' }, { status: 500 });
  }
}