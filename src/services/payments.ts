import Stripe from 'stripe';
import Razorpay from 'razorpay';

// Initialize Stripe Client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia', // Use the latest stable API version supported
  typescript: true,
});

// Initialize Razorpay Client
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

/**
 * Generate a Stripe Checkout Session for Premium Subscription
 */
export async function createStripeSubscriptionSession(userId: string, email: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    metadata: { userId },
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_placeholder',
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?upgrade=canceled`,
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
