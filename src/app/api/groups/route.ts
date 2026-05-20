import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelGroups, groupMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  destination: z.string().optional(),
  maxMembers: z.number().min(2).max(10).default(4),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = createGroupSchema.parse(body);

    const inviteCode = nanoid(6).toUpperCase();

    // Create group
    const [group] = await db.insert(travelGroups).values({
      name: data.name,
      destination: data.destination,
      maxMembers: data.maxMembers,
      createdBy: session.user.id,
      inviteCode,
      status: 'forming',
    }).returning();

    // Add creator to group
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: session.user.id,
      role: 'creator',
      medicalSharingConsent: false,
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Group creation failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // List groups where current user is a member
    const userGroups = await db
      .select({
        id: travelGroups.id,
        name: travelGroups.name,
        status: travelGroups.status,
        destination: travelGroups.destination,
        maxMembers: travelGroups.maxMembers,
        inviteCode: travelGroups.inviteCode,
        compatibilityScore: travelGroups.compatibilityScore,
        createdAt: travelGroups.createdAt,
      })
      .from(groupMembers)
      .innerJoin(travelGroups, eq(groupMembers.groupId, travelGroups.id))
      .where(eq(groupMembers.userId, session.user.id));

    return NextResponse.json({ data: userGroups });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retrieve groups' }, { status: 500 });
  }
}
