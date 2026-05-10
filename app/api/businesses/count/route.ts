// app/api/businesses/count/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const count = await Business.countDocuments({ owner: session.user.id });
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to count' }, { status: 500 });
  }
}