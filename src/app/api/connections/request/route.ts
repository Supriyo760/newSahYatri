import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { connections } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { recipientId } = await req.json();
    if (!recipientId) return errorResponse('BAD_REQUEST', 'Recipient ID is required', 400);

    const initiatorId = session.user.id;
    if (initiatorId === recipientId) {
      return errorResponse('BAD_REQUEST', 'Cannot connect with yourself', 400);
    }

    // Check if a connection already exists in either direction
    const existing = await db.query.connections.findFirst({
      where: or(
        and(eq(connections.initiatorId, initiatorId), eq(connections.recipientId, recipientId)),
        and(eq(connections.initiatorId, recipientId), eq(connections.recipientId, initiatorId))
      )
    });

    if (existing) {
      return errorResponse('CONFLICT', `Connection already exists with status: ${existing.status}`, 409);
    }

    const [newConnection] = await db.insert(connections).values({
      initiatorId,
      recipientId,
      status: 'pending'
    }).returning();

    return successResponse(newConnection, 201);
  } catch (err: any) {
    console.error('Error creating connection request:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to send connection request', 500);
  }
}
