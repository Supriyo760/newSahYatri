import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const avatarSchema = z.object({
  avatarUrl: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { avatarUrl } = avatarSchema.parse(body);

    await db.update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ data: { success: true, avatarUrl } }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
