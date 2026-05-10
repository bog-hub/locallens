// app/api/businesses/[id]/menu/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/Mongodb';
import { Menu } from '@/lib/models/Menu';
import { Business } from '@/lib/models/Business';
import mongoose from 'mongoose';

type Params = { params: Promise<{ id: string }> };

// GET /api/businesses/[id]/menu — public
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const menu = await Menu.findOne({ business: id }).lean();
    return NextResponse.json(menu ? JSON.parse(JSON.stringify(menu)) : { sections: [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

// PUT /api/businesses/[id]/menu — owner or admin only, replaces full menu
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const business = await Business.findById(id).lean();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const isOwner = (business as any).owner?.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sections } = await req.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections must be an array' }, { status: 400 });
    }

    // Sanitise each item — enforce photo limit and strip unknown fields
    const cleanSections = sections.map((section: any) => ({
      name:  String(section.name ?? '').slice(0, 80),
      items: (section.items ?? []).map((item: any) => ({
        name:        String(item.name ?? '').slice(0, 120),
        description: item.description ? String(item.description).slice(0, 400) : undefined,
        price:       item.price !== undefined && item.price !== '' ? Number(item.price) : undefined,
        photos:      Array.isArray(item.photos) ? item.photos.slice(0, 3) : [],
        available:   item.available !== false,
      })),
    })).filter((s: any) => s.name.trim());

    const menu = await Menu.findOneAndUpdate(
      { business: id },
      { business: id, sections: cleanSections },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    return NextResponse.json(JSON.parse(JSON.stringify(menu)));
  } catch (err: any) {
    console.error('[PUT /api/businesses/[id]/menu]', err);
    return NextResponse.json({ error: err.message ?? 'Failed to save menu' }, { status: 500 });
  }
}