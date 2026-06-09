import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return errorResponse('BAD_REQUEST', 'Invalid push subscription payload', 400);
    }

    // Check if it already exists
    const existing = await db.query.pushSubscriptions.findFirst({
      where: and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    });

    if (!existing) {
      await db.insert(pushSubscriptions).values({
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    }

    return successResponse({ message: 'Push subscription registered' }, 201);
  } catch (err) {
    console.error('Push subscription error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to register subscription', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return errorResponse('BAD_REQUEST', 'Missing endpoint', 400);
    }

    await db.delete(pushSubscriptions).where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );

    return successResponse({ message: 'Push subscription removed' }, 200);
  } catch (err) {
    return errorResponse('INTERNAL_ERROR', 'Failed to remove subscription', 500);
  }
}
