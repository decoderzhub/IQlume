import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const subscriptionTiers = {
  starter: {
    name: 'Starter',
    price: 0,
    priceId: null, // No Stripe price ID for free tier
    trialDays: 30,
    features: [
      'Limited bots for activation',
      'DCA and Smart Rebalance strategies',
      '30-day free trial',
      'Email support',
      'Mobile app access',
    ],
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: 'price_pro_monthly',
    trialDays: 0,
    features: [
      'Wheel, Covered Calls, Cash-Secured Puts',
      'Basic grid trading (spot grid)',
      'Priority support',
      'Basic analytics',
      'Risk management tools',
    ],
  },
  elite: {
    name: 'Elite',
    price: 149,
    priceId: 'price_elite_monthly',
    trialDays: 0,
    features: [
      'All grids (spot/futures/infinity)',
      'Advanced options strategies',
      'Advanced analytics & backtesting',
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