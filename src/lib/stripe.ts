import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const subscriptionTiers = {
  starter: {
    name: 'Starter', 
    price: 19,
    priceId: 'price_starter_monthly',
    features: [
      'Limited bots for activation',
      'DCA and Smart Rebalance strategies',
      'Email support',
      '1 connected brokerage',
      'Mobile app access',
    ],
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: 'price_pro_monthly',
    features: [
      'Wheel, Covered Calls, Cash-Secured Puts',
      'Basic grid trading (spot grid)',
      'Priority support',
      'Up to 3 connected brokerages',
      'Basic analytics',
      'Risk management tools',
    ],
  },
  elite: {
    name: 'Elite',
    price: 149,
    priceId: 'price_elite_monthly',
    features: [
      'All grids (spot/futures/infinity)',
      'Advanced options strategies',
      'Advanced analytics & backtesting',
      'Unlimited connected brokerages',
      'Priority support',
      'API access',
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