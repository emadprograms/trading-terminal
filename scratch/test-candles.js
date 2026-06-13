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
  console.log('CST:', cst ? 'OK' : 'MISSING');
  console.log('X-SECURITY-TOKEN:', xSec ? 'OK' : 'MISSING');

  // Querying BTCUSD 5min candles ending at a specific time
  const epic = 'BTCUSD';
  const to = '2026-06-13T07:00:00';
  const url = `${target}/api/v1/prices/${encodeURIComponent(epic)}?resolution=MINUTE_5&to=${to}&max=1000`;
  console.log(`Fetching prices from URL: ${url}`);

  const pricesRes = await fetch(url, {
    method: 'GET',
    headers: {
      'CST': cst,
      'X-SECURITY-TOKEN': xSec,
      'X-CAP-API-KEY': key,
    }
  });

  console.log('Response Status:', pricesRes.status);
  const data = await pricesRes.json();
  const prices = data.prices;
  
  if (!Array.isArray(prices)) {
    console.error('Expected array in data.prices, got:', typeof prices, data);
    return;
  }

  console.log(`Received ${prices.length} candles.`);
  if (prices.length > 0) {
    console.log('First candle:', JSON.stringify(prices[0]));
    console.log('Last candle:', JSON.stringify(prices[prices.length - 1]));
  }
}

test().catch(console.error);
