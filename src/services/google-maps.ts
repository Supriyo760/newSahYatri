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

const nominatimCache = new Map<string, any>();
let lastRequestTime = 0;

async function throttleRequest() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

export async function searchPlace(query: string): Promise<PlaceDetails | null> {
  // If we don't have a real Google Maps API key, use OpenStreetMap Nominatim as a free fallback
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) {
    const cached = nominatimCache.get(query);
    if (cached) return cached;

    try {
      await throttleRequest();

      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: '1'
      });
      
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {
          'User-Agent': 'SahYatriApp/1.0'
        }
      });
      
      const data = await res.json();
      
      if (!data || data.length === 0) {
        return null;
      }
      
      const p = data[0];
      const result = {
        placeId: `osm_${p.place_id}`,
        name: query.split(',')[0] || query,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        address: p.display_name,
        rating: 4.5,
        totalRatings: 100,
        priceLevel: 2,
        types: ['tourist_attraction'],
      };
      
      nominatimCache.set(query, result);
      return result;
    } catch (err) {
      console.error('Nominatim search error:', err);
      return null;
    }
  }


  // Real Google Maps API logic (if valid key is present)
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

export async function findNearbyMedicalFacilities(lat: number, lng: number, type: 'hospital' | 'pharmacy' | 'clinic' = 'hospital', radius = 5000) {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) {
    try {
      const delta = 0.045;
      const minLng = lng - delta;
      const maxLng = lng + delta;
      const minLat = lat - delta;
      const maxLat = lat + delta;

      const params = new URLSearchParams({
        format: 'json',
        q: type,
        viewbox: `${minLng},${maxLat},${maxLng},${minLat}`,
        bounded: '1',
        limit: '5'
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {
          'User-Agent': 'SahYatriApp/1.0'
        }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        return data.map((h: any) => ({
          name: h.name || h.display_name.split(',')[0],
          vicinity: h.display_name,
          geometry: { location: { lat: parseFloat(h.lat), lng: parseFloat(h.lon) } },
          place_id: `osm_${type}_${h.place_id}`,
          opening_hours: { open_now: true }
        }));
      }
    } catch (err) {
      console.error(`Nominatim ${type} search error:`, err);
    }

    // Default static fallback if API fails
    return [
      {
        name: `Local Community ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        vicinity: `Facility near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        geometry: { location: { lat: lat + 0.003, lng: lng - 0.002 } },
        place_id: `mock_${type}_def_1`,
        opening_hours: { open_now: true }
      }
    ];
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: radius.toString(),
    type: type,
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/place/nearbysearch/json?${params}`);
  const data = await res.json();
  return data.results?.slice(0, 5) || [];
}

export async function findNearbyHospitals(lat: number, lng: number, radius = 5000) {
  return findNearbyMedicalFacilities(lat, lng, 'hospital', radius);
}

export async function findPublicToilets(lat: number, lng: number, radius = 2000) {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) {
    // Fallback Mock
    return [
      {
        name: 'Public Restroom - Park',
        lat: lat + 0.001,
        lng: lng + 0.001,
        isOpen: true,
        type: 'public_toilet'
      }
    ];
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: radius.toString(),
    keyword: 'public toilet',
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/place/nearbysearch/json?${params}`);
  const data = await res.json();
  
  return data.results?.slice(0, 5).map((r: any) => ({
    name: r.name,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    isOpen: r.opening_hours?.open_now !== false,
    type: 'public_toilet'
  })) || [];
}

export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'transit' = 'driving'
) {
  if (!MAPS_API_KEY || MAPS_API_KEY.includes('Placeholder')) {
    return {
      status: 'OK',
      routes: [
        {
          legs: [
            {
              distance: { text: '2.5 km', value: 2500 },
              duration: { text: '8 mins', value: 480 },
              start_location: origin,
              end_location: destination,
            }
          ],
          overview_polyline: {
            points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
          }
        }
      ]
    };
  }

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: MAPS_API_KEY,
  });

  const res = await fetch(`${BASE}/directions/json?${params}`);
  return await res.json();
}
