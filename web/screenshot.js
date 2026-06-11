import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.setViewportSize({ width: 1280, height: 720 });

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/doingok-screenshots/01-landing-fixed.png' });

console.log('✅ Screenshot saved');
await browser.close();
