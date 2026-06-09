import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelGroups, groupMembers, personalityProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompatibility } from '@/lib/matching/compatibility';
import { z } from 'zod';

const joinSchema = z.object({
  inviteCode: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const body = await req.json();
    const { inviteCode } = joinSchema.parse(body);

    // 1. Find group by invite code
    const [group] = await db.select().from(travelGroups)
      .where(eq(travelGroups.inviteCode, inviteCode.toUpperCase())).limit(1);

    if (!group) {
      return errorResponse('NOT_FOUND', 'Group not found', 404);
    }

    if (group.status !== 'forming') {
      return errorResponse('BAD_REQUEST', 'Group is no longer open for joining', 400);
    }

    if (group.inviteExpiresAt && new Date() > group.inviteExpiresAt) {
      return errorResponse('BAD_REQUEST', 'Invite code has expired', 400);
    }

    // 2. Check if user is already a member
    const [existingMember] = await db.select().from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, session.user.id)
        )
      ).limit(1);

    if (existingMember) {
      return successResponse({ group, message: 'Already a member' }, 200);
    }

    // 3. Check if group is full
    const currentMembers = await db.select().from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    if (currentMembers.length >= (group.maxMembers || 4)) {
      return errorResponse('BAD_REQUEST', 'Group is full', 400);
    }

    // 4. Add user to group
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: session.user.id,
      role: 'member',
      medicalSharingConsent: false,
    });

    // 5. Update group compatibility score
    const allMemberIds = [...currentMembers.map(m => m.userId), session.user.id];
    if (allMemberIds.length > 1) {
      // Get personality profiles for all members
      const profiles = await db.select().from(personalityProfiles);
      const groupProfiles = profiles.filter(p => allMemberIds.includes(p.userId));

      let totalScore = 0;
      let pairCount = 0;

      for (let i = 0; i < groupProfiles.length; i++) {
        for (let j = i + 1; j < groupProfiles.length; j++) {
          const matchResult = await getCompatibility(groupProfiles[i] as any, groupProfiles[j] as any);
          totalScore += matchResult.overallScore;
          pairCount++;
        }
      }

      if (pairCount > 0) {
        const avgScore = Math.round(totalScore / pairCount);
        await db.update(travelGroups)
          .set({ compatibilityScore: avgScore })
          .where(eq(travelGroups.id, group.id));
      }
    }

    return successResponse({ group, message: 'Successfully joined group' }, 200);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    console.error('Join group error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to join group', 500);
  }
}
