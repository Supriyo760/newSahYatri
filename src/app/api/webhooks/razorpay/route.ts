import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret_placeholder';
    
    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(payload);

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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
