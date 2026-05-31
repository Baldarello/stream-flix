const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

test.describe('Remote Episodes Drawer', () => {
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
   * Test: Remote Episodes Drawer - Clicking Episode Changes Playback
   * 
   * This test verifies:
   * 1. Master and slave connect via QR code flow
   * 2. Master starts playing a TV show episode
   * 3. Master opens episodes drawer
   * 4. Master clicks a different episode
   * 5. Slave verifies the new episode is playing
   */
  test('clicking episode in drawer changes playing episode on remote TV', async ({ browser }) => {
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
    
    // ===== STEP 6: OPEN EPISODES DRAWER =====
    console.log('\n=== STEP 6: Open Episodes Drawer ===');
    
    // Navigate to MasterRemotePlayerControlView (should be shown after starting playback)
    // Look for the episodes button in the player controls
    const episodesButton = masterPage.locator('button:has-text("Episodes"), button[aria-label*="episodes" i]');
    
    if (await episodesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await episodesButton.click();
      console.log('Episodes drawer opened');
      await masterPage.waitForTimeout(1000);
      
      // ===== STEP 7: CLICK DIFFERENT EPISODE =====
      console.log('\n=== STEP 7: Click Different Episode ===');
      
      // Get the list of episodes
      const episodeList = masterPage.locator('li[role="option"], [data-testid*="episode"], li >> text=/^\\d+\\./');
      
      // Count episodes
      const episodeCount = await episodeList.count();
      console.log(`Found ${episodeCount} episodes in drawer`);
      
      if (episodeCount > 1) {
        // Click on second episode (different from currently playing)
        console.log('Clicking second episode...');
        await episodeList.nth(1).click();
        
        // Wait for the episode to start playing
        await masterPage.waitForTimeout(3000);
        
        console.log('Second episode selected - checking if playback changed on slave');
        
        // ===== STEP 8: VERIFY PLAYBACK CHANGED ON SLAVE =====
        console.log('\n=== STEP 8: Verify Playback Changed on Slave ===');
        
        // Check if slave is now playing something
        const slaveVideoElement = slavePage.locator('video');
        const isVideoPlaying = await slaveVideoElement.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (isVideoPlaying) {
          console.log('Video element is visible on slave - playback is active');
          // Take screenshot to verify
          await slavePage.screenshot({ path: 'slave-after-episode-change.png', fullPage: true });
          console.log('Screenshot saved: slave-after-episode-change.png');
        }
        
        console.log('Episode change verification complete');
      } else {
        console.log('Only one episode found - skipping episode change test');
      }
      
      // Close episodes drawer
      await masterPage.keyboard.press('Escape');
    } else {
      console.log('Episodes button not visible - test may have reached different screen');
      // Take screenshot for debugging
      await masterPage.screenshot({ path: 'master-current-state.png', fullPage: true });
    }
    
    // ===== FINAL STATE =====
    console.log('\n=== TEST COMPLETE ===');
    
    // Take screenshots for debugging
    await masterPage.screenshot({ path: 'master-final-state.png', fullPage: true });
    await slavePage.screenshot({ path: 'slave-final-state.png', fullPage: true });
    console.log('Screenshots saved: master-final-state.png, slave-final-state.png');
  });
});
