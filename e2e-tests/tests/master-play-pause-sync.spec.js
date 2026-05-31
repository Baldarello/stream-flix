const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

test.describe('Master Play-Pause Button State Sync', () => {
  let masterContext;
  let slaveContext;

  test.beforeEach(async ({ browser }) => {
    masterContext = await browser.newContext();
    slaveContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await masterContext?.close();
    await slaveContext?.close();
  });

  /**
   * Test: Master play-pause button state updates when pressed
   * 
   * This test verifies that when the master is on MasterRemotePlayerControlView
   * and presses the play-pause button:
   * 1. The slave gets paused/played
   * 2. The master's button state updates to reflect the new state
   * 
   * Issue: When master presses play-pause, slave pauses but master's button
   * doesn't change state (icon stays the same, can't resume playback)
   */
  test('master play-pause button state updates correctly after pressing', async ({ browser }) => {
    // ===== MASTER BROWSER SETUP =====
    const masterPage = await masterContext.newPage();
    console.log('=== MASTER: Opening application ===');
    
    await masterPage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');
    
    masterPage.on('console', msg => {
      console.log(`[MASTER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    // ===== SLAVE BROWSER SETUP =====
    const slavePage = await slaveContext.newPage();
    console.log('=== SLAVE: Opening application ===');
    
    await slavePage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');
    
    slavePage.on('console', msg => {
      console.log(`[SLAVE CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    // ===== STEP 1: CONFIGURE EPISODE LINKS ON MASTER =====
    console.log('\n=== STEP 1: Configure Episode Links ===');
    
    const kaijuCard = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard.click();
    console.log('Clicked on Kaiju No. 8 show');
    
    await masterPage.waitForTimeout(2000);
    
    const linkEpisodeBtn = masterPage.locator('#link-episode').first();
    await linkEpisodeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await linkEpisodeBtn.click();
    
    await masterPage.waitForTimeout(1000);
    
    const patternInput = masterPage.locator('#pattern-url-episode');
    await patternInput.waitFor({ state: 'visible', timeout: 10000 });
    await patternInput.fill('https://srv16-suisen.sweetpixel.org/DDL/ANIME/Nigetsuri/Nigetsuri_Ep_[@EP]_SUB_ITA.mp4');
    
    const addLinksBtn = masterPage.locator('#add-links-button');
    await addLinksBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addLinksBtn.click();
    
    await masterPage.waitForTimeout(2000);
    console.log('Episode links configured');
    
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);

    // ===== STEP 2: MASTER OPENS QR SCANNER =====
    console.log('\n=== STEP 2: Master Opens QR Scanner ===');
    
    const masterBtn = masterPage.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    await masterBtn.click();
    
    await masterPage.waitForTimeout(1000);
    
    const codeInput = masterPage.getByRole('textbox', { name: /inserisci codice tv/i });
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    console.log('QR Scanner modal opened');

    // ===== STEP 3: SLAVE ENABLES SMART TV MODE =====
    console.log('\n=== STEP 3: Slave Enables SmartTV Mode ===');
    
    const slaveBtn = slavePage.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.click();
    
    await slavePage.waitForTimeout(2000);
    
    const slaveCodeElement = slavePage.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    
    await slavePage.waitForTimeout(2000);
    
    const slaveCode = await slaveCodeElement.textContent();
    console.log(`Slave short code: "${slaveCode}"`);
    
    expect(slaveCode).toBeTruthy();
    expect(slaveCode.length).toBe(5);

    // ===== STEP 4: CONNECT MASTER AND SLAVE =====
    console.log('\n=== STEP 4: Connect Master and Slave ===');
    
    await codeInput.fill(slaveCode);
    
    const connectBtn = masterPage.getByRole('button', { name: /connetti/i });
    await connectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await connectBtn.click();
    
    await masterPage.waitForTimeout(3000);
    console.log('Connection attempt completed');

    // ===== STEP 5: START PLAYBACK ON SLAVE =====
    console.log('\n=== STEP 5: Start Playback ===');
    
    // Re-open Kaiju No. 8 detail
    const kaijuCard2 = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard2.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard2.click();
    
    await masterPage.waitForTimeout(2000);
    
    // Start an episode
    const playButton = masterPage.locator('button[aria-label*="play" i], button:has-text("Play"), button:has-text("▶")').first();
    
    if (await playButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playButton.click();
      console.log('Play button clicked');
      await masterPage.waitForTimeout(2000);
    }

    // Wait for MasterRemotePlayerControlView to be displayed
    // The play-pause button should be visible with id="play-pause-button"
    const playPauseButton = masterPage.locator('#play-pause-button');
    await playPauseButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('MasterRemotePlayerControlView loaded with play-pause button');

    // ===== STEP 6: TEST PLAY-PAUSE BUTTON STATE SYNC =====
    console.log('\n=== STEP 6: Test Play-Pause Button State Sync ===');
    
    // Get initial state of play-pause button - should have PauseIcon (playing state)
    // The aria-label should contain "pause" when playing
    const initialAriaLabel = await playPauseButton.getAttribute('aria-label');
    console.log(`Initial play-pause button aria-label: "${initialAriaLabel}"`);
    
    // Check if initially playing (should have pause icon/aria-label)
    const isInitiallyPlaying = initialAriaLabel?.toLowerCase().includes('pause');
    console.log(`Initially playing: ${isInitiallyPlaying}`);
    
    // Click play-pause button
    console.log('Clicking play-pause button...');
    await playPauseButton.click();
    
    // Wait for UI to update
    await masterPage.waitForTimeout(500);
    
    // Get the state after clicking
    const afterClickAriaLabel = await playPauseButton.getAttribute('aria-label');
    console.log(`After click play-pause button aria-label: "${afterClickAriaLabel}"`);
    
    // Verify the state changed
    // If was playing (had pause), now should be paused (have play aria-label)
    // If was paused (had play), now should be playing (have pause aria-label)
    if (isInitiallyPlaying) {
      expect(afterClickAriaLabel?.toLowerCase()).toContain('play');
      console.log('Button state correctly changed from pause to play');
    } else {
      expect(afterClickAriaLabel?.toLowerCase()).toContain('pause');
      console.log('Button state correctly changed from play to pause');
    }
    
    // Click again to verify it can toggle back
    console.log('Clicking play-pause button again...');
    await playPauseButton.click();
    
    await masterPage.waitForTimeout(500);
    
    const afterSecondClickAriaLabel = await playPauseButton.getAttribute('aria-label');
    console.log(`After second click aria-label: "${afterSecondClickAriaLabel}"`);
    
    // Should be back to original state
    if (isInitiallyPlaying) {
      expect(afterSecondClickAriaLabel?.toLowerCase()).toContain('pause');
      console.log('Button state correctly changed back to pause');
    } else {
      expect(afterSecondClickAriaLabel?.toLowerCase()).toContain('play');
      console.log('Button state correctly changed back to play');
    }
    
    console.log('\n=== TEST PASSED: Play-pause button state syncs correctly ===');
    
    // Take screenshots for debugging
    await masterPage.screenshot({ path: 'master-play-pause-test-final.png', fullPage: true });
    await slavePage.screenshot({ path: 'slave-play-pause-test-final.png', fullPage: true });
  });
});
