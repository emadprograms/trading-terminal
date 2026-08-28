import { processNetting } from './src/utils/nettingEngine';

async function run() {
  const identifier = "arshad.emad@gmail.com";
  const password = "Quiteneat@3";
  const apiKey = "7pYh7dwJxXUCsGPH";

  const loginRes = await fetch("https://demo-api-capital.backend-capital.com/api/v1/session", {
    method: "POST",
    headers: {
      "X-CAP-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ identifier, password })
  });
  
  if (!loginRes.ok) throw new Error("Login failed");

  const cst = loginRes.headers.get("CST");
  const xSec = loginRes.headers.get("X-SECURITY-TOKEN");

  const allActivities: any[] = [];
  const formatIso = (date: Date) => date.toISOString().split('.')[0];
  
  // Look back 14 days
  for (let i = 0; i < 14; i++) {
    const toDate = new Date(Date.now() - i * 24 * 3600 * 1000);
    const fromDate = new Date(Date.now() - (i + 1) * 24 * 3600 * 1000);
    
    const res = await fetch(`https://demo-api-capital.backend-capital.com/api/v1/history/activity?detailed=true&from=${formatIso(fromDate)}&to=${formatIso(toDate)}`, {
      headers: { "CST": cst!, "X-SECURITY-TOKEN": xSec! }
    });
    
    const data = await res.json();
    if (data && data.activities) {
        allActivities.push(...data.activities);
    } else if (Array.isArray(data)) {
        allActivities.push(...data);
    }
  }

  const mapped = allActivities
    .filter(a => {
      const isValidType = a.type === 'POSITION';
      const isFilledStatus = ['ACCEPTED', 'EXECUTED', 'FILLED', 'OPENED', 'CLOSED'].includes(a.status);
      return isValidType && isFilledStatus && a.details && (a.details.level || a.details.openPrice);
    })
    .map(a => {
      const d = a.details;
      const rawDate = a.dateUTC || a.date;
      let timestamp = Date.now();
      if (rawDate) {
        const dateStr = rawDate.endsWith('Z') ? rawDate : `${rawDate}Z`;
        timestamp = new Date(dateStr).getTime();
      }
      return {
        id: `${a.dealId}_${d.direction}_${timestamp}`,
        dealId: a.dealId,
        epic: a.epic || '',
        size: Math.abs(d.size || 0),
        price: d.level || d.openPrice || 0,
        direction: d.direction,
        timestamp,
        action: d.openPrice ? 'EXIT' : 'ENTRY',
        openPrice: d.openPrice
      };
    });

  console.log("=== EXECUTIONS FROM CAPITAL ===");
  if (mapped.length === 0) {
      console.log("No mapped executions found.");
  } else {
      console.log(JSON.stringify(mapped.slice(0, 10), null, 2));
  }

  const netted = processNetting(mapped as any);
  
  console.log("\n=== FINAL NETTED ORDER HISTORY ===");
  console.log(JSON.stringify(netted.slice(0, 10), null, 2));
}

run().catch(console.error);
