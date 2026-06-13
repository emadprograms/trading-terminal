import { Timeframe, MarketResolution } from '../types';

/**
 * Maps application-level Timeframe to Capital.com API resolution strings.
 */
export const mapTimeframeToResolution = (tf: Timeframe): MarketResolution => {
  const mapping: Record<Timeframe, MarketResolution> = {
    '1min': 'MINUTE',
    '5min': 'MINUTE_5',
    '15min': 'MINUTE_15',
    '30min': 'MINUTE_30',
    '1H': 'HOUR',
    '1D': 'DAY',
  };

  return mapping[tf];
};

/**
 * Strips sensitive data (proxy URLs, internal headers) from error messages.
 * Prevents information disclosure in UI toasts.
 */
export const sanitizeErrorMessage = (error: any): string => {
  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (error?.response?.body?.message) {
    message = error.response.body.message;
  } else if (error?.message) {
    message = error.message;
  } else {
    message = JSON.stringify(error);
  }

  // 1. Strip URLs aggressively (localhost, proxy, internal domains)
  const urlPattern = /https?:\/\/[^\s]+/gi;
  message = message.replace(urlPattern, '[INTERNAL_URL]');

  // 2. Strip sensitive headers
  const sensitiveHeaders = ['x-security-token', 'CST', 'X-Environment'];
  sensitiveHeaders.forEach(header => {
    const headerPattern = new RegExp(`${header}[:=]?\\s*[^,\\s\\"]+`, 'gi');
    message = message.replace(headerPattern, (match) => {
      const parts = match.split(/[:=]/);
      return `${parts[0].trim()}: [REDACTED]`;
    });
  });

  // 3. Fallback for generic errors
  if (message === '{}' || !message) {
    return 'An unexpected error occurred';
  }

  return message;
};
