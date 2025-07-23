import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const subscriptionTiers = {
  starter: {
    name: 'Starter',
    price: 29,
    priceId: 'price_starter_monthly',
    features: [
      'Up to $10K portfolio value',
      'Basic strategies (covered calls, CSP)',
      'Email support',
      '1 connected brokerage',
    ],
  },
  pro: {
    name: 'Pro',
    price: 99,
    priceId: 'price_pro_monthly',
    features: [
      'Up to $100K portfolio value',
      'Advanced strategies (iron condors, straddles)',
      'Priority support',
      'Up to 3 connected brokerages',
      'Advanced analytics',
      'Backtesting',
    ],
  },
  performance: {
    name: 'Performance',
    price: 299,
    priceId: 'price_performance_monthly',
    features: [
      'Unlimited portfolio value',
      'All strategies + custom strategies',
      'White-glove support',
      'Unlimited connected brokerages',
      'AI-powered optimization',
      'Social strategy marketplace',
    ],
  },
};

export const createCheckoutSession = async (priceId: string, userId: string) => {
  const stripe = await stripePromise;
  if (!stripe) throw new Error('Stripe not loaded');

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId, userId }),
  });

  const session = await response.json();
  return stripe.redirectToCheckout({ sessionId: session.id });
};