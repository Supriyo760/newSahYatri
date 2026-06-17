import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  age: z.number().min(18).max(100),
  gender: z.string().min(1),
  nationality: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }

    await db.update(users)
      .set({
        age: parsed.data.age,
        gender: parsed.data.gender,
        nationality: parsed.data.nationality || null,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/auth/complete-profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
