// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Review } from '@/lib/models/Review';
import { Business } from '@/lib/models/Business';
import mongoose from 'mongoose';

// ── Schemas ────────────────────────────────────────────────────────────────

const ViewSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  date:     { type: String, index: true }, // YYYY-MM-DD
  count:    { type: Number, default: 1 },
}, { timestamps: false });
ViewSchema.index({ business: 1, date: 1 }, { unique: true });

const ClickSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  date:     { type: String, index: true }, // YYYY-MM-DD
  type:     { type: String, enum: ['phone', 'website', 'directions'], required: true },
  count:    { type: Number, default: 1 },
}, { timestamps: false });
ClickSchema.index({ business: 1, date: 1, type: 1 }, { unique: true });

const View  = mongoose.models.View  || mongoose.model('View',  ViewSchema);
const Click = mongoose.models.Click || mongoose.model('Click', ClickSchema);

const CLICK_TYPES = ['phone', 'website', 'directions'] as const;
type ClickType = typeof CLICK_TYPES[number];

// ── POST /api/analytics — record a view or click ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { businessId, type } = await req.json();
    if (!businessId) return NextResponse.json({ ok: true });

    const date = new Date().toISOString().slice(0, 10);

    if (type && CLICK_TYPES.includes(type as ClickType)) {
      // Track a click (phone / website / directions)
      await Click.findOneAndUpdate(
        { business: businessId, date, type },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    } else {
      // Default — track a page view
      await View.findOneAndUpdate(
        { business: businessId, date },
        { $inc: { count: 1 } },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never break the page
  }
}

// ── GET /api/analytics?businessId=... — fetch analytics for owner ──────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const businessId = new URL(req.url).searchParams.get('businessId');
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      return NextResponse.json({ error: 'Valid businessId required' }, { status: 400 });
    }

    // Verify ownership
    const business = await Business.findById(businessId).lean();
    if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (
      (business as any).owner?.toString() !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build last 30 days array
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().slice(0, 10);
    });

    // Fetch views + clicks in parallel
    const [viewDocs, clickDocs, dist] = await Promise.all([
      View.find({ business: businessId, date: { $in: days } }).lean(),
      Click.find({ business: businessId, date: { $in: days } }).lean(),
      Review.aggregate([
        { $match: { business: new mongoose.Types.ObjectId(businessId) } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build view map
    const viewMap: Record<string, number> = {};
    viewDocs.forEach((v: any) => { viewMap[v.date] = v.count; });

    // Build click maps per type
    const clickMap: Record<string, Record<string, number>> = {
      phone: {}, website: {}, directions: {},
    };
    clickDocs.forEach((c: any) => {
      if (!clickMap[c.type]) clickMap[c.type] = {};
      clickMap[c.type][c.date] = c.count;
    });

    // Merge into daily data
    const dailyData = days.map((date) => ({
      date,
      views:      viewMap[date]             ?? 0,
      phone:      clickMap.phone[date]      ?? 0,
      website:    clickMap.website[date]    ?? 0,
      directions: clickMap.directions[date] ?? 0,
    }));

    const totalViews      = dailyData.reduce((s, d) => s + d.views,      0);
    const totalPhone      = dailyData.reduce((s, d) => s + d.phone,      0);
    const totalWebsite    = dailyData.reduce((s, d) => s + d.website,    0);
    const totalDirections = dailyData.reduce((s, d) => s + d.directions, 0);

    return NextResponse.json({
      business:     JSON.parse(JSON.stringify(business)),
      dailyData,
      totals: {
        views:      totalViews,
        phone:      totalPhone,
        website:    totalWebsite,
        directions: totalDirections,
        clicks:     totalPhone + totalWebsite + totalDirections,
      },
      distribution: dist,
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}