import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { groupId } = await params;

    const groupMessages = await db.select()
      .from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(asc(messages.createdAt))
      .limit(100); // paginate in production, cap at 100 for dev

    return NextResponse.json({ data: groupMessages });
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}
