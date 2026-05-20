import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/place-photo?q=<search_query>
 * 
 * Fetches a real photo URL for a place from Google Maps Places API.
 * Returns a redirect to the actual photo so it can be used as an <img> src.
 * 
 * When GOOGLE_MAPS_SERVER_API_KEY is a real key:
 *   - Searches for the place using Find Place
 *   - Gets the photo_reference from the result
 *   - Returns a redirect to the Place Photo URL
 * 
 * When the key is a placeholder:
 *   - Returns a Google Maps Street View static image as fallback
 */

const MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || '';
const BASE = 'https://maps.googleapis.com/maps/api';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || '';
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');

  if (!query && !lat) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  const isPlaceholder = !MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder') || MAPS_API_KEY.includes('placeholder');

  if (!isPlaceholder) {
    try {
      // Step 1: Find the place
      const findParams = new URLSearchParams({
        input: query || `${lat},${lng}`,
        inputtype: 'textquery',
        fields: 'photos,place_id',
        key: MAPS_API_KEY,
      });

      const findRes = await fetch(`${BASE}/place/findplacefromtext/json?${findParams}`);
      const findData = await findRes.json();

      if (findData.candidates?.[0]?.photos?.[0]?.photo_reference) {
        const photoRef = findData.candidates[0].photos[0].photo_reference;
        const photoUrl = `${BASE}/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${MAPS_API_KEY}`;
        
        // Redirect to the actual photo URL
        return NextResponse.redirect(photoUrl);
      }
    } catch (err) {
      console.error('Place photo fetch error:', err);
    }
  }

  // Fallback: return a Google Maps thumbnail via the embed thumbnail endpoint
  // This generates a static map centered on the location
  const mapQuery = query || `${lat},${lng}`;
  const thumbUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(mapQuery)}&zoom=16&size=800x400&maptype=hybrid&key=${MAPS_API_KEY}`;

  // If even that won't work (placeholder key), return a simple map embed redirect
  if (isPlaceholder) {
    // Return JSON with a Google Maps search URL that the client can use
    return NextResponse.json({ 
      photoUrl: null,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
      message: 'Real Google Maps API key required for place photos. Set GOOGLE_MAPS_SERVER_API_KEY in .env.local'
    });
  }

  return NextResponse.redirect(thumbUrl);
}
