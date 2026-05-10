// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';
import { Business } from '@/lib/models/Business';
import mongoose from 'mongoose';

// GET /api/bookmarks
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.user.id)
      .populate({
        path:   'bookmarks',
        model:  'Business',
        select: 'name slug coverImage category averageRating reviewCount address tags priceRange hours photos isVerified',
      })
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify((user as any)?.bookmarks ?? [])));
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

// POST /api/bookmarks — toggle a bookmark
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    // Verify the business actually exists
    const businessExists = await Business.exists({ _id: businessId });
    if (!businessExists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isBookmarked = user.bookmarks.map(String).includes(businessId);
    if (isBookmarked) {
      user.bookmarks.pull(businessId);
    } else {
      user.bookmarks.push(businessId);
    }
    await user.save();

    return NextResponse.json({ bookmarked: !isBookmarked });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to toggle bookmark' }, { status: 500 });
  }
}