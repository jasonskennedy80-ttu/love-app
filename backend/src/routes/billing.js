import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { getStripe, getOrCreateCustomer, PLAN_PRICE_IDS } from '../services/stripe.js';

const router = Router();

// POST /billing/create-checkout — start a Stripe Checkout session
router.post('/create-checkout', requireAuth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['personal', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Choose personal or premium.' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    const stripe = getStripe();
    const customerId = await getOrCreateCustomer(user);

    // Persist customer ID if new
    if (!user.stripe_customer_id) {
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
    }

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      return res.status(503).json({ error: 'Billing not fully configured yet. Add Stripe price IDs to .env.' });
    }

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/billing/cancel`,
        metadata: { userId: user.id, plan },
      },
      { idempotencyKey: `checkout-${user.id}-${plan}-${Date.now()}` }
    );

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /billing/webhook — Stripe webhook handler (raw body, no auth)
router.post('/webhook', async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, plan } = session.metadata;
        await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId]);
        console.log(`User ${userId} upgraded to ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id);
        if (plan) {
          const { rows } = await pool.query(
            'SELECT id FROM users WHERE stripe_customer_id = $1',
            [sub.customer]
          );
          if (rows[0]) {
            await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, rows[0].id]);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { rows } = await pool.query(
          'SELECT id FROM users WHERE stripe_customer_id = $1',
          [sub.customer]
        );
        if (rows[0]) {
          await pool.query("UPDATE users SET plan = 'free' WHERE id = $1", [rows[0].id]);
          console.log(`User ${rows[0].id} downgraded to free (subscription cancelled)`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

function getPlanFromPriceId(priceId) {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return null;
}

export default router;
