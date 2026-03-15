import Stripe from 'stripe';

let stripeClient;

export function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    });
  }
  return stripeClient;
}

export const PLAN_PRICE_IDS = {
  personal: process.env.STRIPE_PRICE_PERSONAL, // set in .env when Stripe is configured
  premium:  process.env.STRIPE_PRICE_PREMIUM,
};

/**
 * Create or retrieve a Stripe customer for a user.
 */
export async function getOrCreateCustomer(user) {
  const stripe = getStripe();
  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
    idempotencyKey: `customer-${user.id}`,
  });

  return customer.id;
}
