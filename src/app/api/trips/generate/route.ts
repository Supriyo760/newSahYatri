import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trips, itineraryDays, itineraryItems, travelGroups, personalityProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateItinerary } from '@/services/openai';
import { searchPlace } from '@/services/google-maps';
import { z } from 'zod';

const generateSchema = z.object({
  groupId: z.string().uuid(),
  destination: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budgetTotal: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = generateSchema.parse(body);

    // Get group info + user profile for personalization
    const [group] = await db.select().from(travelGroups)
      .where(eq(travelGroups.id, data.groupId)).limit(1);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

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
          type: item.type as any,
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
    return NextResponse.json({ error: 'Trip generation failed' }, { status: 500 });
  }
}
