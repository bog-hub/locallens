// app/api/feed/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import { Review } from '@/lib/models/Review';

// GET /api/feed — reviews from people you follow
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const me = await User.findById(session.user.id).lean();
    if (!me) return NextResponse.json([], { status: 200 });

    const followingIds = (me as any).following ?? [];

    // Get recent reviews from followed users + self
    const reviews = await Review.find({
      user: { $in: [...followingIds, session.user.id] },
    })
      .populate('user',     'name image reviewCount')
      .populate('business', 'name slug coverImage category averageRating')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(reviews)));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}