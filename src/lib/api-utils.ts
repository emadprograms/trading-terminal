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
