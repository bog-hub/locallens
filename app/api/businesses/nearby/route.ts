// app/api/businesses/nearby/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/Mongodb';
import { Business } from '@/lib/models/Business';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const lat      = parseFloat(searchParams.get('lat') ?? '0');
    const lng      = parseFloat(searchParams.get('lng') ?? '0');
    const radius   = parseInt(searchParams.get('radius') ?? '5000'); // meters
    const category = searchParams.get('category') ?? '';
    const limit    = parseInt(searchParams.get('limit') ?? '20');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const filter: Record<string, any> = {
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    };

    if (category) filter.category = category;

    const businesses = await Business.find(filter).limit(limit).lean();

    // Add distance to each result
    const withDistance = businesses.map((b: any) => {
      const [bLng, bLat] = b.location?.coordinates ?? [0, 0];
      const dist = getDistanceMeters(lat, lng, bLat, bLng);
      return { ...b, distanceMeters: Math.round(dist) };
    });

    return NextResponse.json(JSON.parse(JSON.stringify(withDistance)));
  } catch (err) {
    console.error('[GET /api/businesses/nearby]', err);
    return NextResponse.json({ error: 'Failed to fetch nearby businesses' }, { status: 500 });
  }
}

// Haversine formula
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}