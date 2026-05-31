const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

test.describe('Remote Progress Bar', () => {
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
   * Test: Remote Progress Bar Updates During Playback
   * 
   * This test verifies:
   * 1. Master and slave connect via manual code entry
   * 2. Master starts playing a TV show episode
   * 3. Slave receives and displays the playback
   * 4. Master receives status updates from slave
   * 5. Progress bar shows non-zero time (currentTime > 0)
   * 6. Duration is displayed correctly (not 00:00)
   */
  test('progress bar shows correct time during remote playback', async ({ browser }) => {
    // ===== MASTER BROWSER SETUP =====
    const masterPage = await masterContext.newPage();
    console.log('=== MASTER: Opening application ===');
    
    await masterPage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');
    
    // Log all console messages from master
    masterPage.on('console', msg => {
      console.log(`[MASTER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    // ===== SLAVE BROWSER SETUP =====
    const slavePage = await slaveContext.newPage();
    console.log('=== SLAVE: Opening application ===');
    
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
    
    // Close modal and detail view
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    
    // ===== STEP 2: MASTER OPENS QR SCANNER =====
    console.log('\n=== STEP 2: Master Opens QR Scanner ===');
    
    // Click master-button to open QR scanner
    console.log('Clicking master-button...');
    const masterBtn = masterPage.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    await masterBtn.click();
    
    // Wait for MasterScreen modal to appear
    await masterPage.waitForTimeout(1000);
    
    // Verify master-slave-code-input is visible
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
    
    // Wait for the code to be populated
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
    
    // Click connect-master-slave button
    console.log('Clicking connect-master-slave button...');
    const connectBtn = masterPage.getByRole('button', { name: /connetti/i });
    await connectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await connectBtn.click();
    
    // Wait for connection to establish
    await masterPage.waitForTimeout(3000);
    console.log('Connection established');
    
    // ===== STEP 5: MASTER PLAYS AN EPISODE =====
    console.log('\n=== STEP 5: Master Plays First Episode ===');
    
    // Re-open Kaiju No. 8 detail
    console.log('Re-opening Kaiju No. 8 detail...');
    const kaijuCard2 = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard2.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard2.click();
    
    // Wait for detail view
    await masterPage.waitForTimeout(2000);
    
    // Play first episode (click play button)
    console.log('Starting first episode...');
    const playButton = masterPage.locator('button[aria-label*="play" i], button[aria-label*="Play" i], button:has-text("Play"), button:has-text("▶")').first();
    
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click();
      console.log('First episode playback started');
      await masterPage.waitForTimeout(2000);
    } else {
      console.log('Play button not found - trying alternative approach');
    }
    
    // ===== STEP 6: WAIT FOR REMOTE PLAYER VIEW =====
    console.log('\n=== STEP 6: Wait for Remote Player View ===');
    
    // Wait for the MasterRemotePlayerControlView to appear
    // The remote player view should show after connection + playback start
    await masterPage.waitForTimeout(3000);
    
    // Take screenshot to see current state
    await masterPage.screenshot({ path: 'master-before-progress-check.png', fullPage: true });
    console.log('Screenshot saved: master-before-progress-check.png');
    
    // ===== STEP 7: VERIFY PROGRESS BAR EXISTS =====
    console.log('\n=== STEP 7: Verify Progress Bar Exists ===');
    
    // Look for the progress slider
    const progressSlider = masterPage.locator('.video-player-slider');
    const sliderVisible = await progressSlider.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Progress slider visible: ${sliderVisible}`);
    
    // ===== STEP 8: WAIT FOR PROGRESS TO UPDATE =====
    console.log('\n=== STEP 8: Wait for Progress to Update ===');
    
    // Wait up to 15 seconds for the progress to show non-zero time
    // The slave sends status updates every second, so after a few seconds we should see progress
    let currentTimeText = '';
    let durationText = '';
    let progressDetected = false;
    
    for (let i = 0; i < 15; i++) {
      console.log(`Checking progress (attempt ${i + 1}/15)...`);
      
      // Get the current time display (first Typography with monospace font near the slider)
      const timeDisplays = masterPage.locator('text=/\\d{1,2}:\\d{2}/');
      const timeCount = await timeDisplays.count();
      
      if (timeCount >= 2) {
        currentTimeText = await timeDisplays.nth(0).textContent();
        durationText = await timeDisplays.nth(1).textContent();
        console.log(`Time display found: "${currentTimeText}" / "${durationText}"`);
        
        // Check if current time is not 00:00 and duration is not 00:00
        if (currentTimeText !== '00:00' && durationText !== '00:00') {
          progressDetected = true;
          console.log('Progress detected! Current time is not 00:00');
          break;
        }
      }
      
      await masterPage.waitForTimeout(1000);
    }
    
    // ===== STEP 9: VERIFY RESULTS =====
    console.log('\n=== STEP 9: Verify Results ===');
    
    // Take final screenshot
    await masterPage.screenshot({ path: 'master-final-progress-state.png', fullPage: true });
    console.log('Screenshot saved: master-final-progress-state.png');
    
    // Assertions
    if (sliderVisible) {
      console.log('PASS: Progress slider is visible');
    } else {
      console.log('WARNING: Progress slider not found - may be in different view');
    }
    
    if (progressDetected) {
      console.log(`PASS: Progress bar is updating - showing "${currentTimeText}" / "${durationText}"`);
    } else {
      console.log(`FAIL: Progress bar is NOT updating - currentTime="${currentTimeText}", duration="${durationText}"`);
    }
    
    // The test should fail if progress is not detected after 15 seconds
    // This would indicate the message type fix is not working
    expect(progressDetected).toBe(true);
    expect(currentTimeText).not.toBe('00:00');
    expect(durationText).not.toBe('00:00');
    
    console.log('\n=== TEST COMPLETE ===');
  });
});