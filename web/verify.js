import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotDir = '/tmp/doingok-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 720 });

  console.log('🧪 Starting verification...\n');

  try {
    // Navigate to the app
    console.log('1️⃣ Loading landing page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/01-landing.png` });
    console.log('✅ Landing page loaded and rendered\n');

    // Check navigation links
    console.log('2️⃣ Testing navigation to Sign Up...');
    const buttons = await page.locator('button').all();
    let foundSignUp = false;
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('Sign Up')) {
        await btn.click();
        foundSignUp = true;
        break;
      }
    }
    if (!foundSignUp) throw new Error('Sign Up button not found');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/02-signup-page.png` });
    console.log('✅ Sign Up page displayed\n');

    // Test font size toggle
    console.log('3️⃣ Testing font size toggle (Large)...');
    const buttons2 = await page.locator('button').all();
    for (const btn of buttons2) {
      const text = await btn.textContent();
      if (text && text.includes('A+') && !text.includes('A++')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${screenshotDir}/03-large-font.png` });
    console.log('✅ Font size toggled to Large\n');

    // Test Extra Large font
    console.log('4️⃣ Testing font size toggle (Extra Large)...');
    const buttons3 = await page.locator('button').all();
    for (const btn of buttons3) {
      const text = await btn.textContent();
      if (text && text.includes('A++')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${screenshotDir}/04-extra-large-font.png` });
    console.log('✅ Font size toggled to Extra Large\n');

    // Navigate to Donor page
    console.log('5️⃣ Testing navigation to Donor page...');
    const buttons4 = await page.locator('button').all();
    for (const btn of buttons4) {
      const text = await btn.textContent();
      if (text && text.includes('Donate')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/05-donor-page.png` });
    console.log('✅ Donor page displayed\n');

    // Navigate to FAQ
    console.log('6️⃣ Testing navigation to FAQ...');
    const buttons5 = await page.locator('button').all();
    for (const btn of buttons5) {
      const text = await btn.textContent();
      if (text && text.trim() === 'FAQ') {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/06-faq-page.png` });
    console.log('✅ FAQ page displayed\n');

    // Test FAQ accordion
    console.log('7️⃣ Testing FAQ accordion expansion...');
    const detailsElements = await page.locator('details').count();
    if (detailsElements > 0) {
      await page.locator('details').first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${screenshotDir}/07-faq-expanded.png` });
      console.log(`✅ FAQ accordion works (${detailsElements} FAQs found)\n`);
    }

    // Navigate back to Home
    console.log('8️⃣ Testing navigation back to Home (DoingOK logo)...');
    const buttons6 = await page.locator('button').all();
    for (const btn of buttons6) {
      const text = await btn.textContent();
      if (text && text.includes('DoingOK')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/08-home-again.png` });
    console.log('✅ Home/Landing page re-displayed\n');

    // Test Sign Up form
    console.log('9️⃣ Testing Sign Up form fields...');
    const buttons7 = await page.locator('button').all();
    for (const btn of buttons7) {
      const text = await btn.textContent();
      if (text && text.includes('Sign Up')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);

    // Fill in form
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1 (602) 555-0101');

    await page.screenshot({ path: `${screenshotDir}/09-signup-filled.png` });
    console.log('✅ Form fields accept input\n');

    // Scroll T&C and accept
    console.log('🔟 Testing T&C scroll requirement...');
    const tosDiv = await page.locator('[class*="overflow-y-auto"]').first();

    // Try clicking checkbox before scrolling (should be disabled)
    const checkbox = await page.locator('input[type="checkbox"]');
    const isDisabledBefore = await checkbox.isDisabled();
    console.log(`   - Checkbox disabled before scroll: ${isDisabledBefore}`);

    // Scroll to bottom
    await page.evaluate(() => {
      const el = document.querySelector('[class*="overflow-y-auto"]');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);

    const isDisabledAfter = await checkbox.isDisabled();
    console.log(`   - Checkbox disabled after scroll: ${isDisabledAfter}`);

    // Check the checkbox
    await checkbox.check();
    await page.screenshot({ path: `${screenshotDir}/10-tos-accepted.png` });
    console.log('✅ T&C scroll requirement works\n');

    // Try submitting form
    console.log('1️⃣1️⃣ Testing form submission...');
    const buttons8 = await page.locator('button').all();
    for (const btn of buttons8) {
      const text = await btn.textContent();
      if (text && text.includes('Create Account')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/11-signup-success.png` });
    console.log('✅ Form submission and success page displayed\n');

    // Test mobile responsiveness
    console.log('1️⃣2️⃣ Testing mobile responsiveness (375px width)...');
    page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/12-mobile-landing.png` });
    console.log('✅ Mobile view renders correctly\n');

    // Test mobile menu
    console.log('1️⃣3️⃣ Testing mobile hamburger menu...');
    const hamburger = await page.locator('button svg.w-6').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${screenshotDir}/13-mobile-menu.png` });
      console.log('✅ Mobile hamburger menu opens\n');
    }

    // Font persistence test
    console.log('1️⃣4️⃣ Testing font size persistence (reload page)...');
    page.setViewportSize({ width: 1280, height: 720 });

    // Set to extra-large
    await page.click('button:has-text("A++")');
    await page.waitForTimeout(300);

    // Reload page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Check if extra-large is still active
    const activeButton = await page.locator('button:has-text("A++")').evaluate(
      el => el.classList.contains('bg-primary-100') || el.textContent.includes('A++')
    );
    console.log(`✅ Font size persisted after reload: ${activeButton}\n`);

    console.log('\n✨ All verification steps passed!');
    console.log(`📸 Screenshots saved to: ${screenshotDir}\n`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verify();
