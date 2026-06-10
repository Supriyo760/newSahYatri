import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { travelGroups, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  const { groupId: id } = await params;

  try {
    // 1. Verify user is creator of the group
    const [membership] = await db.select().from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, session.user.id),
          eq(groupMembers.role, 'creator')
        )
      )
      .limit(1);

    if (!membership) {
      return errorResponse('FORBIDDEN', 'Only creator can rotate invite codes', 403);
    }

    // 2. Generate new code and update
    const newCode = nanoid(10).toUpperCase();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    const [updatedGroup] = await db.update(travelGroups)
      .set({
        inviteCode: newCode,
        inviteExpiresAt: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(travelGroups.id, id))
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
