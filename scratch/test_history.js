const user = "arshad.emad@gmail.com";
const password = "Quiteneat@3";
const apiKey = "7pYh7dwJxXUCsGPH";
const baseUrl = "https://demo-api-capital.backend-capital.com";

async function test() {
  const loginRes = await fetch(`${baseUrl}/api/v1/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CAP-API-KEY": apiKey
    },
    body: JSON.stringify({ identifier: user, password: password })
  });

  const cst = loginRes.headers.get("CST");
  const securityToken = loginRes.headers.get("X-SECURITY-TOKEN");

  // Query 7 days sequentially (1 day at a time)
  console.log("Starting sequential 7-day query...");
  const daysToFetch = 7;
  const now = new Date();
  
  for (let i = 0; i < daysToFetch; i++) {
    const to = new Date(now.getTime() - i * 24 * 3600000);
    const from = new Date(now.getTime() - (i + 1) * 24 * 3600000);
    
    // Format: YYYY-MM-DDTHH:MM:SS (omit .ms and Z)
    const toStr = to.toISOString().split('.')[0];
    const fromStr = from.toISOString().split('.')[0];
    
    const url = `${baseUrl}/api/v1/history/activity?detailed=true&from=${fromStr}&to=${toStr}`;
    console.log(`Fetching Day ${i + 1} (${fromStr} to ${toStr})...`);
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-CAP-API-KEY": apiKey,
        "CST": cst,
        "X-SECURITY-TOKEN": securityToken
      }
    });
    
    console.log(`Day ${i + 1} Status:`, res.status);
    const data = await res.json();
    console.log(`Day ${i + 1} Activities Count:`, data.activities ? data.activities.length : 0);
    
    // Throttle slightly to respect rate limit
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

test().catch(console.error);
