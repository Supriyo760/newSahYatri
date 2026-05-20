import { db } from '@/db';
import { hiddenGems } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

interface RawPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  types: string[];
  rating: number;
  totalRatings: number;
  address: string;
  photoUrl?: string;
}

const TOURIST_TRAP_TYPES = [
  'tourist_attraction', 'amusement_park', 'zoo', 'aquarium',
];

const GEM_INDICATOR_TYPES = [
  'local_government_office', 'hindu_temple', 'mosque', 'place_of_worship',
  'cemetery', 'park', 'natural_feature',
];

/**
 * Score a place as a hidden gem.
 * Higher = better hidden gem candidate.
 */
export function computeGemScore(place: RawPlace): number {
  let score = 50; // base score

  // Quality boost (high rating is good)
  score += place.rating * 8;

  // Popularity penalty (too many reviews = tourist trap)
  const logRatings = Math.log10(Math.max(place.totalRatings, 1));
  score -= logRatings * 12;

  // Tourist type penalty
  const isTouristTrap = place.types.some(t => TOURIST_TRAP_TYPES.includes(t));
  if (isTouristTrap) score -= 25;

  // Local indicator boost
  const isLocalType = place.types.some(t => GEM_INDICATOR_TYPES.includes(t));
  if (isLocalType) score += 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Fetch hidden gems for a city from the DB.
 * If not enough exist, trigger a Google Places fetch and store.
 */
export async function getHiddenGems(city: string, country: string, limit = 10) {
  const existing = await db.select().from(hiddenGems)
    .where(
      and(
        eq(hiddenGems.city, city.toLowerCase()),
        gte(hiddenGems.gemScore, 55),
      )
    )
    .limit(limit);

  return existing.sort((a, b) => (b.gemScore || 0) - (a.gemScore || 0));
}
