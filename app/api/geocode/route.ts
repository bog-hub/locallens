// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import opencage from 'opencage-api-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 5) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const geo = await opencage.geocode({
      q,
      key: process.env.OPENCAGE_API_KEY!,
      limit: 1,
      no_annotations: 1,
      countrycode: 'ma',
    });

    if (!geo.results.length) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    const { lat, lng } = geo.results[0].geometry;
    const formatted = geo.results[0].formatted;

    return NextResponse.json({ lat, lng, formatted });
  } catch (err) {
    console.error('[GET /api/geocode]', err);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}