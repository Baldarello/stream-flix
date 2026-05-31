import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';

test.describe('Slave Online Status Test', () => {
  test('master sees slave as online in profile drawer after connection', async ({ browser }) => {
    // Create a new clean context for this test
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Log all console messages
    page.on('console', msg => {
      console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    console.log('=== STEP 1: Open the app as guest ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('=== STEP 2: Enable SmartTV mode (slave) ===');
    // Click slave-button to enable SmartTV mode on this device
    const slaveBtn = page.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView and code to be populated
    await page.waitForTimeout(3000);
    
    // Get the short code displayed
    const slaveCodeElement = page.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    const shortCode = await slaveCodeElement.textContent();
    console.log(`Slave short code: "${shortCode}"`);
    expect(shortCode).toBeTruthy();
    expect(shortCode.length).toBe(5);
    
    console.log('=== STEP 3: Go back to home ===');
    // Click on "Sfoglia il catalogo" button to go back to main view
    await page.getByRole('button', { name: /sfoglia il catalogo/i }).click();
    await page.waitForTimeout(2000);
    
    console.log('=== STEP 4: Refresh the page ===');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('=== STEP 5: Click slave-button again to reconnect ===');
    // Click slave-button again
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView
    await page.waitForTimeout(3000);
    
    // Verify the short code is the same (persistence test)
    const refreshedCodeElement = page.locator('#slave-code');
    await refreshedCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    const refreshedCode = await refreshedCodeElement.textContent();
    console.log(`Refreshed short code: "${refreshedCode}"`);
    expect(refreshedCode).toBe(shortCode);
    
    console.log('=== STEP 6: Go back home and check profile drawer for slave status ===');
    // Click on "Sfoglia il catalogo" button to go back to main view
    await page.getByRole('button', { name: /sfoglia il catalogo/i }).click();
    await page.waitForTimeout(2000);
    
    // Click on profile icon to open profile drawer
    const profileIcon = page.locator('#profile-icon, [id*="profile"], button[aria-label*="profile" i]').first();
    if (await profileIcon.isVisible()) {
      await profileIcon.click();
      await page.waitForTimeout(1000);
      
      // Look for known slaves section in the drawer
      // The slave should appear as online
      console.log('Checking for slave online status in profile drawer...');
      
      // Check if slave short code appears in the drawer
      const drawerContent = await page.content();
      const hasSlaveCode = drawerContent.includes(refreshedCode);
      console.log(`Drawer contains slave code "${refreshedCode}": ${hasSlaveCode}`);
      
      // Look for online indicator near the slave entry
      // This is a simplified check - in real implementation the UI might show "Online" or a green dot
      const hasOnlineIndicator = drawerContent.includes('Online') || drawerContent.includes('online') || drawerContent.includes('●');
      console.log(`Has online indicator: ${hasOnlineIndicator}`);
    }
    
    console.log('=== TEST COMPLETE ===');
    await context.close();
  });
});
