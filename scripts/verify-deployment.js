import { execSync } from 'child_process';

const VERCEL_URL = 'https://trading-terminal-psi-ashen.vercel.app';

async function verify() {
  console.log('Fetching local git commit hash...');
  const localHash = execSync('git rev-parse HEAD').toString().trim();
  console.log(`Local HEAD: ${localHash}`);

  console.log(`\nFetching ${VERCEL_URL} ...`);
  
  // Adding cache-busting query string just in case, though the headers should fix it.
  const response = await fetch(`${VERCEL_URL}/?_ts=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Vercel URL. Status: ${response.status}`);
  }
  
  const html = await response.text();
  
  // Scrape the meta tag: <meta name="commit-hash" content="%VITE_COMMIT_HASH%" />
  const match = html.match(/<meta\s+name="commit-hash"\s+content="([^"]+)"\s*\/?>/i);
  if (!match) {
    throw new Error('Commit hash meta tag not found in Vercel HTML output.');
  }

  const vercelHash = match[1];
  console.log(`Vercel Hash: ${vercelHash}`);

  if (vercelHash !== localHash) {
    throw new Error(`\n❌ SYNCHRONIZATION FAILED: Vercel is serving stale commit (${vercelHash}), expected (${localHash}).`);
  }

  console.log(`\n✅ SYNCHRONIZATION SUCCESS: Vercel is serving the latest commit exactly (${localHash}).`);
}

verify().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
