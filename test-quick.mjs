import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20 * 60 * 1000);
  page.on('console', msg => { const t = msg.text(); if(t.includes('pdf')||t.includes('format')||t.includes('Format')||t.includes('error')||t.includes('Aborted')) process.stdout.write('[console] '+t+'\n'); });
  page.on('pageerror', e => process.stderr.write('[pageerror] '+e.message+'\n'));
  // Clear IDB first (fresh state)
  await page.goto('http://localhost:5173/test-compile.html?auto=1', {timeout:30000});
  await page.evaluate(async () => { const dbs = await indexedDB.databases(); for(const d of dbs) if(d.name) indexedDB.deleteDatabase(d.name); });
  await page.reload({timeout:15000});
  console.log('Waiting for compile (Hello World, ~5 min for format on fresh IDB)...');
  await page.waitForFunction(() => window._testDone === true, null, {timeout: 15*60*1000, polling:3000});
  const r = await page.evaluate(() => window._testResult);
  console.log('RESULT:', JSON.stringify(r));
  await browser.close();
  process.exit(r.hasPdf ? 0 : 1);
}
main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
