import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { connections, directChats } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { connectionId, action } = await req.json();
    if (!connectionId || !['accept', 'reject'].includes(action)) {
      return errorResponse('BAD_REQUEST', 'Invalid connectionId or action', 400);
    }

    const userId = session.user.id;

    // Find the pending connection where the current user is the RECIPIENT
    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, connectionId),
        eq(connections.recipientId, userId),
        eq(connections.status, 'pending')
      )
    });

    if (!connection) {
      return errorResponse('NOT_FOUND', 'Pending connection request not found', 404);
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const [updated] = await db.update(connections)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(connections.id, connectionId))
      .returning();

    // If accepted, instantly create a direct chat
    if (newStatus === 'accepted') {
      const userAId = connection.initiatorId < connection.recipientId ? connection.initiatorId : connection.recipientId;
      const userBId = connection.initiatorId < connection.recipientId ? connection.recipientId : connection.initiatorId;

      await db.insert(directChats).values({
        userAId,
        userBId,
        connectionId: connection.id
      }).onConflictDoNothing(); // in case it exists somehow
    }

    return successResponse(updated, 200);
  } catch (err: any) {
    console.error('Error responding to connection:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to respond to request', 500);
  }
}
