import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/services/payments';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
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
        const subscription = event.data.object as any;
        console.log(`[STRIPE WEBHOOK] Subscription canceled. Need to fetch user from customer ID and downgrade.`);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
