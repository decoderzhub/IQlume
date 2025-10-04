/**
 * Market hours utilities
 * US Stock Market: 9:30 AM - 4:00 PM EST (Monday-Friday)
 * Excludes market holidays
 */

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  reason?: string;
}

/**
 * US Stock Market Holidays 2024-2025
 */
const MARKET_HOLIDAYS_2024_2025 = [
  '2024-01-01', // New Year's Day
  '2024-01-15', // Martin Luther King Jr. Day
  '2024-02-19', // Presidents' Day
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving
  '2024-12-25', // Christmas
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
  '2025-10-04', // Added for demo - Market closed today for testing
];

/**
 * Check if a date is a market holiday
 */
function isMarketHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return MARKET_HOLIDAYS_2024_2025.includes(dateStr);
}

/**
 * Convert local time to EST/EDT
 */
function toEasternTime(date: Date): Date {
  // Create a date string in Eastern Time
  const estString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(estString);
}

/**
 * Get the next market open time
 */
function getNextMarketOpen(now: Date): Date {
  const eastern = toEasternTime(now);
  let nextOpen = new Date(eastern);

  // Set to next 9:30 AM
  nextOpen.setHours(9, 30, 0, 0);

  // If it's past 9:30 AM today, move to tomorrow
  if (eastern.getHours() > 9 || (eastern.getHours() === 9 && eastern.getMinutes() >= 30)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip weekends
  while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  }

  // Skip holidays
  while (isMarketHoliday(nextOpen)) {
    nextOpen.setDate(nextOpen.getDate() + 1);
    // Skip weekends again if we land on one
    while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
  }

  return nextOpen;
}

/**
 * Get the next market close time
 */
function getNextMarketClose(now: Date): Date {
  const eastern = toEasternTime(now);
  const nextClose = new Date(eastern);

  // Set to 4:00 PM today
  nextClose.setHours(16, 0, 0, 0);

  // If it's past 4:00 PM, this will be handled by market open logic
  return nextClose;
}

/**
 * Check if the stock market is currently open
 */
export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const eastern = toEasternTime(now);

  const day = eastern.getDay();
  const hours = eastern.getHours();
  const minutes = eastern.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Check if it's a weekend
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      nextOpen: getNextMarketOpen(now),
      reason: 'Weekend - Market opens Monday at 9:30 AM EST',
    };
  }

  // Check if it's a holiday
  if (isMarketHoliday(eastern)) {
    return {
      isOpen: false,
      nextOpen: getNextMarketOpen(now),
      reason: 'Market Holiday',
    };
  }

  // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes) EST
  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
  const marketClose = 16 * 60; // 4:00 PM in minutes

  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    return {
      isOpen: true,
      nextClose: getNextMarketClose(now),
    };
  }

  // Market is closed
  if (timeInMinutes < marketOpen) {
    return {
      isOpen: false,
      nextOpen: getNextMarketOpen(now),
      reason: `Pre-market - Opens at 9:30 AM EST`,
    };
  }

  return {
    isOpen: false,
    nextOpen: getNextMarketOpen(now),
    reason: 'After hours - Market opens tomorrow at 9:30 AM EST',
  };
}

/**
 * Format time remaining until market open/close
 */
export function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Check if crypto market is open (24/7)
 */
export function isCryptoMarketOpen(): boolean {
  return true; // Crypto trades 24/7
}
