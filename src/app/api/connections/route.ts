import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { connections, users } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const userId = session.user.id;

    // Fetch all connections where the user is either initiator or recipient
    const allConnections = await db
      .select({
        id: connections.id,
        status: connections.status,
        initiatorId: connections.initiatorId,
        recipientId: connections.recipientId,
        createdAt: connections.createdAt,
        otherUser: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        }
      })
      .from(connections)
      .innerJoin(
        users,
        or(
          and(eq(connections.initiatorId, userId), eq(users.id, connections.recipientId)),
          and(eq(connections.recipientId, userId), eq(users.id, connections.initiatorId))
        )
      )
      .where(
        or(
          eq(connections.initiatorId, userId),
          eq(connections.recipientId, userId)
        )
      );

    // Group them for easier frontend processing
    const pendingSent = allConnections.filter(c => c.status === 'pending' && c.initiatorId === userId);
    const pendingReceived = allConnections.filter(c => c.status === 'pending' && c.recipientId === userId);
    const active = allConnections.filter(c => c.status === 'accepted');

    return successResponse({
      pendingSent,
      pendingReceived,
      active
    }, 200);
  } catch (err: any) {
    console.error('Error fetching connections:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch connections', 500);
  }
}
