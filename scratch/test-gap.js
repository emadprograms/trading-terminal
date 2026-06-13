async function test() {
  const target = 'https://demo-api-capital.backend-capital.com';
  const key = '7pYh7dwJxXUCsGPH';

  console.log('Logging in...');
  const res = await fetch(`${target}/api/v1/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': key,
    },
    body: JSON.stringify({
      identifier: 'arshad.emad@gmail.com',
      password: 'Quiteneat@3'
    })
  });

  const cst = res.headers.get('CST');
  const xSec = res.headers.get('X-SECURITY-TOKEN');
  
  if (!cst || !xSec) {
      console.error('Failed to login!');
      return;
  }

  // Querying BTCUSD 5min candles around the gap (04:00 to 08:00 on June 13th, 2026)
  const epic = 'BTCUSD';
  const from = '2026-06-13T04:00:00';
  const to = '2026-06-13T08:00:00';
  const url = `${target}/api/v1/prices/${encodeURIComponent(epic)}?resolution=MINUTE_5&from=${from}&to=${to}`;
  console.log(`\nFetching prices from URL: ${url}`);

  const pricesRes = await fetch(url, {
    method: 'GET',
    headers: {
      'CST': cst,
      'X-SECURITY-TOKEN': xSec,
      'X-CAP-API-KEY': key,
    }
  });

  const data = await pricesRes.json();
  const prices = data.prices;
  
  if (!Array.isArray(prices)) {
    console.error('Expected array in data.prices, got:', data);
    return;
  }

  console.log(`Received ${prices.length} candles between 04:00 and 08:00.`);
  
  console.log('\n--- Listing all candle timestamps in this window ---');
  for (const p of prices) {
      console.log(`snapshotTime: ${p.snapshotTime} | snapshotTimeUTC: ${p.snapshotTimeUTC}`);
  }
}

test().catch(console.error);
