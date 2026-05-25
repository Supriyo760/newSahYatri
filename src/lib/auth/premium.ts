import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function requirePremium() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.role !== 'premium') {
    return NextResponse.json({ 
      error: 'Premium feature locked.',
      upgradeUrl: '/pricing'
    }, { status: 403 });
  }

  return null; // Passes check
}
