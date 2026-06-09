import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { preMatchChats, preMatchMessages } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  try {
    const { chatId } = await params;

    const [chat] = await db
      .select()
      .from(preMatchChats)
      .where(eq(preMatchChats.id, chatId))
      .limit(1);

    if (!chat || (chat.initiatorId !== session.user.id && chat.recipientId !== session.user.id)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }

    const messages = await db
      .select()
      .from(preMatchMessages)
      .where(eq(preMatchMessages.chatId, chatId))
      .orderBy(asc(preMatchMessages.createdAt))
      .limit(100);

    return successResponse(messages, 200);
  } catch (err) {
    console.error('Failed to fetch pre-match messages:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch pre-match messages', 500);
  }
}
