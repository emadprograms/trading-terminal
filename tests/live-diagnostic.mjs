import fs from 'fs';
import path from 'path';
import { WebSocket } from 'ws';
import { fetch } from 'undici';

// Resolve the .env file in the current directory
const dotenvPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(dotenvPath, 'utf8');

const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const identifier = env.CAPITAL_USER;
const password = env.CAPITAL_PASSWORD;
const apiKey = env.CAPITAL_API_KEY;

const API_BASE = 'https://demo-api-capital.backend-capital.com/api/v1';

async function test() {
  console.log("Logging in...");
  const loginRes = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': apiKey
    },
    body: JSON.stringify({ identifier, password, encryptedPassword: false })
  });

  const cst = loginRes.headers.get('CST');
  const sec = loginRes.headers.get('X-SECURITY-TOKEN');
  const loginData = await loginRes.json();
  
  if (!cst || !sec) {
    console.error("Login failed", loginData);
    return;
  }
  
  console.log("Logged in! Connecting to WS...");
  const ws = new WebSocket('wss://api-streaming-capital.backend-capital.com/connect');
  
  ws.on('open', () => {
    // Authenticate WS
    const authMessage = JSON.stringify({
      destination: 'ping',
      correlationId: 'test-123',
      cst,
      securityToken: sec
    });
    ws.send(authMessage);
    console.log("WebSocket connected and authenticated");
    
    // Place order
    setTimeout(async () => {
      console.log("Placing Market Order with guaranteedStop: false...");
      const orderPayload = {
        epic: "SPY",
        direction: "BUY",
        size: 1,
        type: "MARKET",
        guaranteedStop: false
      };
      
      const orderRes = await fetch(`${API_BASE}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CST': cst,
          'X-SECURITY-TOKEN': sec
        },
        body: JSON.stringify(orderPayload)
      });
      
      const orderData = await orderRes.json();
      console.log("REST Response:", orderData);
    }, 2000);
  });
  
  ws.on('message', (data) => {
    const msg = data.toString();
    console.log("WS RECV:", msg);
  });
  
  setTimeout(() => process.exit(0), 10000);
}

test();
