const fs = require('fs');
const file = 'src/components/AccountHeader.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "const accounts = await accountApi.fetchAccounts();",
  "let accounts; try { accounts = await accountApi.fetchAccounts(); } catch (err) { console.error('[AccountHeader] fetch error:', err); throw err; }"
);
fs.writeFileSync(file, content);
