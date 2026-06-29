import { chromium } from 'playwright';

const LONG = 25 * 60 * 1000;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(LONG);

  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' || t.includes('compile') || t.includes('format') || t.includes('pdf') || t.includes('error') || t.includes('Downloading') || t.includes('downloading')) {
      process.stdout.write(`[${msg.type()}] ${t}\n`);
    }
  });
  // Don't write pageerror to stderr — it would cause PowerShell to interpret it as an error
  // and show confusing output. Just log it as regular output.
  page.on('pageerror', err => process.stdout.write(`[pageerror] ${err.message}\n`));

  console.log('Loading app (clearing project IDB, purging cached pfb from engine IDB)...');
  await page.goto('http://localhost:5173', { timeout: 30000 });

  // Clear ALL IndexedDB databases including 'll-tex-pkgs'.
  // This ensures no stale pfb/vf entries from previous runs bypass the proxy blocks.
  // The format will be recompiled from scratch (~12 min), but the compile itself
  // is then fast (PK fonts from kpsewhich, no Type1 subsetting).
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
    localStorage.clear();
  }).catch(() => {});

  await page.reload({ timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // Create example project
  const newBtn = page.locator('button').filter({ hasText: /new project/i }).first();
  await newBtn.click();
  const exampleBtn = page.locator('button').filter({ hasText: /example project/i });
  await exampleBtn.waitFor({ timeout: 5000 });
  await exampleBtn.click();
  console.log('Created example project');

  // Wait for editor to open
  await page.waitForTimeout(2000);

  // Wait for "Compiling..." to go away — compile finishes when button changes back.
  // First run: format compilation (~12 min) + PK font downloads (seconds).
  // Subsequent runs: format from IDB cache (seconds) + PK font downloads (seconds).
  const t0 = Date.now();
  console.log('Waiting for compile to finish (first run: ~12 min format + seconds for PK fonts)...');
  // Wait for compile to finish. Use polling loop instead of waitForFunction so
  // that a pageerror (WASM crash) doesn't kill the wait — we still want to check
  // the result after a crash to see the error panel.
  const t1 = Date.now();
  let compileFinished = false;
  while (Date.now() - t1 < LONG) {
    const done = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const isCompiling = btns.some(b => b.textContent?.includes('Compiling'));
      const hasCompile = btns.some(b => /^(re)?compile$/i.test(b.textContent?.trim() || ''));
      return !isCompiling && hasCompile;
    }).catch(() => false);
    if (done) { compileFinished = true; break; }
    await new Promise(r => setTimeout(r, 2000));
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`Compile ${compileFinished ? 'finished' : 'TIMED OUT'} in ${elapsed}s total!`);

  // Check if PDF is visible
  const hasPdfIframe = await page.locator('iframe[src*="blob:"]').isVisible().catch(() => false);
  const hasPdfEmbed = await page.locator('embed[src*="blob:"]').isVisible().catch(() => false);

  // Check all iframes
  const iframes = await page.$$eval('iframe', els => els.map(e => ({ src: e.src, class: e.className })));
  console.log('PDF result: iframe=', hasPdfIframe, 'embed=', hasPdfEmbed, 'all iframes:', JSON.stringify(iframes));

  // Grab any visible text that looks like a compile log/error panel
  const errorText = await page.evaluate(() => {
    const selectors = ['[class*="log"]', '[class*="error"]', '[class*="Error"]', 'pre', 'code'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 5) {
        return el.textContent.slice(0, 500);
      }
    }
    return null;
  });
  if (errorText) console.log('Log/error panel:', errorText);

  // Get button states
  const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
  console.log('Buttons after compile:', btns);

  await page.screenshot({ path: 'C:/Users/magic/AppData/Local/Temp/app-compiled.png' });
  console.log('Screenshot: app-compiled.png');

  if (!hasPdfIframe && !hasPdfEmbed) {
    console.error('FAILED: No PDF visible after compile');
    process.exit(1);
  }

  await browser.close();
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
