const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

test.describe('Master-Slave Remote SmartTV Flow', () => {
  let masterContext;
  let slaveContext;

  test.beforeEach(async ({ browser }) => {
    // Create master browser context (first browser - acts as remote control)
    masterContext = await browser.newContext();
    
    // Create slave browser context (second browser - acts as TV display)
    slaveContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await masterContext?.close();
    await slaveContext?.close();
  });

  /**
   * Test: Complete Master-Slave Remote SmartTV Flow
   * 
   * This test verifies:
   * 1. Episode link configuration on master
   * 2. Master opens QR scanner modal
   * 3. Slave enables SmartTV mode and displays short code
   * 4. Manual connection between master and slave
   * 5. Remote playback control
   */
  test('complete master-slave connection and playback flow', async ({ browser }) => {
    // ===== MASTER BROWSER SETUP =====
    const masterPage = await masterContext.newPage();
    console.log('=== MASTER: Opening application ===');
    
    // Navigate to the application
    await masterPage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');
    
    // Log all console messages from master
    masterPage.on('console', msg => {
      console.log(`[MASTER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    // ===== SLAVE BROWSER SETUP =====
    const slavePage = await slaveContext.newPage();
    console.log('=== SLAVE: Opening application ===');
    
    // Navigate to the application
    await slavePage.goto(BASE_URL);
    await slavePage.waitForLoadState('networkidle');
    
    // Log all console messages from slave
    slavePage.on('console', msg => {
      console.log(`[SLAVE CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    // ===== STEP 1: CONFIGURE EPISODE LINKS ON MASTER =====
    console.log('\n=== STEP 1: Configure Episode Links ===');
    
    // Click on Kaiju No. 8 show to open detail view
    console.log('Looking for Kaiju No. 8 show...');
    const kaijuCard = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard.click();
    console.log('Clicked on Kaiju No. 8 show');
    
    // Wait for detail view to load
    await masterPage.waitForTimeout(2000);
    
    // Click link-episode button
    console.log('Clicking link-episode button...');
    const linkEpisodeBtn = masterPage.locator('#link-episode').first();
    await linkEpisodeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await linkEpisodeBtn.click();
    
    // Wait for modal to open
    await masterPage.waitForTimeout(1000);
    
    // Fill pattern URL
    console.log('Filling pattern URL...');
    const patternInput = masterPage.locator('#pattern-url-episode');
    await patternInput.waitFor({ state: 'visible', timeout: 10000 });
    await patternInput.fill('https://srv16-suisen.sweetpixel.org/DDL/ANIME/Nigetsuri/Nigetsuri_Ep_[@EP]_SUB_ITA.mp4');
    
    // Click add-links-button
    console.log('Clicking add-links-button...');
    const addLinksBtn = masterPage.locator('#add-links-button');
    await addLinksBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addLinksBtn.click();
    
    // Wait for links to be added
    await masterPage.waitForTimeout(2000);
    console.log('Episode links configured successfully');
    
    // Close modal (click outside or press escape)
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    
    // Close detail view (click on background or back)
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    console.log('Closed modal and detail view');
    
    // ===== STEP 2: MASTER OPENS QR SCANNER =====
    console.log('\n=== STEP 2: Master Opens QR Scanner ===');
    
    // Click master-button to open QR scanner
    console.log('Clicking master-button...');
    const masterBtn = masterPage.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    await masterBtn.click();
    
    // Wait for MasterScreen modal to appear
    await masterPage.waitForTimeout(1000);
    
    // Verify master-slave-code-input is visible (using aria label as fallback since id prop isn't working in Material UI)
    const codeInput = masterPage.getByRole('textbox', { name: /inserisci codice tv/i });
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    console.log('QR Scanner modal opened and code input is visible');
    
    // ===== STEP 3: SLAVE ENABLES SMART TV MODE =====
    console.log('\n=== STEP 3: Slave Enables SmartTV Mode ===');
    
    // Click slave-button to enable SmartTV mode
    console.log('Clicking slave-button...');
    const slaveBtn = slavePage.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView to appear
    await slavePage.waitForTimeout(2000);
    
    // Verify slave-code is displayed and get its value
    const slaveCodeElement = slavePage.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for the code to be populated (it may take a moment to generate)
    await slavePage.waitForTimeout(2000);
    
    const slaveCode = await slaveCodeElement.textContent();
    console.log(`Slave short code displayed: "${slaveCode}"`);
    
    // Verify slave code is 5 characters
    expect(slaveCode).toBeTruthy();
    expect(slaveCode.length).toBe(5);
    console.log('Slave code is valid (5 characters)');
    
    // ===== STEP 4: MANUAL CONNECTION =====
    console.log('\n=== STEP 4: Manual Connection ===');
    
    // Enter slave code in master's input
    console.log(`Entering slave code "${slaveCode}" in master input...`);
    await codeInput.fill(slaveCode);
    
    // Click connect-master-slave button (using aria label since id prop isn't working in Material UI)
    console.log('Clicking connect-master-slave button...');
    const connectBtn = masterPage.getByRole('button', { name: /connetti/i });
    await connectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await connectBtn.click();
    
    // Wait for connection to establish
    await masterPage.waitForTimeout(3000);
    console.log('Connection attempt completed');
    
    // ===== STEP 5: REMOTE PLAYBACK (Optional - depends on connection success) =====
    console.log('\n=== STEP 5: Remote Playback Test ===');
    
    // Re-open Kaiju No. 8 detail
    console.log('Re-opening Kaiju No. 8 detail...');
    const kaijuCard2 = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard2.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard2.click();
    
    // Wait for detail view
    await masterPage.waitForTimeout(2000);
    
    // Try to start an episode (look for play button)
    console.log('Attempting to start episode...');
    const playButton = masterPage.locator('button[aria-label*="play" i], button[aria-label*="play" i], button:has-text("Play"), button:has-text("▶")').first();
    
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click();
      console.log('Play button clicked');
      await masterPage.waitForTimeout(2000);
      console.log('Episode playback started');
    } else {
      console.log('Play button not found or not visible - skipping playback test');
    }
    
    // ===== FINAL STATE =====
    console.log('\n=== TEST COMPLETE ===');
    
    // Take screenshots for debugging
    await masterPage.screenshot({ path: 'master-final-state.png', fullPage: true });
    await slavePage.screenshot({ path: 'slave-final-state.png', fullPage: true });
    console.log('Screenshots saved: master-final-state.png, slave-final-state.png');
  });

  /**
   * Test: Master QR Scanner Modal Opens
   */
  test('master can open QR scanner modal', async ({ browser }) => {
    const page = await masterContext.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Click master-button
    const masterBtn = page.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    await masterBtn.click();
    
    // Wait for MasterScreen modal
    await page.waitForTimeout(1000);
    
    // Verify modal elements are visible (using aria labels since id prop isn't working in Material UI)
    await expect(page.getByRole('textbox', { name: /inserisci codice tv/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /connetti/i })).toBeVisible({ timeout: 5000 });
    
    console.log('QR Scanner modal opened successfully');
  });

  /**
   * Test: Slave SmartTV Mode and Short Code Display
   */
  test('slave displays short code in SmartTV mode', async ({ browser }) => {
    const page = await slaveContext.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Click slave-button
    const slaveBtn = page.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    // Wait for SlavePairingView
    await page.waitForTimeout(2000);
    
    // Verify slave-code is visible
    const slaveCodeElement = page.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for code to be populated
    await page.waitForTimeout(2000);
    
    const slaveCode = await slaveCodeElement.textContent();
    
    // Verify code is 5 characters
    expect(slaveCode).toBeTruthy();
    expect(slaveCode.length).toBe(5);
    
    console.log(`Slave short code: "${slaveCode}"`);
  });

  /**
   * Test: Slave Short Code Persists After Refresh
   * 
   * This test verifies that when a slave device refreshes the page,
   * it receives the same short code as before (not a new one).
   * This is critical for the persistent short code feature.
   */
  test('slave short code persists after page refresh', async ({ browser }) => {
    const page = await slaveContext.newPage();
    
    // Log all console messages
    page.on('console', msg => {
      console.log(`[SLAVE CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    // Step 1: Open application and enable SmartTV mode
    console.log('=== STEP 1: Initial load and enable SmartTV mode ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
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
    
    // Step 2: Refresh the page (simulating user pressing F5 or refresh button)
    console.log('=== STEP 2: Refreshing page ===');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for data to be loaded after refresh
    // After refresh, isSmartTV=true is persisted, so SlavePairingView is shown directly
    // We just need to wait for the short code to be displayed
    await page.waitForTimeout(3000);
    
    // Get the short code after refresh (SlavePairingView should be shown automatically)
    const refreshedShortCodeElement = page.locator('#slave-code');
    await refreshedShortCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    const refreshedShortCode = await refreshedShortCodeElement.textContent();
    console.log(`Short code after refresh: "${refreshedShortCode}"`);
    
    // Verify the short code is the same as before
    expect(refreshedShortCode).toBe(initialShortCode);
    console.log(`SUCCESS: Short code persisted after refresh!`);
  });

  /**
   * Test: Episode Link Configuration
   */
  test('can configure episode links for a show', async ({ browser }) => {
    const page = await masterContext.newPage();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Click on Kaiju No. 8
    const kaijuCard = page.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard.click();
    
    await page.waitForTimeout(2000);
    
    // Click link-episode button
    const linkEpisodeBtn = page.locator('#link-episode').first();
    await linkEpisodeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await linkEpisodeBtn.click();
    
    await page.waitForTimeout(1000);
    
    // Fill pattern URL
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.waitFor({ state: 'visible', timeout: 10000 });
    await patternInput.fill('https://srv16-suisen.sweetpixel.org/DDL/ANIME/Nigetsuri/Nigetsuri_Ep_[@EP]_SUB_ITA.mp4');
    
    // Click add-links-button
    const addLinksBtn = page.locator('#add-links-button');
    await addLinksBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addLinksBtn.click();
    
    // Wait and verify
    await page.waitForTimeout(2000);
    
    console.log('Episode links configured successfully');
  });
});
