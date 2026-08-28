import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('fetch activities', async ({ request }) => {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  let apiKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('CAPITAL_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
    }
  }

  // authenticate
  const loginRes = await request.post('https://demo-api-capital.backend-capital.com/api/v1/session', {
    headers: {
      'X-CAP-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    data: {
      identifier: process.env.CAPITAL_IDENTIFIER || 'test',
      password: process.env.CAPITAL_PASSWORD || 'test'
    }
  });

  const cst = loginRes.headers()['cst'];
  const xSec = loginRes.headers()['x-security-token'];

  const now = new Date();
  const from = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('.')[0];
  const to = now.toISOString().split('.')[0];

  const activitiesRes = await request.get(`https://demo-api-capital.backend-capital.com/api/v1/history/activity?detailed=true&from=${from}&to=${to}`, {
    headers: {
      'X-CAP-API-KEY': apiKey,
      'CST': cst,
      'X-SECURITY-TOKEN': xSec
    }
  });

  const activities = await activitiesRes.json();
  console.log("ACTIVITIES:", JSON.stringify(activities, null, 2));
});
