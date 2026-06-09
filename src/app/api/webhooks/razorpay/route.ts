import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import crypto from 'crypto';
import { db } from '@/db';
import { users, webhookEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return errorResponse('BAD_REQUEST', 'Missing signature', 400);
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret.toLowerCase().includes('placeholder')) {
      return errorResponse('INTERNAL_ERROR', 'Razorpay webhook secret is not configured', 500);
    }
    
    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return errorResponse('BAD_REQUEST', 'Invalid signature', 400);
    }

    const event = JSON.parse(payload);

    // Idempotency lock
    const eventId = event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id;
    if (eventId) {
      try {
        await db.insert(webhookEvents).values({
          provider: 'razorpay',
          eventId: eventId,
          eventType: event.event,
        });
      } catch (err: any) {
        if (err.code === '23505' || err.message?.includes('unique constraint')) {
          console.log(`[RAZORPAY WEBHOOK] Event ${eventId} already processed. Skipping.`);
          return NextResponse.json({ status: 'ok' });
        }
        console.error('Failed to save webhook event ID:', err);
        return errorResponse('INTERNAL_ERROR', 'Failed to acquire idempotency lock', 500);
      }
    }

    switch (event.event) {
      case 'payment.captured': {
        // e.g. Handle one-time payment / tips / donations
        const paymentData = event.payload.payment.entity;
        console.log(`[RAZORPAY WEBHOOK] Payment captured for amount: ${paymentData.amount}`);
        break;
      }
      case 'subscription.charged': {
        // Indian context recurring billing
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes?.userId;
        
        if (userId) {
          console.log(`[RAZORPAY WEBHOOK] Upgrading user ${userId} to Premium via Subscription`);
          await db.update(users)
            .set({ role: 'premium' })
            .where(eq(users.id, userId));
        }
        break;
      }
      default:
        console.log(`Unhandled Razorpay event: ${event.event}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Razorpay Webhook Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Webhook processing failed', 500);
  }
}
