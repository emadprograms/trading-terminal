const KNOWN_UTC_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'AVAX', 'LINK', 'LTC'
]);

export function getTzForTicker(ticker: string): string {
  if (!ticker) return 'UTC';
  
  const t = ticker.toUpperCase();
  
  if (
    t.includes('USD') || 
    t.includes('/') || 
    KNOWN_UTC_TICKERS.has(t) ||
    t.startsWith('^') || 
    t.startsWith('/') || 
    t.startsWith('=')
  ) {
    return 'UTC';
  }

  return 'America/New_York';
}

export function getTzLabel(tz: string): string {
  return tz === 'America/New_York' ? 'ET' : 'UTC';
}

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: 'numeric',
  hour12: false
});

let lastDay = -1;
let dayOffset = 0; // in minutes

export function getSessionType(timestamp: number, ticker: string): 'PRE' | 'RTH' | 'POST' | 'OTHER' {
  const tz = getTzForTicker(ticker);
  if (tz === 'UTC') return 'RTH';

  const date = new Date(timestamp * 1000);
  const day = Math.floor(timestamp / 86400);
  
  if (day !== lastDay) {
      // Recalculate offset for the day
      const nyStr = formatter.format(date); // "H:MM" or "HH:MM"
      const [h, m] = nyStr.split(':').map(Number);
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      
      const nyTotal = h * 60 + m;
      const utcTotal = utcHours * 60 + utcMinutes;
      
      dayOffset = nyTotal - utcTotal;
      // Handle wrap around (day boundary)
      if (dayOffset > 720) dayOffset -= 1440;
      if (dayOffset < -720) dayOffset += 1440;
      
      lastDay = day;
  }
  
  const totalMinutesUTC = date.getUTCHours() * 60 + date.getUTCMinutes();
  let totalMinutes = totalMinutesUTC + dayOffset;
  if (totalMinutes < 0) totalMinutes += 1440;
  if (totalMinutes >= 1440) totalMinutes -= 1440;

  if (totalMinutes >= 240 && totalMinutes < 570) return 'PRE';
  if (totalMinutes >= 570 && totalMinutes < 960) return 'RTH';
  if (totalMinutes >= 960 && totalMinutes < 1200) return 'POST';
  return 'OTHER';
}
