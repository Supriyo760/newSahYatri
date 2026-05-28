import Stripe from 'stripe';
import Razorpay from 'razorpay';

function requireConfiguredEnv(name: string) {
  const value = process.env[name];
  if (!value || value.toLowerCase().includes('placeholder')) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getStripe() {
  return new Stripe(requireConfiguredEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  });
}

export function getRazorpay() {
  return new Razorpay({
    key_id: requireConfiguredEnv('RAZORPAY_KEY_ID'),
    key_secret: requireConfiguredEnv('RAZORPAY_KEY_SECRET'),
  });
}

/**
 * Generate a Stripe Checkout Session for Premium Subscription
 */
export async function createStripeSubscriptionSession(userId: string, email: string) {
  const appUrl = requireConfiguredEnv('NEXT_PUBLIC_APP_URL');
  const priceId = requireConfiguredEnv('STRIPE_PREMIUM_PRICE_ID');
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    metadata: { userId },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/pricing?upgrade=canceled`,
  });

  return session;
}

/**
 * Track restaurant commission for referred dining
 */
export async function trackRestaurantCommission(restaurantId: string, bookingAmount: number) {
  // Assume a flat 5% commission for MVP
  const commissionAmount = bookingAmount * 0.05;
  
  // In production, log to database
  console.log(`[COMMISSION TRACKER] Generated ₹${commissionAmount} commission from Restaurant ${restaurantId}`);
  
  return commissionAmount;
}
