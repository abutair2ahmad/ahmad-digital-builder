#!/usr/bin/env node
/**
 * Browser test and screenshot run.
 *
 * Drives a real Chromium through the flows a visitor and a receptionist
 * actually perform, fails on console errors, and writes screenshots to
 * ./screenshots.
 *
 * Usage:  node scripts/browser-test.mjs [baseUrl]
 * Note:   booking creation is rate limited per IP, so run this against a
 *         freshly started server.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { existsSync, appendFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = 'screenshots';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'nacre-demo';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

let passed = 0;
let failed = 0;
const consoleProblems = [];
const expectedNetworkFailures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  [32mPASS[0m  ${name}`);
  } else {
    failed += 1;
    console.log(`  [31mFAIL[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n[1m${title}[0m`);
}

/**
 * Collects console errors. Network failures for responses the test asks for on
 * purpose — the 404 page, the deliberately wrong password — are recorded
 * separately rather than counted as defects.
 */
function watchConsole(page, label) {
  page.on('console', async (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/Failed to load resource: the server responded with a status of (401|404)/.test(text)) {
      expectedNetworkFailures.push(`${label}: ${text}`);
      return;
    }
    const where = message.location();
    const at = page.url();
    // Resolve the console arguments so a hydration diff arrives readable
    // rather than as "%s%s".
    let detail = '';
    try {
      const args = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => null)));
      detail = args.filter((value) => typeof value === 'string').join(' ');
    } catch {
      /* the page may already have navigated away */
    }
    const entry = `${label} @ ${at}: ${detail || text}${where?.url ? ` [${where.url}:${where.lineNumber}]` : ''}`;
    consoleProblems.push(entry);
    if (process.env.CONSOLE_LOG_FILE) {
      appendFileSync(process.env.CONSOLE_LOG_FILE, `\n===== ${entry}\n`);
    }
  });
  page.on('pageerror', (error) => consoleProblems.push(`${label} @ ${page.url()}: ${error.message}`));
}

async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
}

/** Settle fonts, entrance animations and lazy visuals before capturing. */
async function settle(page, ms = 900) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  // Use the pre-installed Chromium when one is present, otherwise fall back to
  // whatever Playwright resolves itself.
  const preinstalled = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
  ].find((path) => existsSync(path));

  const browser = await chromium.launch(preinstalled ? { executablePath: preinstalled } : {});

  // ─────────────────────────── Desktop ───────────────────────────
  const desktop = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2 });
  const page = await desktop.newPage();
  watchConsole(page, 'desktop');

  section('Homepage — desktop');
  const home = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  check('Homepage responds 200', home.status() === 200);
  await settle(page, 2200); // give the 3D object its idle callback
  check('Hero headline renders', await page.locator('h1').first().isVisible());
  check('Both hero CTAs are present', (await page.getByRole('link', { name: /Book a consultation|Explore treatments/ }).count()) >= 2);
  check('The 3D canvas mounted on desktop', (await page.locator('canvas').count()) === 1);
  await shot(page, '01-homepage-hero');

  await page.locator('#philosophy').scrollIntoViewIfNeeded();
  await settle(page, 700);
  await shot(page, '02-homepage-philosophy');

  await page.locator('#treatments').scrollIntoViewIfNeeded();
  await settle(page, 700);
  check('All seven treatments are listed', (await page.locator('#treatments li').count()) === 7);
  await shot(page, '03-homepage-treatments');

  await page.locator('#specialists').scrollIntoViewIfNeeded();
  await settle(page, 700);
  check('Four specialists are listed', (await page.locator('#specialists article').count()) === 4);
  await shot(page, '04-homepage-specialists');

  section('Before / after slider');
  await page.locator('#results').scrollIntoViewIfNeeded();
  await settle(page, 700);
  const slider = page.locator('#results input[type="range"]').first();
  check('The comparison exposes a slider control', await slider.count() === 1);
  const box = await page.locator('#results .cursor-ew-resize, #results [style*="touch-action"]').first().boundingBox();
  if (box) {
    // Drag with real pointer events, the way a visitor would.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  const dividerLeft = await page
    .locator('#results div[style*="left:"]')
    .first()
    .evaluate((el) => el.style.left);
  check('Dragging moves the divider', dividerLeft && !dividerLeft.startsWith('50'), dividerLeft);
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  check('The slider is keyboard operable', await slider.evaluate((el) => Number(el.value) < 50));
  await shot(page, '05-before-after');

  section('FAQ and contact');
  await page.locator('#faq').scrollIntoViewIfNeeded();
  await settle(page, 500);
  const secondFaq = page.locator('#faq button[aria-expanded]').nth(1);
  await secondFaq.click();
  await page.waitForTimeout(500);
  check('FAQ items expand', (await secondFaq.getAttribute('aria-expanded')) === 'true');
  await shot(page, '06-faq');

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await settle(page, 600);
  await shot(page, '07-contact-location');

  section('Treatment detail page');
  const detail = await page.goto(`${BASE}/treatments/veneers`, { waitUntil: 'domcontentloaded' });
  check('Deep link to a treatment responds 200', detail.status() === 200);
  await settle(page);
  check('Treatment name is the H1', (await page.locator('h1').first().textContent())?.includes('Porcelain Veneers'));
  await shot(page, '08-treatment-detail');

  section('Booking flow');
  await page.goto(`${BASE}/booking`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  check('Step 1 asks for a treatment', await page.getByText('What are you coming in for?').isVisible());
  await shot(page, '09-booking-step1-treatment');

  await page.getByRole('button', { name: /Porcelain Veneers/ }).click();
  await page.waitForTimeout(600);
  check('Step 2 asks for a clinician', await page.getByText('Who would you like to see?').isVisible());
  const clinicianCount = await page.locator('button[aria-pressed]').count();
  check('Only clinicians who perform veneers are offered', clinicianCount > 0 && clinicianCount <= 4);
  await shot(page, '10-booking-step2-doctor');

  await page.getByRole('button', { name: /Dr\. Leila Marchetti/ }).click();
  await page.waitForTimeout(900);
  check('Step 3 shows a calendar', await page.getByText('Choose a day').isVisible());
  await page.waitForSelector('button[aria-pressed="false"]:not([disabled])', { timeout: 8000 });
  await shot(page, '11-booking-step3-date');

  // Pick the first enabled day in the grid.
  const day = page.locator('.grid-cols-7 button:not([disabled])').first();
  await day.click();
  await page.waitForTimeout(1000);
  check('Step 4 shows times', await page.getByText('Pick a time').isVisible());
  await page.waitForSelector('text=/Morning|Afternoon|Evening/', { timeout: 8000 });
  await shot(page, '12-booking-step4-time');

  const time = page.locator('button[aria-pressed]').filter({ hasText: /AM|PM/ }).first();
  const chosenTime = (await time.textContent())?.trim();
  await time.click();
  await page.waitForTimeout(600);
  check('Step 5 asks for details', await page.getByText('Your details').isVisible());

  await page.fill('#patientName', 'Amira Haddad');
  await page.fill('#phone', '+971 50 442 7781');
  await page.fill('#email', 'amira.haddad@example.com');
  await page.fill('#note', 'Slightly anxious — happy to take things slowly.');
  await shot(page, '13-booking-step5-details');

  // Validation must reject bad input before the server is touched.
  await page.fill('#email', 'not-an-email');
  await page.getByRole('button', { name: 'Review the appointment' }).click();
  await page.waitForTimeout(400);
  check('Client-side validation blocks a bad email', await page.locator('#email-error').isVisible());
  await shot(page, '14-booking-validation-error');

  await page.fill('#email', 'amira.haddad@example.com');
  await page.getByRole('button', { name: 'Review the appointment' }).click();
  await page.waitForTimeout(700);
  check('Step 6 is the review', await page.getByText('Check and confirm').isVisible());
  check('The review shows the chosen time', (await page.locator('dl').first().textContent())?.includes(chosenTime ?? ''));
  await shot(page, '15-booking-step6-review');

  await page.getByRole('button', { name: 'Confirm appointment' }).click();
  await page.waitForSelector('text=You are booked in', { timeout: 15000 });
  await page.waitForTimeout(700);
  check('Step 7 confirms the booking', await page.getByText('You are booked in').isVisible());
  const reference = (await page.locator('text=/NC-[A-Z0-9]{4}-[A-Z0-9]{4}/').first().textContent())?.trim();
  check('A booking reference is shown', /^NC-/.test(reference ?? ''), reference);
  check(
    'Demo mode is disclosed honestly on the confirmation',
    (await page.getByText(/simulated/i).count()) > 0,
  );
  await shot(page, '16-booking-step7-confirmed');

  section('Patient appointment management');
  const manageHref = await page.getByRole('link', { name: 'Open my appointment' }).getAttribute('href');
  await page.goto(`${BASE}${manageHref}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  if (process.env.DIFF_SSR) {
    const ssr = await (await fetch(`${BASE}${manageHref}`)).text();
    const diff = await page.evaluate((html) => {
      const textNodes = (root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const out = [];
        let node;
        while ((node = walker.nextNode())) {
          const value = node.nodeValue.trim();
          if (value) out.push(value);
        }
        return out;
      };
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const a = textNodes(parsed.body);
      const b = textNodes(document.body);
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        if (a[i] !== b[i]) {
          return { index: i, ssr: a[i], dom: b[i], context: b.slice(Math.max(0, i - 3), i + 3) };
        }
      }
      return null;
    }, ssr);
    console.log('  SSR/DOM text diff:', JSON.stringify(diff));
  }
  check('The private link opens the appointment', await page.getByText('Your appointment').isVisible());
  check('The reference is shown', (await page.locator('body').textContent())?.includes(reference ?? ''));
  await shot(page, '17-appointment-manage');

  await page.getByRole('button', { name: 'Reschedule' }).click();
  await page.waitForTimeout(1200);
  check('The reschedule panel offers times', (await page.locator('text=Move to another time').count()) === 1);
  await shot(page, '18-appointment-reschedule');

  const invalidToken = await page.goto(`${BASE}/appointment/forged.token`, { waitUntil: 'domcontentloaded' });
  check('A forged appointment link is refused', invalidToken.status() === 200);
  check('…and says so plainly', await page.getByText('is not valid').isVisible());
  await settle(page, 400);
  await shot(page, '19-appointment-invalid-link');

  section('Case study');
  const caseStudy = await page.goto(`${BASE}/case-study`, { waitUntil: 'domcontentloaded' });
  check('Case study responds 200', caseStudy.status() === 200);
  await settle(page);
  check('It separates real from simulated', await page.getByText('What is real, and what is simulated').isVisible());
  await shot(page, '20-case-study');
  await page.locator('#stack').scrollIntoViewIfNeeded();
  await settle(page, 700);
  await shot(page, '21-case-study-stack');

  section('404');
  const missing = await page.goto(`${BASE}/no-such-page`, { waitUntil: 'domcontentloaded' });
  check('Unknown route returns 404', missing.status() === 404);
  await settle(page, 500);
  check('The 404 page offers a way back', await page.getByRole('link', { name: /Back to the homepage/ }).isVisible());
  await shot(page, '22-404');

  section('Dashboard');
  const guarded = await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  check('Anonymous access redirects to sign in', guarded.url().includes('/dashboard/login'));
  await settle(page, 500);
  await shot(page, '23-dashboard-login');

  await page.fill('#password', 'wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(900);
  check('A wrong password is rejected in the UI', await page.locator('#password-error').isVisible());

  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await settle(page, 1000);
  check('Sign in reaches the dashboard', page.url().endsWith('/dashboard'));
  check('Key figures are shown', (await page.getByText('Awaiting confirmation').count()) > 0);
  await shot(page, '24-dashboard-overview');

  check('The demo-mode badge is visible', await page.getByText('Demo mode').first().isVisible());
  check('The integration log is present', await page.getByText('Integration log').isVisible());

  await page.getByRole('button', { name: 'Upcoming' }).click();
  await page.waitForTimeout(1200);
  check('View filters work', page.url().includes('view=upcoming'));
  await shot(page, '25-dashboard-upcoming');

  await page.fill('#dash-search', 'Amira');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  check('Search finds the booking just created', (await page.getByText('Amira Haddad').count()) > 0);
  await shot(page, '26-dashboard-search');

  const row = page.locator('li button[aria-expanded]').first();
  await row.click();
  await page.waitForTimeout(700);
  check('A row expands to full detail', (await page.getByText('Patient note').count()) > 0);
  check('Actions are offered', (await page.getByRole('button', { name: 'Cancel' }).count()) > 0);
  await shot(page, '27-dashboard-appointment-detail');

  const logEntry = page.locator('section', { hasText: 'Integration log' }).locator('li button').first();
  if (await logEntry.count()) {
    await logEntry.click();
    await page.waitForTimeout(400);
    await shot(page, '28-dashboard-integration-log');
  }

  // ─────────────────────────── Mobile ───────────────────────────
  section('Mobile');
  const mobileContext = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const mobile = await mobileContext.newPage();
  watchConsole(mobile, 'mobile');

  await mobile.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settle(mobile, 2000);
  check('No 3D canvas is loaded on a phone', (await mobile.locator('canvas').count()) === 0);
  const horizontalOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check('The page does not scroll horizontally', !horizontalOverflow);
  await shot(mobile, '29-mobile-home');

  await mobile.getByRole('button', { name: 'Open menu' }).click();
  await mobile.waitForTimeout(700);
  check(
    'The mobile menu opens',
    await mobile.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Treatments', exact: true }).isVisible(),
  );
  await shot(mobile, '30-mobile-menu');
  await mobile.getByRole('button', { name: 'Close menu' }).click();
  await mobile.waitForTimeout(500);

  await mobile.locator('#results').scrollIntoViewIfNeeded();
  await settle(mobile, 800);
  await shot(mobile, '31-mobile-before-after');

  await mobile.goto(`${BASE}/booking`, { waitUntil: 'domcontentloaded' });
  await settle(mobile, 900);
  check('The booking rail collapses to a progress bar', await mobile.getByText(/Step 1 of 7/).isVisible());
  await shot(mobile, '32-mobile-booking');

  await mobile.getByRole('button', { name: /Digital Smile Design/ }).click();
  await mobile.waitForTimeout(700);
  await mobile.getByRole('button', { name: /Dr\. Leila Marchetti/ }).click();
  await mobile.waitForTimeout(1400);
  check('The mobile calendar renders', await mobile.getByText('Choose a day').isVisible());
  await shot(mobile, '33-mobile-booking-calendar');

  const mobileTouchTarget = await mobile
    .locator('.grid-cols-7 button:not([disabled])')
    .first()
    .boundingBox();
  check(
    'Calendar touch targets are large enough',
    Boolean(mobileTouchTarget && mobileTouchTarget.height >= 36),
    `${Math.round(mobileTouchTarget?.height ?? 0)}px`,
  );

  await mobile.goto(`${BASE}/case-study`, { waitUntil: 'domcontentloaded' });
  await settle(mobile, 800);
  await shot(mobile, '34-mobile-case-study');

  // The dashboard session lives in the desktop context; sign in again here.
  await mobile.goto(`${BASE}/dashboard/login`, { waitUntil: 'domcontentloaded' });
  await mobile.fill('#password', ADMIN_PASSWORD);
  await mobile.getByRole('button', { name: 'Sign in' }).click();
  await mobile.waitForURL('**/dashboard', { timeout: 10000 });
  await settle(mobile, 900);
  check('The dashboard is usable on a phone', await mobile.getByText('Overview').isVisible());
  await shot(mobile, '35-mobile-dashboard');

  // ─────────────────────── Reduced motion ───────────────────────
  section('Reduced motion');
  const calm = await browser.newContext({ viewport: DESKTOP, reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  watchConsole(calmPage, 'reduced-motion');
  await calmPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settle(calmPage, 2000);
  check('No 3D is loaded for reduced-motion users', (await calmPage.locator('canvas').count()) === 0);
  check('Content is still visible without animation', await calmPage.locator('#treatments').isVisible());

  section('Console');
  check('No console errors on any page', consoleProblems.length === 0, consoleProblems.slice(0, 4).join(' | '));
  console.log(
    `  [2mnote[0m  ${expectedNetworkFailures.length} expected 401/404 resource errors from the deliberate failure cases`,
  );

  await browser.close();
  console.log(`\n[1m${passed} passed, ${failed} failed[0m`);
  console.log(`Screenshots written to ./${OUT}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error('\nBrowser test crashed:', error);
  process.exit(1);
});
