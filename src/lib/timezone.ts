/**
 * Timezone utilities for accurate time display and trading operations
 *
 * CRITICAL: Stock markets operate on Eastern Time (America/New_York)
 * Users may be in different timezones, so we need to convert appropriately
 */

export interface TimezoneConfig {
  timezone: string;
  displayName: string;
  offset: string;
}

// Common US timezones for trading
export const COMMON_TIMEZONES: TimezoneConfig[] = [
  { timezone: 'America/New_York', displayName: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { timezone: 'America/Chicago', displayName: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { timezone: 'America/Denver', displayName: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { timezone: 'America/Los_Angeles', displayName: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { timezone: 'America/Anchorage', displayName: 'Alaska Time (AKT)', offset: 'UTC-9/-8' },
  { timezone: 'Pacific/Honolulu', displayName: 'Hawaii Time (HT)', offset: 'UTC-10' },
  { timezone: 'Europe/London', displayName: 'London (GMT/BST)', offset: 'UTC+0/+1' },
  { timezone: 'Europe/Paris', displayName: 'Central European Time', offset: 'UTC+1/+2' },
  { timezone: 'Asia/Tokyo', displayName: 'Japan Standard Time', offset: 'UTC+9' },
  { timezone: 'Asia/Shanghai', displayName: 'China Standard Time', offset: 'UTC+8' },
  { timezone: 'Asia/Hong_Kong', displayName: 'Hong Kong Time', offset: 'UTC+8' },
  { timezone: 'Asia/Singapore', displayName: 'Singapore Time', offset: 'UTC+8' },
  { timezone: 'Australia/Sydney', displayName: 'Australian Eastern Time', offset: 'UTC+10/+11' },
];

/**
 * Get user's browser timezone
 */
export const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Format a date in the user's timezone
 */
export const formatInTimezone = (
  date: Date | string | number,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
};

/**
 * Format date for display (short format)
 */
export const formatDateShort = (
  date: Date | string | number,
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date for display (date only)
 */
export const formatDateOnly = (
  date: Date | string | number,
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
    second: undefined,
  });
};

/**
 * Format time only
 */
export const formatTimeOnly = (
  date: Date | string | number,
  timezone: string
): string => {
  return formatInTimezone(date, timezone, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    year: undefined,
    month: undefined,
    day: undefined,
  });
};

/**
 * Convert a time from one timezone to another
 */
export const convertTimezone = (
  date: Date | string | number,
  fromTimezone: string,
  toTimezone: string
): Date => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  // Get the time in the source timezone
  const sourceTime = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dateObj);

  // Parse and create new date in target timezone
  return new Date(sourceTime);
};

/**
 * Check if market is open (NYSE hours: 9:30 AM - 4:00 PM ET, Mon-Fri)
 */
export const isMarketOpen = (userTimezone: string): boolean => {
  const now = new Date();

  // Get current time in ET (market timezone)
  const etTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).format(now);

  const [weekday, time] = etTime.split(', ');
  const [hours, minutes] = time.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;

  // Check if weekend
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }

  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return currentMinutes >= marketOpen && currentMinutes < marketClose;
};

/**
 * Get next market open time in user's timezone
 */
export const getNextMarketOpen = (userTimezone: string): Date => {
  const now = new Date();
  let nextOpen = new Date(now);

  // Set to 9:30 AM ET
  nextOpen.setHours(9, 30, 0, 0);

  const etDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(now);

  // If it's weekend or past 4 PM ET, move to next weekday
  if (etDateStr === 'Sat') {
    nextOpen.setDate(nextOpen.getDate() + 2); // Monday
  } else if (etDateStr === 'Sun') {
    nextOpen.setDate(nextOpen.getDate() + 1); // Monday
  } else if (isMarketOpen(userTimezone)) {
    // Market is open, return current time
    return now;
  } else {
    // Check if we need to move to tomorrow
    const etHours = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        hour12: false,
      }).format(now)
    );
    if (etHours >= 16) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
  }

  return nextOpen;
};

/**
 * Get market close time for today in user's timezone
 */
export const getMarketClose = (userTimezone: string): string => {
  const now = new Date();
  const closeTime = new Date(now);
  closeTime.setHours(16, 0, 0, 0); // 4:00 PM ET

  return formatTimeOnly(closeTime, userTimezone);
};

/**
 * Format timestamp with timezone indicator
 */
export const formatWithTimezone = (
  date: Date | string | number,
  timezone: string
): string => {
  const formatted = formatInTimezone(date, timezone);
  const tzAbbr = getTimezoneAbbreviation(timezone);
  return `${formatted} ${tzAbbr}`;
};

/**
 * Get timezone abbreviation (ET, CT, PT, etc.)
 */
export const getTimezoneAbbreviation = (timezone: string): string => {
  const tzConfig = COMMON_TIMEZONES.find(tz => tz.timezone === timezone);
  if (tzConfig) {
    const match = tzConfig.displayName.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  }

  // Fallback: try to extract from timezone string
  const parts = timezone.split('/');
  return parts[parts.length - 1].substring(0, 3).toUpperCase();
};

/**
 * Validate timezone string
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
};
