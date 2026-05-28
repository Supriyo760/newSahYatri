import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { itineraryDays, itineraryItems } from '@/db/schema';
import { getTripForMember } from '@/lib/authz';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

const collaborativeItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(200),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.enum(['attraction', 'food', 'transport', 'rest', 'hidden_gem', 'medical_stop', 'accommodation']),
});

const saveSchema = z.object({
  items: z.array(collaborativeItemSchema),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tripId } = await params;
    const trip = await getTripForMember(session.user.id, tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { items } = saveSchema.parse(await req.json());
    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one itinerary item is required' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      let [day] = await tx
        .select()
        .from(itineraryDays)
        .where(eq(itineraryDays.tripId, tripId))
        .orderBy(asc(itineraryDays.dayNumber))
        .limit(1);

      if (!day) {
        [day] = await tx
          .insert(itineraryDays)
          .values({
            tripId,
            dayNumber: 1,
            date: trip.startDate,
            theme: 'Collaborative Plan',
          })
          .returning();
      }

      await tx.delete(itineraryItems).where(eq(itineraryItems.dayId, day.id));

      await tx.insert(itineraryItems).values(
        items.map((item, index) => ({
          dayId: day.id,
          orderIndex: index,
          type: item.type,
          name: item.name,
          estimatedDurationMinutes: 60,
          tips: `Scheduled at ${item.time}`,
        })),
      );
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error('Failed to save collaborative itinerary:', err);
    return NextResponse.json({ error: 'Failed to save collaborative itinerary' }, { status: 500 });
  }
}
