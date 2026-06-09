import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelGroups, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    // 1. Verify user is creator of the group
    const [membership] = await db.select().from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, params.id),
          eq(groupMembers.userId, session.user.id)
        )
      ).limit(1);

    if (!membership || membership.role !== 'creator') {
      return errorResponse('FORBIDDEN', 'Only the group creator can rotate the invite code', 403);
    }

    const newInviteCode = nanoid(6).toUpperCase();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 2. Update group
    const [updatedGroup] = await db.update(travelGroups)
      .set({
        inviteCode: newInviteCode,
        inviteExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(travelGroups.id, params.id))
      .returning();

    return successResponse({ 
      inviteCode: updatedGroup.inviteCode, 
      inviteExpiresAt: updatedGroup.inviteExpiresAt 
    }, 200);

  } catch (err) {
    console.error('Rotate invite error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to rotate invite code', 500);
  }
}
