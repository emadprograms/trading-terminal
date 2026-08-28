import dotenv from 'dotenv';
import ky from 'ky';

dotenv.config();

const API_KEY = process.env.CAPITAL_API_KEY;
const USER = process.env.VITE_CAPITAL_USER;
const PASS = process.env.VITE_CAPITAL_PASSWORD;

async function run() {
  const url = 'https://api-capital.backend-capital.com/api/v1';
  
  // 1. Auth
  const authRes = await ky.post(`${url}/session`, {
    headers: {
      'X-CAP-API-KEY': API_KEY,
    },
    json: {
      identifier: USER,
      password: PASS
    }
  });

  const cst = authRes.headers.get('CST');
  const secToken = authRes.headers.get('X-SECURITY-TOKEN');
  
  // 2. Place Trade
  console.log('Placing trade...');
  const orderRes = await ky.post(`${url}/positions`, {
    headers: { 'CST': cst!, 'X-SECURITY-TOKEN': secToken! },
    json: { epic: 'BTCUSD', size: 0.02, direction: 'BUY' }
  }).json() as any;
  
  const dealRef = orderRes.dealReference;
  console.log('Order placed, dealRef:', dealRef);
  
  // wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));
  
  // 4. Partially close it by sending a counter order of 0.01
  
  // 4. Partially close it by sending a counter order of 0.01
  console.log('Partially closing...');
  await ky.post(`${url}/positions`, {
    headers: { 'CST': cst!, 'X-SECURITY-TOKEN': secToken! },
    json: { epic: 'BTCUSD', size: 0.01, direction: 'SELL' }
  }).json();
  
  // wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));
  
  // 5. Fetch Activity
  const actRes = await ky.get(`${url}/history/activity?detailed=true&lastPeriod=3600`, {
    headers: {
      'CST': cst!,
      'X-SECURITY-TOKEN': secToken!
    }
  }).json();

  const activities = (actRes as any).activities || [];
  console.log(JSON.stringify(activities.slice(0, 5), null, 2));
}

run().catch(console.error);
