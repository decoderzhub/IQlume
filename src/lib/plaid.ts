import { PlaidLinkOptions, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { supabase } from './supabase';

export const plaidConfig: Omit<PlaidLinkOptions, 'onSuccess' | 'onExit'> = {
  env: import.meta.env.VITE_PLAID_ENV || 'sandbox', // 'sandbox', 'development', or 'production'
  clientName: 'brokernomex Trading Platform',
  product: ['transactions', 'auth', 'identity'],
  countryCodes: ['US'],
  language: 'en',
};

export const createPlaidLinkToken = async (userId: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No valid session found. Please log in again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/plaid/create-link-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create link token: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  const data = await response.json();
  return data.link_token;
};

export const exchangePlaidPublicToken = async (publicToken: string, metadata: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No valid session found. Please log in again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/plaid/exchange-public-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ 
      public_token: publicToken,
      metadata,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange public token: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  return response.json();
};

export const supportedBanks = [
  { name: 'Wells Fargo', id: 'wells_fargo', logo: '🏦' },
  { name: 'Chase', id: 'chase', logo: '🏦' },
  { name: 'Citi', id: 'citi', logo: '🏦' },
  { name: 'HSBC', id: 'hsbc', logo: '🏦' },
  { name: 'Chime', id: 'chime', logo: '💳' },
  { name: 'American Express', id: 'amex', logo: '💳' },
  { name: 'Bank of America', id: 'boa', logo: '🏦' },
  { name: 'Capital One', id: 'capital_one', logo: '🏦' },
  { name: 'Ally Bank', id: 'ally', logo: '🏦' },
  { name: 'Navy Federal', id: 'navy_federal', logo: '🏦' },
];

export const supportedBrokerages = [
  { name: 'Vanguard', id: 'vanguard', logo: '📈', type: 'stocks' },
  { name: 'TD Ameritrade', id: 'tdameritrade', logo: '📊', type: 'stocks' },
  { name: 'Charles Schwab', id: 'schwab', logo: '📈', type: 'stocks' },
  { name: 'Robinhood', id: 'robinhood', logo: '🤖', type: 'stocks' },
  { name: 'Alpaca', id: 'alpaca', logo: '🦙', type: 'stocks' },
  { name: 'Coinbase', id: 'coinbase', logo: '₿', type: 'crypto' },
  { name: 'Gemini', id: 'gemini', logo: '♊', type: 'crypto' },
  { name: 'Interactive Brokers', id: 'ibkr', logo: '📊', type: 'stocks' },
  { name: 'Binance', id: 'binance', logo: '🟡', type: 'crypto' },
];