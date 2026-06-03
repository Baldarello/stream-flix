const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';

/**
 * Test: Master Remote Progress Bar - Horizontal Time Layout
 *
 * This test verifies the requirement from the issue:
 *   "add inside the component for the master that allows controlling the slave
 *    also the indications of the current playback time and the remaining time
 *    to watch - they must be placed horizontally to the left and right of the
 *    progress bar"
 *
 * The test uses a test hook exposed via `?testMode=stores` to drive the
 * remote store state directly. This avoids the fragile, refactor-sensitive
 * click-through flow and focuses on verifying the layout change.
 *
 * Verified invariants:
 * 1. Current time is shown on the LEFT of the progress bar
 * 2. Remaining time is shown on the RIGHT of the progress bar
 * 3. Both time labels are on the SAME horizontal line as the progress bar
 * 4. The remaining time has a leading `-` sign
 * 5. The right label reflects duration - currentTime (not total duration)
 */
test.describe('Master Remote Progress Time Layout', () => {
  test('time labels are positioned horizontally around the progress bar', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Use the test hook to drive the store state directly
    console.log('=== Opening app with testMode=stores hook ===');
    await page.goto(`${BASE_URL}/?testMode=stores`);
    await page.waitForLoadState('networkidle');

    // Wait for the test hook to be exposed
    await page.waitForFunction(() => !!window.__quixTest, { timeout: 10000 });
    console.log('Test hook (window.__quixTest) is available');

    // ===== STEP 1: DRIVE REMOTE STORE STATE =====
    console.log('\n=== STEP 1: Set up remote master state ===');

    // We need to:
    // - Set isRemoteMaster = true
    // - Set remoteSlaveState with nowPlayingItem, currentTime, duration
    // - Set isRemoteMasterConnected = true (so the view doesn't show "not connected")
    // - Set remoteFullItem (so the title/episode info renders)
    await page.evaluate(() => {
      const { remoteStore, mediaStore } = window.__quixTest;

      // Build a fake TV episode
      const nowPlayingItem = {
        id: 1,
        episode_number: 1,
        season_number: 1,
        name: 'Test Episode',
        title: 'Kaiju No. 8',
        show_title: 'Kaiju No. 8',
        show_id: 1,
        backdrop_path: 'https://image.tmdb.org/t/p/original/test.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w500/test.jpg',
        runtime: 24,
        video_url: 'https://example.com/video.mp4',
      };

      const remoteFullItem = {
        id: 1,
        title: 'Kaiju No. 8',
        name: 'Kaiju No. 8',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/original/test.jpg',
        seasons: [],
      };

      // Mark as master and set the slave state.
      // currentTime = 600s (10:00), duration = 2400s (40:00) -> remaining = 1800s (30:00)
      remoteStore.isRemoteMaster = true;
      remoteStore.isRemoteMasterConnected = true;
      remoteStore.remoteSlaveState = {
        nowPlayingItem,
        currentTime: 600,
        duration: 2400,
        isPlaying: true,
      };
      remoteStore.remoteFullItem = remoteFullItem;
    });

    console.log('Remote state injected successfully');

    // ===== STEP 2: WAIT FOR THE MASTER REMOTE VIEW TO RENDER =====
    console.log('\n=== STEP 2: Wait for master remote view ===');

    // Wait for the progress bar container to appear
    const progressContainer = page.locator('#master-remote-progress-container');
    await progressContainer.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Master remote progress container is visible');

    // ===== STEP 3: VERIFY TIME LABELS ARE VISIBLE =====
    console.log('\n=== STEP 3: Verify time labels are visible ===');

    const currentTimeLocator = page.locator('#master-remote-current-time');
    const remainingTimeLocator = page.locator('#master-remote-remaining-time');
    const sliderLocator = page.locator('.video-player-slider');

    await expect(currentTimeLocator).toBeVisible({ timeout: 5000 });
    await expect(remainingTimeLocator).toBeVisible({ timeout: 5000 });
    await expect(sliderLocator).toBeVisible({ timeout: 5000 });
    console.log('PASS: Current time, slider, and remaining time are all visible');

    // ===== STEP 4: VERIFY TIME LABEL CONTENT =====
    console.log('\n=== STEP 4: Verify time label content ===');

    const currentTimeText = (await currentTimeLocator.textContent() || '').trim();
    const remainingTimeText = (await remainingTimeLocator.textContent() || '').trim();
    console.log(`Current time text: "${currentTimeText}"`);
    console.log(`Remaining time text: "${remainingTimeText}"`);

    // currentTime=600s -> "10:00"
    expect(currentTimeText).toBe('10:00');
    console.log('PASS: Current time shows 10:00 (matches 600s)');

    // remainingTime=1800s -> "-30:00" (with leading minus sign)
    expect(remainingTimeText).toBe('-30:00');
    console.log('PASS: Remaining time shows -30:00 (with leading "-" and matches 1800s)');

    // ===== STEP 5: VERIFY HORIZONTAL POSITIONING =====
    console.log('\n=== STEP 5: Verify horizontal positioning ===');

    // Get bounding boxes of all three elements
    const currentBox = await currentTimeLocator.boundingBox();
    const sliderBox = await sliderLocator.boundingBox();
    const remainingBox = await remainingTimeLocator.boundingBox();

    expect(currentBox).not.toBeNull();
    expect(sliderBox).not.toBeNull();
    expect(remainingBox).not.toBeNull();

    console.log(`Current time box:   y=${currentBox.y.toFixed(1)} x=${currentBox.x.toFixed(1)} w=${currentBox.width.toFixed(1)} h=${currentBox.height.toFixed(1)}`);
    console.log(`Slider box:         y=${sliderBox.y.toFixed(1)} x=${sliderBox.x.toFixed(1)} w=${sliderBox.width.toFixed(1)} h=${sliderBox.height.toFixed(1)}`);
    console.log(`Remaining time box: y=${remainingBox.y.toFixed(1)} x=${remainingBox.x.toFixed(1)} w=${remainingBox.width.toFixed(1)} h=${remainingBox.height.toFixed(1)}`);

    // All three elements should be on the same horizontal line.
    // We compare the vertical centers to be tolerant of slight font/height
    // differences between the time labels and the slider track.
    const currentCenterY = currentBox.y + currentBox.height / 2;
    const sliderCenterY = sliderBox.y + sliderBox.height / 2;
    const remainingCenterY = remainingBox.y + remainingBox.height / 2;

    const tolerance = 30; // px tolerance to account for slider track + thumb + label alignment
    const sameRowCurrentAndSlider = Math.abs(currentCenterY - sliderCenterY) <= tolerance;
    const sameRowSliderAndRemaining = Math.abs(sliderCenterY - remainingCenterY) <= tolerance;
    const sameRowCurrentAndRemaining = Math.abs(currentCenterY - remainingCenterY) <= tolerance;

    expect(sameRowCurrentAndSlider).toBe(true);
    expect(sameRowSliderAndRemaining).toBe(true);
    expect(sameRowCurrentAndRemaining).toBe(true);
    console.log(`PASS: All three elements are on the same horizontal line (within ${tolerance}px tolerance of vertical centers)`);

    // ===== STEP 6: VERIFY HORIZONTAL ORDER =====
    console.log('\n=== STEP 6: Verify horizontal order ===');

    // Horizontal order: current time is to the LEFT of slider, slider is to the LEFT of remaining time
    expect(currentBox.x + currentBox.width).toBeLessThanOrEqual(sliderBox.x);
    expect(sliderBox.x + sliderBox.width).toBeLessThanOrEqual(remainingBox.x);
    console.log('PASS: Horizontal order is correct: [current time] < [slider] < [remaining time]');

    // ===== STEP 7: TAKE SCREENSHOT FOR MANUAL REVIEW =====
    console.log('\n=== STEP 7: Take final screenshot ===');
    await page.screenshot({ path: 'master-remote-progress-time-layout.png', fullPage: true });
    console.log('Screenshot saved: master-remote-progress-time-layout.png');

    // ===== STEP 8: VERIFY NO CONSOLE ERRORS =====
    console.log('\n=== STEP 8: Verify no console errors ===');
    if (consoleErrors.length > 0) {
      console.log(`FAIL: Found ${consoleErrors.length} console error(s):`);
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('PASS: No console errors');
    }
    expect(consoleErrors).toEqual([]);

    await context.close();
    console.log('\n=== TEST COMPLETE ===');
  });
});
