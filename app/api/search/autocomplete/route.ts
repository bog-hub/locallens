// app/api/search/autocomplete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const q = new URL(req.url).searchParams.get('q') ?? '';
    if (q.length < 2) return NextResponse.json([]);

    const results = await Business.find({
      $or: [
        { name:     { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { tags:     { $regex: q, $options: 'i' } },
      ],
    })
      .select('name category slug coverImage averageRating address')
      .limit(6)
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(results)));
  } catch {
    return NextResponse.json([]);
  }
}