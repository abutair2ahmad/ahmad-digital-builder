import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
const DIR = '/home/user/ahmad-digital-builder/nexora-instagram';
const only = process.argv.slice(2);
const posts = only.length ? only : ['01','02','03','04','05','06','07','08','09'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('  page error:', m.text().slice(0, 140)); });
page.on('requestfailed', r => console.log('  failed:', r.url().slice(-70)));

for (const n of posts) {
  await page.goto(`file://${DIR}/post-${n}.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/out/nexora-post-${n}.png` });
  console.log('✓ post', n);
}
await browser.close();
