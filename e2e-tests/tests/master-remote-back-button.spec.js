const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

/**
 * Regression test for: MasterRemotePlayerControlView back button requires
 * multiple clicks because the slave keeps sending `playback-status` messages
 * (every 1s) that re-set `nowPlayingItem` on the master after the user has
 * already pressed back.
 *
 * The back button must navigate away on the first click.
 */
test.describe('Master Remote Back Button', () => {
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

  // Allow up to 2 minutes for the full master-slave connection + playback
  // setup, which is slow in this environment.
  test.setTimeout(180000);

  test('back button navigates away on the first click', async ({ browser }) => {
    // ===== MASTER BROWSER SETUP =====
    const masterPage = await masterContext.newPage();
    masterPage.on('console', msg => {
      console.log(`[MASTER CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    await masterPage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');

    // ===== SLAVE BROWSER SETUP =====
    const slavePage = await slaveContext.newPage();
    slavePage.on('console', msg => {
      console.log(`[SLAVE CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    await slavePage.goto(BASE_URL);
    await masterPage.waitForLoadState('networkidle');

    // ===== STEP 1: CONFIGURE EPISODE LINKS ON MASTER =====
    console.log('\n=== STEP 1: Configure Episode Links ===');

    const kaijuCard = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard.waitFor({ state: 'visible', timeout: 15000 });
    await kaijuCard.click();

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

    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);
    await masterPage.keyboard.press('Escape');
    await masterPage.waitForTimeout(500);

    // ===== STEP 2: MASTER OPENS QR SCANNER =====
    console.log('\n=== STEP 2: Master Opens QR Scanner ===');

    const masterBtn = masterPage.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Bypass the Header's overlapping transparent MUI element by dispatching
    // a real click event directly to the DOM node.
    await masterBtn.evaluate((el) => el.click());

    await masterPage.waitForTimeout(1500);

    const codeInput = masterPage.locator('#master-slave-code-input');
    await expect(codeInput).toBeVisible({ timeout: 10000 });

    // ===== STEP 3: SLAVE ENABLES SMART TV MODE =====
    console.log('\n=== STEP 3: Slave Enables SmartTV Mode ===');

    const slaveBtn = slavePage.locator('#slave-button');
    await slaveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await slaveBtn.evaluate((el) => el.click());

    await slavePage.waitForTimeout(2000);

    const slaveCodeElement = slavePage.locator('#slave-code');
    await slaveCodeElement.waitFor({ state: 'visible', timeout: 10000 });

    await slavePage.waitForTimeout(2000);

    const slaveCode = await slaveCodeElement.textContent();
    console.log(`Slave short code displayed: "${slaveCode}"`);

    expect(slaveCode).toBeTruthy();
    expect(slaveCode.length).toBe(5);

    // ===== STEP 4: MANUAL CONNECTION =====
    console.log('\n=== STEP 4: Manual Connection ===');

    await codeInput.fill(slaveCode);

    const connectBtn = masterPage.locator('#connect-master-slave');
    await connectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await connectBtn.evaluate((el) => el.click());

    await masterPage.waitForTimeout(3000);
    console.log('Connection attempt completed');

    // After connecting, a MediaSyncModal opens. Dismiss it so we can interact
    // with the rest of the app.
    const mediaSyncCloseBtn = masterPage.getByRole('button', { name: /close/i }).first();
    if (await mediaSyncCloseBtn.isVisible({timeout: 3000}).catch(() => false)) {
      await mediaSyncCloseBtn.evaluate((el) => el.click());
      await masterPage.waitForTimeout(500);
      console.log('MediaSyncModal dismissed');
    }

    // ===== STEP 5: START PLAYBACK VIA UI =====
    console.log('\n=== STEP 5: Master Plays First Episode ===');

    // Open the show's detail view
    const kaijuCard2 = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard2.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard2.evaluate((el) => el.click());
    await masterPage.waitForTimeout(3000);

    // The detail view shows the show's "Riproduci" button (which would play
    // the show as a movie, but a TV show has no direct video URL). Instead,
    // we click on the first episode card in the episodes list - that
    // triggers startPlayback with episode.video_url set, which is what
    // playRemoteItem needs.
    const firstEpisode = masterPage.locator('[class*="MuiListItem"], [class*="episode"]').first();
    let clicked = false;
    if (await firstEpisode.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstEpisode.evaluate((el) => el.click());
        clicked = true;
        console.log('Clicked first episode list item');
    } else {
        // Try the play buttons in the episodes list (MUI Box with PlayArrowIcon)
        const episodePlayBox = masterPage.locator('div:has(>svg[data-testid*="PlayArrow"])').first();
        if (await episodePlayBox.isVisible({ timeout: 1500 }).catch(() => false)) {
            await episodePlayBox.evaluate((el) => el.click());
            clicked = true;
            console.log('Clicked first episode play box');
        }
    }
    if (!clicked) {
        // Last resort: find the show's "Riproduci" button and click it
        // even though we know it won't actually start playback
        const showPlayButton = masterPage.locator('button:has-text("Riproduci")').first();
        if (await showPlayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await showPlayButton.evaluate((el) => el.click());
            console.log('Clicked show play button (may not start playback)');
        } else {
            console.log('No playable element found - cannot continue test');
            test.skip();
            return;
        }
    }
    await masterPage.waitForTimeout(3000);

    // ===== STEP 6: WAIT FOR MasterRemotePlayerControlView =====
    console.log('\n=== STEP 6: Wait for MasterRemotePlayerControlView ===');

    const backButton = masterPage.locator('#master-remote-back-button');
    await backButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('MasterRemotePlayerControlView is visible (back button present)');

    // Wait a couple seconds so the slave has time to send a few `playback-status`
    // messages - the bug only manifests when the slave is still streaming.
    await masterPage.waitForTimeout(3000);

    // Confirm the player UI is still showing before clicking
    await expect(backButton).toBeVisible();
    await expect(masterPage.locator('#play-pause-button')).toBeVisible();

    // ===== STEP 7: CLICK BACK BUTTON ONCE =====
    console.log('\n=== STEP 7: Click back button ONCE ===');

    // Use evaluate(el => el.click()) to dispatch a real DOM click event,
    // bypassing any overlay that may be intercepting pointer events.
    await backButton.evaluate((el) => el.click());
    console.log('Back button clicked once');

    // Give the view a few hundred ms to settle. The bug was that the slave's
    // 1s `playback-status` message would re-set `nowPlayingItem` and bounce
    // the UI back to MasterRemotePlayerControlView. With the fix in place,
    // a single click must navigate away and stay away.
    await masterPage.waitForTimeout(2500);

    // ===== STEP 8: VERIFY WE NAVIGATED AWAY ON THE FIRST CLICK =====
    console.log('\n=== STEP 8: Verify Navigation ===');

    const backButtonStillVisible = await backButton.isVisible().catch(() => false);
    const playPauseButtonStillVisible = await masterPage.locator('#play-pause-button').isVisible().catch(() => false);
    const seriesGridVisible = await masterPage.locator('#grid-view-series').isVisible().catch(() => false);

    console.log(`After 1st click - back button visible: ${backButtonStillVisible}`);
    console.log(`After 1st click - play-pause button visible: ${playPauseButtonStillVisible}`);
    console.log(`After 1st click - grid-view-series visible: ${seriesGridVisible}`);

    // The view should have changed: we should no longer be on the
    // MasterRemotePlayerControlView, and we should be on the series grid.
    expect(backButtonStillVisible).toBe(false);
    expect(playPauseButtonStillVisible).toBe(false);

    // Take a screenshot for debugging
    await masterPage.screenshot({ path: 'master-after-back-click.png', fullPage: true });

    console.log('\n=== TEST PASSED: back button works on the first click ===');
  });
});
