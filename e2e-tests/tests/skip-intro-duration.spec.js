const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';
const CUSTOM_INTRO_DURATION = 120; // seconds

test.describe('Skip Intro Duration Fix', () => {
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
   * Test: Skip Intro Duration is Correctly Applied from Master to Slave
   * 
   * This test verifies that when the master changes the intro duration in
   * EpisodesDrawer, pressing the skip intro button on the master correctly
   * applies the new duration on the slave.
   * 
   * Steps:
   * 1. Connect master and slave
   * 2. Play an episode on the master
   * 3. Open episodes drawer and change intro duration to 120 seconds
   * 4. Close drawer and click skip intro button
   * 5. Verify slave video skips by approximately 120 seconds
   */
  test('master skip intro button applies custom duration from EpisodesDrawer', async ({ browser }) => {
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
    console.log('Connection established');

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
    const playPauseButton = masterPage.locator('#play-pause-button');
    await playPauseButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('MasterRemotePlayerControlView loaded');

    // ===== STEP 6: OPEN EPISODES DRAWER =====
    console.log('\n=== STEP 6: Open Episodes Drawer ===');
    
    // Look for the episodes button - it's visible when viewing a series
    const episodesButton = masterPage.locator('button:has-text("Episodes"), button[aria-label*="episodes" i]');
    
    if (await episodesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await episodesButton.click();
      console.log('Episodes drawer opened');
      await masterPage.waitForTimeout(1000);
    } else {
      throw new Error('Episodes button not found - make sure a series is playing');
    }

    // ===== STEP 7: CHANGE INTRO DURATION =====
    console.log('\n=== STEP 7: Change Intro Duration to ' + CUSTOM_INTRO_DURATION + ' seconds ===');
    
    // Find the intro duration input field
    const introDurationInput = masterPage.locator('input[type="number"]').first();
    await introDurationInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Clear the input and enter the custom duration
    await introDurationInput.clear();
    await introDurationInput.fill(String(CUSTOM_INTRO_DURATION));
    console.log(`Set intro duration to ${CUSTOM_INTRO_DURATION} seconds`);
    
    await masterPage.waitForTimeout(500);

    // ===== STEP 8: CLOSE EPISODES DRAWER =====
    console.log('\n=== STEP 8: Close Episodes Drawer ===');
    
    // Close the drawer by pressing Escape or clicking the close button
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(1000);
    console.log('Episodes drawer closed');

    // ===== STEP 9: GET SLAVE VIDEO TIME BEFORE SKIP =====
    console.log('\n=== STEP 9: Get Slave Video Time Before Skip ===');
    
    // Wait for video to be playing
    await slavePage.waitForTimeout(2000);
    
    // Get the video element on slave and record current time
    const getVideoCurrentTime = async () => {
      return await slavePage.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.currentTime : null;
      });
    };
    
    const timeBeforeSkip = await getVideoCurrentTime();
    console.log(`Slave video time before skip: ${timeBeforeSkip}`);
    
    if (timeBeforeSkip === null) {
      throw new Error('Could not get video element on slave page');
    }

    // ===== STEP 10: CLICK SKIP INTRO BUTTON =====
    console.log('\n=== STEP 10: Click Skip Intro Button ===');
    
    // Find and click the skip intro button using text
    const skipIntroButton = masterPage.locator('button:has-text("Skip Intro"), button:has-text("Salta Intro")');
    await skipIntroButton.waitFor({ state: 'visible', timeout: 5000 });
    await skipIntroButton.click();
    console.log('Skip intro button clicked');
    
    // Wait for the skip to be applied
    await masterPage.waitForTimeout(1000);

    // ===== STEP 11: VERIFY SLAVE VIDEO SKIPPED BY CORRECT DURATION =====
    console.log('\n=== STEP 11: Verify Slave Video Skipped by Correct Duration ===');
    
    const timeAfterSkip = await getVideoCurrentTime();
    console.log(`Slave video time after skip: ${timeAfterSkip}`);
    
    const actualSkipDuration = timeAfterSkip - timeBeforeSkip;
    console.log(`Actual skip duration: ${actualSkipDuration} seconds`);
    
    // Allow for some tolerance (2 seconds) due to timing variations
    const tolerance = 2;
    expect(Math.abs(actualSkipDuration - CUSTOM_INTRO_DURATION)).toBeLessThanOrEqual(tolerance);
    console.log(`Verified: Video skipped by approximately ${CUSTOM_INTRO_DURATION} seconds (actual: ${actualSkipDuration}s)`);
    
    console.log('\n=== TEST PASSED: Skip intro duration fix verified ===');
  });
});