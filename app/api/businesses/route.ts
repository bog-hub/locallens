// app/api/businesses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';
import { auth } from '@/lib/auth';
import opencage from 'opencage-api-client';
import { rateLimit, businessCreateLimiter } from '@/lib/ratelimit';
import { BusinessQuerySchema, BusinessCreateSchema, validate } from '@/lib/validations';

// GET /api/businesses — search & filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ── Zod validation on query params ──
    const raw = Object.fromEntries(searchParams.entries());
    // getAll() for array params
    if (searchParams.has('price')) (raw as any).price = searchParams.getAll('price');
    if (searchParams.has('tag'))   (raw as any).tag   = searchParams.getAll('tag');

    const result = validate(BusinessQuerySchema, raw);
    if (!result.success) return result.error;
    const { q, category, city, minRating, price, tag, sortBy, page, limit } = result.data;

    await connectDB();

    const filter: Record<string, any> = {};
    if (q)            filter.$text = { $search: q };
    if (category)     filter.category = category;
    if (city)         filter['address.city'] = { $regex: city, $options: 'i' };
    if (minRating)    filter.averageRating = { $gte: minRating };
    if (price.length) filter.priceRange = { $in: price };
    if (tag.length)   filter.tags = { $all: tag };

    const SORT: Record<string, any> = {
      rating:      { averageRating: -1 },
      reviewCount: { reviewCount: -1 },
      newest:      { createdAt: -1 },
    };

    const [businesses, total] = await Promise.all([
      Business.find(filter)
        .sort(SORT[sortBy] ?? SORT.rating)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Business.countDocuments(filter),
    ]);

    return NextResponse.json({
      businesses: JSON.parse(JSON.stringify(businesses)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[GET /api/businesses]', err);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}

// POST /api/businesses — create a listing
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'You must be signed in to add a business' }, { status: 401 });
    }

    // ── Rate limit: 10 business listings per user per hour ──
    const limited = await rateLimit(businessCreateLimiter, req, session.user.id);
    if (limited) return limited;

    const isAdmin = session.user.role === 'admin';

    // ── Business count limit (non-admins max 3) ──
    if (!isAdmin) {
      const existing = await Business.countDocuments({ owner: session.user.id });
      if (existing >= 3) {
        return NextResponse.json(
          { error: 'You have reached the maximum of 3 business listings. Contact us to increase your limit.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    // ── Zod validation ──
    const result = validate(BusinessCreateSchema, body);
    if (!result.success) return result.error;
    const data = result.data;

    await connectDB();

    // Generate slug manually so we can catch duplicates cleanly
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now()}`;

    let coordinates: [number, number] = [0, 0];

    // Use client-provided coordinates (from map preview / dragged pin) when valid
    const clientCoords = data.location?.coordinates;
    const clientCoordsValid =
      Array.isArray(clientCoords) &&
      clientCoords.length === 2 &&
      (clientCoords[0] !== 0 || clientCoords[1] !== 0);

    if (clientCoordsValid) {
      coordinates = clientCoords as [number, number];
    } else {
      // Fallback: geocode server-side if client sent [0,0] or nothing
      try {
        const { street, city, state, zip, country } = data.address;
        const query = [street, city, state, zip, country].filter(Boolean).join(', ');

        const geo = await opencage.geocode({
          q:             query,
          key:           process.env.OPENCAGE_API_KEY!,
          limit:         1,
          no_annotations: 1,
          countrycode:   'ma',
        });

        if (geo.results.length > 0) {
          const { lat, lng } = geo.results[0].geometry;
          coordinates = [lng, lat];
        }
      } catch (err) {
        console.error('Geocoding failed, defaulting to [0,0]:', err);
      }
    }

    const business = await Business.create({
      ...data,
      slug,
      owner:         isAdmin ? undefined : session.user.id,
      isClaimed:     !isAdmin,   // admin-created listings are unclaimed — ready for owners to claim
      averageRating: 0,
      reviewCount:   0,
      location:      { type: 'Point', coordinates },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(business)), { status: 201 });

  } catch (err: any) {
    console.error('[POST /api/businesses]', err);

    if (err.code === 11000) {
      return NextResponse.json({ error: 'A business with this name already exists' }, { status: 409 });
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message ?? 'Failed to create business' },
      { status: 500 }
    );
  }
}