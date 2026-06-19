import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
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
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const body = await req.json();
    const data = createGroupSchema.parse(body);

    const inviteCode = nanoid(6).toUpperCase();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create group
    const [group] = await db.insert(travelGroups).values({
      name: data.name,
      destination: data.destination,
      maxMembers: data.maxMembers,
      createdBy: session.user.id,
      inviteCode,
      inviteExpiresAt,
      status: 'forming',
    }).returning();

    // Add creator to group
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: session.user.id,
      role: 'creator',
      medicalSharingConsent: false,
    });

    return successResponse(group, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    return errorResponse('INTERNAL_ERROR', 'Group creation failed', 500);
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

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
        medicalSharingConsent: groupMembers.medicalSharingConsent,
      })
      .from(groupMembers)
      .innerJoin(travelGroups, eq(groupMembers.groupId, travelGroups.id))
      .where(eq(groupMembers.userId, session.user.id));

    return successResponse(userGroups, 200);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve groups', 500);
  }
}
