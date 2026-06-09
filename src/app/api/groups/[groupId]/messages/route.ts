import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { isGroupMember } from '@/lib/authz';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { groupId } = await params;
    if (!(await isGroupMember(session.user.id, groupId))) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const groupMessages = await db.select()
      .from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(asc(messages.createdAt))
      .limit(100); // paginate in production, cap at 100 for dev

    return successResponse(groupMessages, 200);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve messages', 500);
  }
}
