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

  console.log('Searching for "gas"...');
  const searchRes = await fetch(`${target}/api/v1/markets?searchTerm=gas`, {
    method: 'GET',
    headers: {
      'CST': cst,
      'X-SECURITY-TOKEN': xSec,
      'X-CAP-API-KEY': key,
    }
  });

  console.log('Status:', searchRes.status);
  const text = await searchRes.text();
  console.log('Response:', text.substring(0, 500));
}

test().catch(console.error);
