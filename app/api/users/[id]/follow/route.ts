// app/api/users/[id]/follow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { User } from '@/lib/models/User';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id: targetId } = await params;
    const myId             = session.user.id;

    if (targetId === myId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const [me, target] = await Promise.all([
      User.findById(myId),
      User.findById(targetId),
    ]);

    if (!me || !target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isFollowing = me.following.map(String).includes(targetId);

    if (isFollowing) {
      me.following.pull(targetId);
      target.followers.pull(myId);
    } else {
      me.following.push(targetId);
      target.followers.push(myId);
    }

    await Promise.all([me.save(), target.save()]);

    return NextResponse.json({ following: !isFollowing });
  } catch {
    return NextResponse.json({ error: 'Failed to update follow' }, { status: 500 });
  }
}