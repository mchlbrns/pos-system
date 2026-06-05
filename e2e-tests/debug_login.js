const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.message);
  });

  page.on('request', req => {
    console.log(`NETWORK REQUEST: ${req.method()} ${req.url()}`);
  });

  page.on('response', res => {
    console.log(`NETWORK RESPONSE: ${res.status()} ${res.url()}`);
  });

  try {
    console.log('Navigating to http://localhost:5173/login ...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    console.log('Filling username and password...');
    await page.fill('input[placeholder*="username"]', 'admin');
    await page.fill('input[placeholder*="••••"]', 'admin123');

    console.log('Clicking Sign In...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation or changes...');
    await page.waitForTimeout(5000);

    console.log('Current URL after login attempt:', page.url());
    await page.screenshot({ path: 'login-result.png' });
    console.log('Saved screenshot to login-result.png');
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
  } finally {
    await browser.close();
  }
})();
