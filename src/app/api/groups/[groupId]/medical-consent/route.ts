import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
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
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
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
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
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
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues);
    }
    console.error('Failed to update medical consent:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to update medical consent', 500);
  }
}
