import { NextRequest, NextResponse } from 'next/server';
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { chatId } = await params;

    const [chat] = await db
      .select()
      .from(preMatchChats)
      .where(eq(preMatchChats.id, chatId))
      .limit(1);

    if (!chat || (chat.initiatorId !== session.user.id && chat.recipientId !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await db
      .select()
      .from(preMatchMessages)
      .where(eq(preMatchMessages.chatId, chatId))
      .orderBy(asc(preMatchMessages.createdAt))
      .limit(100);

    return NextResponse.json({ data: messages });
  } catch (err) {
    console.error('Failed to fetch pre-match messages:', err);
    return NextResponse.json({ error: 'Failed to fetch pre-match messages' }, { status: 500 });
  }
}
