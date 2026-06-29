import { chromium } from 'playwright';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);

  page.on('console', msg => {
    const text = msg.text();
    process.stdout.write(`[console] ${text}\n`);
  });
  page.on('pageerror', err => process.stderr.write(`[pageerror] ${err.message}\n`));

  console.log('Navigating...');
  await page.goto('http://localhost:5173/test-compile.html?auto=1', { timeout: 30000 });
  console.log('Page loaded. Waiting for compile (format compilation takes 2-5 min on first run)...');

  await page.waitForFunction(() => window._testDone === true, null, { timeout: TIMEOUT_MS, polling: 3000 });

  const result = await page.evaluate(() => window._testResult);
  const logText = await page.$eval('#log', el => el.textContent).catch(() => '');

  console.log('\n=== TEST RESULT ===');
  console.log('status:', result.status, '| hasPdf:', result.hasPdf, '| pdfBytes:', result.pdfBytes);
  console.log('\n=== COMPILE LOG (last 3000 chars) ===');
  console.log(logText.slice(-3000));

  await browser.close();
  process.exit(result.hasPdf ? 0 : 1);
}

main().catch(e => { console.error('Test failed:', e.message); process.exit(1); });
