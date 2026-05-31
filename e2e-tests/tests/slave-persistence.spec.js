import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';

test.describe('Slave Short Code Persistence Test', () => {
  test('slave short code persists when clicking slave-button after refresh', async ({ browser }) => {
    // Create a new clean context for this test
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Log all console messages
    page.on('console', msg => {
      console.log(`[SLAVE CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    console.log('=== STEP 1: Initial load and enable SmartTV mode ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await page.waitForTimeout(2000);
    
    // Click slave-button to enable SmartTV mode
    const slaveBtn = page.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView and code to be populated
    await page.waitForTimeout(3000);
    
    // Get the initial short code
    const slaveCodeElement = page.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    const initialShortCode = await slaveCodeElement.textContent();
    console.log(`Initial short code: "${initialShortCode}"`);
    
    expect(initialShortCode).toBeTruthy();
    expect(initialShortCode.length).toBe(5);
    
    console.log('=== STEP 2: Go back to home by clicking browse button ===');
    // Click on "Sfoglia il catalogo" button to go back to main view
    await page.getByRole('button', { name: /sfoglia il catalogo/i }).click();
    await page.waitForTimeout(2000);
    
    console.log('=== STEP 3: Refresh the page ===');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for data to be loaded after refresh
    await page.waitForTimeout(3000);
    
    console.log('=== STEP 4: Click slave-button again ===');
    // Click slave-button again
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView
    await page.waitForTimeout(3000);
    
    // Get the short code after refresh
    const refreshedShortCodeElement = page.locator('#slave-code');
    await refreshedShortCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    const refreshedShortCode = await refreshedShortCodeElement.textContent();
    console.log(`Short code after second click: "${refreshedShortCode}"`);
    
    // Verify the short code is the same as before
    expect(refreshedShortCode).toBe(initialShortCode);
    console.log(`SUCCESS: Short code persisted after refresh and second click!`);
    
    await context.close();
  });
});
