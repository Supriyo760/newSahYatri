import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.update(users)
      .set({ role: 'premium' })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ data: { success: true, role: 'premium' } }, { status: 200 });
  } catch (err) {
    console.error('Failed to upgrade user to premium:', err);
    return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
  }
}
