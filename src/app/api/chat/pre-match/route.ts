import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { preMatchChats, users } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { z } from 'zod';

const createChatSchema = z.object({
  recipientId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  try {
    const body = await req.json();
    const data = createChatSchema.parse(body);

    if (data.recipientId === session.user.id) {
      return errorResponse('BAD_REQUEST', 'Cannot start a pre-match chat with yourself', 400);
    }

    const [recipient] = await db.select().from(users).where(eq(users.id, data.recipientId)).limit(1);
    if (!recipient) {
      return errorResponse('NOT_FOUND', 'Traveler not found', 404);
    }

    const [existing] = await db
      .select()
      .from(preMatchChats)
      .where(
        and(
          eq(preMatchChats.status, 'active'),
          or(
            and(eq(preMatchChats.initiatorId, session.user.id), eq(preMatchChats.recipientId, data.recipientId)),
            and(eq(preMatchChats.initiatorId, data.recipientId), eq(preMatchChats.recipientId, session.user.id))
          )
        )
      )
      .limit(1);

    if (existing) {
      return successResponse(existing, 200);
    }

    const [chat] = await db
      .insert(preMatchChats)
      .values({
        initiatorId: session.user.id,
        recipientId: data.recipientId,
        isAnonymous: true,
        status: 'active',
      })
      .returning();

    return successResponse(chat, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    console.error('Failed to create pre-match chat:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to create pre-match chat', 500);
  }
}
