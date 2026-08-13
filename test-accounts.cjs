require('dotenv').config({ path: '.env.local' });

async function check() {
  const login = await fetch('https://api-capital.backend-capital.com/api/v1/session', {
    method: 'POST',
    headers: { 'X-CAP-API-KEY': process.env.CAPITAL_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.VITE_CAPITAL_USER, password: process.env.VITE_CAPITAL_PASSWORD })
  });
  const cst = login.headers.get('cst');
  const xst = login.headers.get('x-security-token');

  const accountsRes = await fetch('https://api-capital.backend-capital.com/api/v1/accounts', {
    headers: { 'CST': cst, 'X-SECURITY-TOKEN': xst }
  });
  const data = await accountsRes.json();
  console.log("Accounts:", data.accounts.map(a => ({ id: a.accountId, name: a.accountName, type: a.accountType })));
}
check();
