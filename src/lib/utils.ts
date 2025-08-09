import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Market data utilities
export function formatMarketData(data: any) {
  return {
    price: data.bid_price || data.ask_price || data.price || 0,
    change: data.change || 0,
    change_percent: data.change_percent || 0,
    volume: data.volume || 0,
    high: data.high || 0,
    low: data.low || 0,
    open: data.open || 0,
  };
}

export function calculateMidPrice(bid: number, ask: number): number {
  return (bid + ask) / 2;
}

export function calculateSpread(bid: number, ask: number): number {
  return ask - bid;
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}