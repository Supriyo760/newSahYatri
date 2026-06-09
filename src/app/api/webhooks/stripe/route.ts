import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import Stripe from 'stripe';
import { getStripe } from '@/services/payments';
import { db } from '@/db';
import { users, webhookEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return errorResponse('BAD_REQUEST', 'Missing stripe-signature', 400);
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.toLowerCase().includes('placeholder')) {
      return errorResponse('INTERNAL_ERROR', 'Stripe webhook secret is not configured', 500);
    }

    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Idempotency lock
  try {
    await db.insert(webhookEvents).values({
      provider: 'stripe',
      eventId: event.id,
      eventType: event.type,
    });
  } catch (err: any) {
    if (err.code === '23505' || err.message?.includes('unique constraint')) {
      console.log(`[STRIPE WEBHOOK] Event ${event.id} already processed. Skipping.`);
      return NextResponse.json({ received: true });
    }
    console.error('Failed to save webhook event ID:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to acquire idempotency lock', 500);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (userId) {
          console.log(`[STRIPE WEBHOOK] Upgrading user ${userId} to Premium`);
          // Update database role
          await db.update(users)
            .set({ role: 'premium' })
            .where(eq(users.id, userId));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[STRIPE WEBHOOK] Subscription canceled. Need to fetch user from customer ID and downgrade.`);
        void subscription;
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return errorResponse('INTERNAL_ERROR', 'Webhook handler failed', 500);
  }
}
