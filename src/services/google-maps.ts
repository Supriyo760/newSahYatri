const MAPS_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY!;
const BASE = 'https://maps.googleapis.com/maps/api';

export interface PlaceDetails {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  photoUrl?: string;
  openingHours?: object;
  types: string[];
}

export async function searchPlace(query: string): Promise<PlaceDetails | null> {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) return null;

  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id,name,geometry,formatted_address,rating,user_ratings_total,price_level,photos,opening_hours,types',
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/place/findplacefromtext/json?${params}`);
  const data = await res.json();

  if (!data.candidates?.[0]) return null;
  const p = data.candidates[0];

  return {
    placeId: p.place_id,
    name: p.name,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    address: p.formatted_address,
    rating: p.rating,
    totalRatings: p.user_ratings_total,
    priceLevel: p.price_level,
    photoUrl: p.photos?.[0]
      ? `${BASE}/place/photo?maxwidth=800&photo_reference=${p.photos[0].photo_reference}&key=${MAPS_API_KEY}`
      : undefined,
    openingHours: p.opening_hours,
    types: p.types || [],
  };
}

export async function findNearbyHospitals(lat: number, lng: number, radius = 5000) {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) return [];

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: radius.toString(),
    type: 'hospital',
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/place/nearbysearch/json?${params}`);
  const data = await res.json();
  return data.results?.slice(0, 5) || [];
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'transit' = 'driving'
) {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) return null;

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/directions/json?${params}`);
  return await res.json();
}
