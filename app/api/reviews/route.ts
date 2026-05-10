// app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import { Business } from '@/lib/models/Business';
import { User } from '@/lib/models/User';
import { auth } from '@/lib/auth';
import { sendNewReviewEmail } from '@/lib/email';
import { rateLimit, reviewLimiter } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const businessId = new URL(req.url).searchParams.get('businessId');
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

    const reviews = await Review.find({ business: businessId })
      .populate('user', 'name image reviewCount location')
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(reviews)));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Rate limit: 10 reviews per user per hour ──
    // Keyed by user ID so shared IPs (cafés, offices) don't interfere with each other
    const limited = await rateLimit(reviewLimiter, req, session.user.id);
    if (limited) return limited;

    await connectDB();
    const { businessId, rating, title, body, tags, photos } = await req.json();

    if (!businessId || !rating || !body) {
      return NextResponse.json({ error: 'businessId, rating and body are required' }, { status: 400 });
    }

    const review = await Review.create({
      business: businessId,
      user:     session.user.id,
      rating, title, body,
      tags:   tags   ?? [],
      photos: photos ?? [],
    });

    await User.findByIdAndUpdate(session.user.id, { $inc: { reviewCount: 1 } });

    // ── Push review photos into the business gallery ──
    if (photos && photos.length > 0) {
      await Business.findByIdAndUpdate(businessId, {
        $push: {
          photos: {
            $each: photos.map((url: string) => ({
              url,
              caption:    `Photo by ${session.user.name ?? 'a user'}`,
              uploadedBy: session.user.id,
              createdAt:  new Date(),
            })),
          },
        },
      });
    }

    const populated = await review.populate('user', 'name image reviewCount');

    // ── Send email notification to business owner (non-blocking) ──
    try {
      const business = await Business.findById(businessId).populate('owner', 'name email').lean();
      const owner    = (business as any)?.owner;
      if (owner?.email && owner._id.toString() !== session.user.id) {
        await sendNewReviewEmail({
          ownerEmail:   owner.email,
          ownerName:    owner.name,
          businessName: (business as any).name,
          businessSlug: (business as any).slug,
          reviewerName: session.user.name ?? 'A user',
          rating,
          reviewBody:   body,
        });
      }
    } catch (emailErr) {
      console.error('[email] Failed to send review notification:', emailErr);
    }

    return NextResponse.json(JSON.parse(JSON.stringify(populated)), { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'You have already reviewed this business' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to post review' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { reviewId } = await req.json();
    const review = await Review.findById(reviewId);
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const userId       = session.user.id;
    const alreadyVoted = review.helpfulVotedBy.map(String).includes(userId);

    if (alreadyVoted) {
      review.helpfulVotedBy.pull(userId);
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    } else {
      review.helpfulVotedBy.push(userId);
      review.helpfulVotes += 1;
    }
    await review.save();

    return NextResponse.json({ helpfulVotes: review.helpfulVotes, voted: !alreadyVoted });
  } catch {
    return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
  }
}