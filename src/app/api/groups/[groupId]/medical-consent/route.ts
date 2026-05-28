import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { groupMembers, medicalProfiles } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const consentSchema = z.object({
  consent: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = await params;
    const body = await req.json();
    const data = consentSchema.parse(body);

    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db
      .update(groupMembers)
      .set({ medicalSharingConsent: data.consent })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)));

    await db
      .update(medicalProfiles)
      .set({ shareWithGroup: data.consent, updatedAt: new Date() })
      .where(eq(medicalProfiles.userId, session.user.id));

    return NextResponse.json({ data: { success: true, consent: data.consent } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error('Failed to update medical consent:', err);
    return NextResponse.json({ error: 'Failed to update medical consent' }, { status: 500 });
  }
}
