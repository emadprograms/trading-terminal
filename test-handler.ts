import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import http from 'http';
import handler from './api/market.js';
import { parse } from 'url';

const server = http.createServer(async (req, res) => {
  // Mock CST and X-SECURITY-TOKEN
  req.headers['x-environment'] = 'DEMO';
  
  // Need to get valid tokens
  const target = 'https://demo-api-capital.backend-capital.com';
  const key = process.env.CAPITAL_API_KEY;

  const sessionRes = await fetch(`${target}/api/v1/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': key,
    },
    body: JSON.stringify({
      identifier: process.env.CAPITAL_USER,
      password: process.env.CAPITAL_PASSWORD
    })
  });

  req.headers['cst'] = sessionRes.headers.get('CST');
  req.headers['x-security-token'] = sessionRes.headers.get('X-SECURITY-TOKEN');

  await handler(req, res);
});

server.listen(3001, () => {
  console.log('Test proxy running on 3001');
  
  // Test it
  fetch('http://localhost:3001/api/market/v1/markets?searchTerm=gas')
    .then(res => res.json())
    .then(data => {
      console.log('Data:', JSON.stringify(data).substring(0, 500));
      process.exit(0);
    })
    .catch(console.error);
});
