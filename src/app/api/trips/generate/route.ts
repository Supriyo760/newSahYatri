import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trips, itineraryDays, itineraryItems, personalityProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateItinerary } from '@/services/openai';
import { searchPlace } from '@/services/google-maps';
import { z } from 'zod';
import { getGroupForMember } from '@/lib/authz';

const generateSchema = z.object({
  groupId: z.string().uuid(),
  destination: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budgetTotal: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const body = await req.json();
    const data = generateSchema.parse(body);

    // Get group info + user profile for personalization
    const group = await getGroupForMember(session.user.id, data.groupId);
    if (!group) return errorResponse('FORBIDDEN', 'Forbidden', 403);

    const [profile] = await db.select().from(personalityProfiles)
      .where(eq(personalityProfiles.userId, session.user.id)).limit(1);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Generate itinerary with GPT-4
    const generated = await generateItinerary({
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays,
      groupSize: group.maxMembers || 4,
      budgetLevel: profile?.budgetLevel || 'average',
      travelStyle: profile?.travelStyle || 'mixed',
      foodPreferences: profile?.foodPreferences
        ? Object.entries(profile.foodPreferences as object)
            .filter(([, v]) => v).map(([k]) => k)
        : [],
      interests: profile?.interests || [],
    });

    // Fetch existing trips to determine version
    const existingTrips = await db.select().from(trips).where(eq(trips.groupId, data.groupId));
    const nextVersion = existingTrips.length > 0 ? Math.max(...existingTrips.map(t => t.itineraryVersion)) + 1 : 1;

    // Archive previous trips instead of deleting
    if (existingTrips.length > 0) {
      await db.update(trips)
        .set({ status: 'cancelled' })
        .where(eq(trips.groupId, data.groupId));
    }

    // Save trip to DB
    const [trip] = await db.insert(trips).values({
      groupId: data.groupId,
      destination: data.destination,
      startDate: start,
      endDate: end,
      durationDays,
      hiddenGemMode: durationDays >= 5,
      totalBudget: data.budgetTotal,
      perPersonBudget: data.budgetTotal ? data.budgetTotal / (group.maxMembers || 4) : undefined,
      itineraryVersion: nextVersion,
      status: 'active',
    }).returning();

    // Save days and items (with Google Places enrichment)
    for (const day of generated.days) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + day.day - 1);

      const [savedDay] = await db.insert(itineraryDays).values({
        tripId: trip.id,
        dayNumber: day.day,
        date: dayDate,
        theme: day.theme,
      }).returning();

      // Enrich items with real place data
      for (let i = 0; i < day.items.length; i++) {
        const item = day.items[i];
        let placeData = null;

        try {
          placeData = await searchPlace(item.search_query);
        } catch { /* continue without enrichment */ }

        await db.insert(itineraryItems).values({
          dayId: savedDay.id,
          orderIndex: i,
          type: item.type,
          name: item.name,
          description: item.description,
          locationName: placeData?.address || item.name,
          lat: placeData?.lat,
          lng: placeData?.lng,
          googlePlaceId: placeData?.placeId,
          estimatedDurationMinutes: item.duration_minutes,
          estimatedCostPerPerson: item.estimated_cost_per_person,
          isHiddenGem: item.is_hidden_gem,
          tips: item.tips,
          photoUrl: placeData?.photoUrl,
          openingHours: placeData?.openingHours
            ? JSON.stringify(placeData.openingHours)
            : undefined,
        });
      }
    }

    return NextResponse.json({ data: { tripId: trip.id } }, { status: 201 });
  } catch (err) {
    console.error('Trip generation error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse('INTERNAL_ERROR', `Trip generation failed: ${message}`, 500);
  }
}
