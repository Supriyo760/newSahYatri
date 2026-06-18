import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { directChats, directMessages, users } from '@/db/schema';
import { eq, or, and, desc, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const userId = session.user.id;

    // Fetch all active direct chats for the user
    const chats = await db
      .select({
        id: directChats.id,
        lastMessageAt: directChats.lastMessageAt,
        otherUser: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        // We'll just fetch the unread count in a subquery or later. For now, let's keep it simple.
      })
      .from(directChats)
      .innerJoin(
        users,
        or(
          and(eq(directChats.userAId, userId), eq(users.id, directChats.userBId)),
          and(eq(directChats.userBId, userId), eq(users.id, directChats.userAId))
        )
      )
      .where(
        or(
          eq(directChats.userAId, userId),
          eq(directChats.userBId, userId)
        )
      )
      .orderBy(desc(directChats.lastMessageAt));

    return successResponse(chats, 200);
  } catch (err: any) {
    console.error('Error fetching inbox chats:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch chats', 500);
  }
}
