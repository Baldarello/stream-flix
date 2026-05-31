const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:3069';

test('debug slave page', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
  });
  
  // Capture all network requests
  page.on('request', request => {
    if (request.url().includes('localhost') || request.url().includes('ws')) {
      console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('localhost')) {
      console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
    }
  });
  
  console.log('Navigating to / first...');
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  
  console.log('Navigating to /tvPlayer?slave=true...');
  await page.goto(`${BASE_URL}/tvPlayer?slave=true`, { waitUntil: 'domcontentloaded' });
  
  // Wait for network to settle
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  
  // Get page content
  const html = await page.content();
  console.log('\n=== PAGE HTML (first 3000 chars) ===');
  console.log(html.substring(0, 3000));
  
  // Check for shortCodeContainer
  const shortCodeExists = await page.locator('#shortCodeContainer').count();
  console.log(`\n=== shortCodeContainer count: ${shortCodeExists} ===`);
  
  // Check what elements are visible
  const bodyText = await page.locator('body').textContent();
  console.log(`\n=== Body text: ${bodyText?.substring(0, 500)} ===`);
  
  // Take screenshot
  await page.screenshot({ path: 'debug-slave.png', fullPage: true });
  console.log('\nScreenshot saved: debug-slave.png');
  
  await browser.close();
});
