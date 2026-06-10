import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trips, itineraryDays, itineraryItems, groupMembers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');

    if (groupId) {
      // 1. Verify user is in the group
      const [membership] = await db.select().from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, session.user.id)
          )
        ).limit(1);

      if (!membership) {
        return errorResponse('FORBIDDEN', 'Forbidden', 403);
      }

      // 2. Fetch trips for this group, picking the most recent active version
      const groupTrips = await db.select()
        .from(trips)
        .where(and(eq(trips.groupId, groupId), eq(trips.status, 'active')))
        .orderBy(desc(trips.itineraryVersion));
        
      if (groupTrips.length === 0) {
        return successResponse(null, 200);
      }

      // Load full itinerary for the latest trip
      const trip = groupTrips[0];
      const days = await db.select().from(itineraryDays)
        .where(eq(itineraryDays.tripId, trip.id))
        .orderBy(itineraryDays.dayNumber);

      const fullDays = [];
      for (const day of days) {
        const items = await db.select().from(itineraryItems)
          .where(eq(itineraryItems.dayId, day.id))
          .orderBy(itineraryItems.orderIndex);

        fullDays.push({
          ...day,
          items,
        });
      }

      return NextResponse.json({
        data: {
          ...trip,
          days: fullDays,
        },
      });
    } else {
      // List all trips for groups the user is in
      const userTrips = await db
        .select({
          id: trips.id,
          groupId: trips.groupId,
          destination: trips.destination,
          startDate: trips.startDate,
          endDate: trips.endDate,
          durationDays: trips.durationDays,
          totalBudget: trips.totalBudget,
        })
        .from(groupMembers)
        .innerJoin(trips, eq(groupMembers.groupId, trips.groupId))
        .where(eq(groupMembers.userId, session.user.id));

      return successResponse(userTrips, 200);
    }
  } catch (err) {
    console.error('Failed to get trips:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve trips', 500);
  }
}
