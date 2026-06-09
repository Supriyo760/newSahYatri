import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { restaurants, personalityProfiles } from '@/db/schema';
import { eq, and, gte, lte, ilike } from 'drizzle-orm';

// Regional specialties database (seed this into your DB)
const REGIONAL_SPECIALTIES: Record<string, string[]> = {
  'delhi': ['Butter Chicken', 'Chole Bhature', 'Paranthe Wali Gali', 'Dahi Bhalla'],
  'mumbai': ['Vada Pav', 'Pav Bhaji', 'Bombay Sandwich', 'Misal Pav'],
  'kolkata': ['Kathi Roll', 'Mishti Doi', 'Rasgulla', 'Kosha Mangsho'],
  'hyderabad': ['Hyderabadi Biryani', 'Haleem', 'Osmania Biscuits', 'Double Ka Meetha'],
  'goa': ['Goan Fish Curry', 'Xacuti', 'Bebinca', 'Feni'],
  'jaipur': ['Dal Baati Churma', 'Laal Maas', 'Ghewar', 'Pyaaz Kachori'],
  'tokyo': ['Ramen', 'Sushi', 'Tempura', 'Yakitori', 'Izakaya dishes'],
  'paris': ['Croissant', 'Coq au vin', 'Crêpes', 'French onion soup'],
  'bangkok': ['Pad Thai', 'Som Tam', 'Tom Yum Goong', 'Mango Sticky Rice'],
  // Add more cities as needed
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city')?.toLowerCase() || '';
  const budgetLevel = searchParams.get('budget'); // minimal/average/premium
  const cuisineType = searchParams.get('type'); // street_food/restaurant/fine_dining

  // Get user food preferences
  const [profile] = await db.select({
    foodPreferences: personalityProfiles.foodPreferences,
    budgetLevel: personalityProfiles.budgetLevel,
  }).from(personalityProfiles)
    .where(eq(personalityProfiles.userId, session.user.id));

  // Budget to price level mapping (Google's 1-4 scale)
  const priceLevelMap: Record<string, { min: number; max: number }> = {
    minimal: { min: 1, max: 2 },
    average: { min: 2, max: 3 },
    premium: { min: 3, max: 4 },
  };
  const budget = budgetLevel || profile?.budgetLevel || 'average';
  const priceRange = priceLevelMap[budget] || priceLevelMap.average;

  try {
    const results = await db.select().from(restaurants)
      .where(
        and(
          ilike(restaurants.city, `%${city}%`),
          gte(restaurants.priceLevel, priceRange.min),
          lte(restaurants.priceLevel, priceRange.max),
          gte(restaurants.rating, 4.0),
        )
      )
      .limit(20);

    const specialties = REGIONAL_SPECIALTIES[city] || [];

    return NextResponse.json({
      data: {
        restaurants: results,
        regionalSpecialties: specialties,
        localGems: results.filter(r => r.isLocalGem),
        requestedType: cuisineType,
        tip: `Try the local specialty: ${specialties[0] || 'Ask locals for recommendations'}`,
      },
    });
  } catch (err) {
    console.error('Food discovery failed:', err);
    return errorResponse('INTERNAL_ERROR', 'Food discovery failed', 500);
  }
}
