import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { directChats, directMessages } from '@/db/schema';
import { eq, and, or, asc, sql } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { chatId } = await params;
    const userId = session.user.id;

    // Verify user is part of the chat
    const chat = await db.query.directChats.findFirst({
      where: and(
        eq(directChats.id, chatId),
        or(eq(directChats.userAId, userId), eq(directChats.userBId, userId))
      )
    });

    if (!chat) return errorResponse('FORBIDDEN', 'Chat not found or access denied', 403);

    // Mark messages as read
    await db.update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.chatId, chatId),
          eq(directMessages.isRead, false),
          // We only mark messages sent by the OTHER person as read
          sql`${directMessages.senderId} != ${userId}`
        )
      );

    const messages = await db.query.directMessages.findMany({
      where: eq(directMessages.chatId, chatId),
      orderBy: [asc(directMessages.createdAt)],
    });

    return successResponse(messages, 200);
  } catch (err: any) {
    console.error('Error fetching chat messages:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch messages', 500);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { chatId } = await params;
    const userId = session.user.id;
    const { content } = await req.json();

    if (!content?.trim()) return errorResponse('BAD_REQUEST', 'Content cannot be empty', 400);

    // Verify user is part of the chat
    const chat = await db.query.directChats.findFirst({
      where: and(
        eq(directChats.id, chatId),
        or(eq(directChats.userAId, userId), eq(directChats.userBId, userId))
      )
    });

    if (!chat) return errorResponse('FORBIDDEN', 'Chat not found or access denied', 403);

    const [newMessage] = await db.insert(directMessages).values({
      chatId,
      senderId: userId,
      content: content.trim(),
    }).returning();

    await db.update(directChats)
      .set({ lastMessageAt: new Date() })
      .where(eq(directChats.id, chatId));

    return successResponse(newMessage, 201);
  } catch (err: any) {
    console.error('Error sending message:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to send message', 500);
  }
}
