require('dotenv').config({ path: '.env.local' });

async function check() {
  const login = await fetch('https://demo-api-capital.backend-capital.com/api/v1/session', {
    method: 'POST',
    headers: { 'X-CAP-API-KEY': process.env.CAPITAL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.VITE_CAPITAL_USER, password: process.env.VITE_CAPITAL_PASSWORD })
  });
  let cst = login.headers.get('cst');
  let xst = login.headers.get('x-security-token');

  const now = Date.now();
  const formatIso = (date) => date.toISOString().split('.')[0];
  let totalDemo = 0;
  let totalDemoTsla = 0;
  for (let i=0; i<7; i++) {
    const toDate = new Date(Date.now() - i * 24 * 3600 * 1000);
    const fromDate = new Date(Date.now() - (i + 1) * 24 * 3600 * 1000);
    const res3 = await fetch(`https://demo-api-capital.backend-capital.com/api/v1/history/activity?detailed=true&from=${formatIso(fromDate)}&to=${formatIso(toDate)}&_t=${now}`, {
      headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
    });
    const hist3 = await res3.json();
    if(hist3.activities) {
      totalDemo += hist3.activities.length;
      totalDemoTsla += hist3.activities.filter(a => a.epic && a.epic.includes('TSLA')).length;
    }
  }
  console.log("Demo Total:", totalDemo, "TSLA:", totalDemoTsla);
  
  const login2 = await fetch('https://api-capital.backend-capital.com/api/v1/session', {
    method: 'POST',
    headers: { 'X-CAP-API-KEY': process.env.CAPITAL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.VITE_CAPITAL_USER, password: process.env.VITE_CAPITAL_PASSWORD })
  });
  cst = login2.headers.get('cst');
  xst = login2.headers.get('x-security-token');

  let totalLive = 0;
  let totalLiveTsla = 0;
  for (let i=0; i<7; i++) {
    const toDate = new Date(Date.now() - i * 24 * 3600 * 1000);
    const fromDate = new Date(Date.now() - (i + 1) * 24 * 3600 * 1000);
    const res3 = await fetch(`https://api-capital.backend-capital.com/api/v1/history/activity?detailed=true&from=${formatIso(fromDate)}&to=${formatIso(toDate)}&_t=${now}`, {
      headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
    });
    const hist3 = await res3.json();
    if(hist3.activities) {
      totalLive += hist3.activities.length;
      totalLiveTsla += hist3.activities.filter(a => a.epic && a.epic.includes('TSLA')).length;
    }
  }
  console.log("Live Total:", totalLive, "TSLA:", totalLiveTsla);
}
check();
