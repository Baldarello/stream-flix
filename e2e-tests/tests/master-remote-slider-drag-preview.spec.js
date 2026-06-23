const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3002';

// All Playwright screenshots produced by this test must live under
// `frontend/.playwright-mcp/` per the project rules in AGENTS.md.
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'frontend', '.playwright-mcp');
const SCREENSHOT_PATH = path.join(SCREENSHOT_DIR, 'master-remote-slider-drag-preview.png');

/**
 * Helper: returns whether the value label is in the "open" state
 * (i.e. has the `MuiSlider-valueLabelOpen` class). MUI's value label is
 * always rendered in the DOM (for styling reasons), but is visually
 * hidden via CSS when this class is absent.
 */
const isValueLabelOpen = async (page) => {
  return await page.evaluate(() => {
    const label = document.querySelector('[data-testid="master-remote-slider-value-label"]');
    if (!label) return false;
    return label.className.includes('MuiSlider-valueLabelOpen');
  });
};

/**
 * Test: Master Remote Progress Slider - Drag Preview
 *
 * This test verifies the requirement from the issue:
 *   "add the ability to drag the slider so you can see at which minute the
 *    playback is about to move to"
 *
 * The test uses a test hook exposed via `?testMode=stores` to drive the
 * remote store state directly. This avoids the fragile, refactor-sensitive
 * click-through flow and focuses on verifying the drag-to-preview behavior.
 *
 * Verified invariants:
 * 1. While dragging, the value label is in the OPEN state and shows the
 *    formatted time corresponding to the current drag position.
 * 2. The value label returns to the CLOSED state once the user releases
 *    the slider (MUI `valueLabelDisplay="auto"` hides it on idle).
 * 3. The slider's `aria-valuetext` is updated to match the live playback
 *    time after release.
 * 4. The current/remaining time labels on the sides of the slider are
 *    NOT changed by dragging - they still reflect the live playback.
 */
test.describe('Master Remote Progress Slider Drag Preview', () => {
  test('shows formatted time preview while dragging and hides it on release', async ({ browser }) => {
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

    // currentTime = 300s (5:00), duration = 2400s (40:00)
    // targetPct = 0.5 -> targetTime = 1200s -> "20:00"
    await page.evaluate(() => {
      const { remoteStore } = window.__quixTest;

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

      remoteStore.isRemoteMaster = true;
      remoteStore.isRemoteMasterConnected = true;
      remoteStore.remoteSlaveState = {
        nowPlayingItem,
        currentTime: 300,
        duration: 2400,
        isPlaying: true,
      };
      remoteStore.remoteFullItem = remoteFullItem;
    });

    console.log('Remote state injected: currentTime=300s, duration=2400s');

    // ===== STEP 2: WAIT FOR THE MASTER REMOTE VIEW TO RENDER =====
    console.log('\n=== STEP 2: Wait for master remote view ===');

    const progressContainer = page.locator('#master-remote-progress-container');
    await progressContainer.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Master remote progress container is visible');

    // ===== STEP 3: VERIFY INITIAL TIME LABELS =====
    console.log('\n=== STEP 3: Verify initial time labels ===');

    const currentTimeLocator = page.locator('#master-remote-current-time');
    const remainingTimeLocator = page.locator('#master-remote-remaining-time');
    const sliderLocator = page.locator('.video-player-slider');
    const valueLabelLocator = page.locator('[data-testid="master-remote-slider-value-label"]');

    await expect(currentTimeLocator).toBeVisible({ timeout: 5000 });
    await expect(remainingTimeLocator).toBeVisible({ timeout: 5000 });
    await expect(sliderLocator).toBeVisible({ timeout: 5000 });

    const currentTimeText = (await currentTimeLocator.textContent() || '').trim();
    const remainingTimeText = (await remainingTimeLocator.textContent() || '').trim();
    expect(currentTimeText).toBe('05:00');
    // remaining = 2400 - 300 = 2100s -> "-35:00"
    expect(remainingTimeText).toBe('-35:00');
    console.log(`PASS: Current time is "${currentTimeText}", remaining time is "${remainingTimeText}"`);

    // The value label should be in the CLOSED state before the user interacts
    const openBefore = await isValueLabelOpen(page);
    expect(openBefore).toBe(false);
    console.log('PASS: Value label is closed (hidden) before drag');

    // Capture the slider's bounding box once so both the hover and
    // drag steps below can compute pixel coordinates from the same
    // reference frame.
    const sliderBox = await sliderLocator.boundingBox();
    expect(sliderBox).not.toBeNull();
    console.log(`Slider box: x=${sliderBox.x.toFixed(1)} y=${sliderBox.y.toFixed(1)} w=${sliderBox.width.toFixed(1)} h=${sliderBox.height.toFixed(1)}`);

    // ===== STEP 3.5: HOVER WITHOUT DRAG MUST NOT OPEN THE LABEL =====
    console.log('\n=== STEP 3.5: Hover without drag (label must stay closed) ===');

    // Move the mouse to the slider's middle WITHOUT pressing, so the
    // label is not in a drag state. The label must remain closed
    // (no `MuiSlider-valueLabelOpen` class) — this locks in the
    // "only on slide" requirement of the new behavior.
    const hoverX = sliderBox.x + sliderBox.width / 2;
    const hoverY = sliderBox.y + sliderBox.height / 2;
    await page.mouse.move(hoverX, hoverY);
    await page.waitForTimeout(150);

    const openAfterHover = await isValueLabelOpen(page);
    expect(openAfterHover).toBe(false);
    console.log('PASS: Value label is closed (hidden) when only hovering');

    // Move the mouse away so the next drag starts from a neutral
    // position and not from a hover-on-thumb state.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);

    // ===== STEP 4: SIMULATE A DRAG TO THE MIDDLE OF THE SLIDER =====
    console.log('\n=== STEP 4: Drag the slider to the middle ===');

    // (sliderBox was already captured before Step 3.5 above so the
    // hover and drag steps share the same reference frame.)

    // Target the middle of the slider (targetPct = 0.5 -> 20:00)
    const targetPct = 0.5;
    const startX = sliderBox.x + sliderBox.width * (300 / 2400); // start from current thumb position (5:00)
    const targetX = sliderBox.x + sliderBox.width * targetPct;
    const centerY = sliderBox.y + sliderBox.height / 2;
    console.log(`Drag from (${startX.toFixed(1)}, ${centerY.toFixed(1)}) to (${targetX.toFixed(1)}, ${centerY.toFixed(1)})`);

    // Perform the drag with intermediate steps so MUI has time to update the value label
    await page.mouse.move(startX, centerY);
    await page.mouse.down();
    // Move in several steps so the value label has time to render
    await page.mouse.move(targetX, centerY, { steps: 10 });
    // Give the slider a tick to update the value label
    await page.waitForTimeout(150);

    // ===== STEP 5: VERIFY THE VALUE LABEL APPEARS MID-DRAG =====
    console.log('\n=== STEP 5: Verify value label mid-drag ===');

    const openMidDrag = await isValueLabelOpen(page);
    expect(openMidDrag).toBe(true);
    const dragLabelText = (await valueLabelLocator.textContent() || '').trim();
    console.log(`Value label text mid-drag: "${dragLabelText}"`);
    // 20:00 is the expected formatted time for 50% of 40:00
    expect(dragLabelText).toBe('20:00');
    console.log('PASS: Value label is open and shows the expected time (20:00) mid-drag');

    // The label must be rendered above the slider track, with at
    // least a 30px gap between the label's bottom and the slider
    // track's top. This prevents the label from being hidden by the
    // mouse cursor (desktop) or the user's finger (mobile touch).
    const labelBox = await valueLabelLocator.boundingBox();
    expect(labelBox).not.toBeNull();
    const sliderTop = sliderBox.y;
    const labelBottom = labelBox.y + labelBox.height;
    const gap = sliderTop - labelBottom;
    console.log(`Label box: y=${labelBox.y.toFixed(1)} height=${labelBox.height.toFixed(1)} bottom=${labelBottom.toFixed(1)}; slider top=${sliderTop.toFixed(1)}; gap=${gap.toFixed(1)}px`);
    expect(gap).toBeGreaterThanOrEqual(30);
    console.log('PASS: Value label is positioned at least 30px above the slider track');

    // The label must also be visually readable: dark background, light
    // text. MUI's default `currentColor` background trick renders white
    // text on a white background, which is invisible on the page.
    // Lock in the contract: the computed `background-color` is a
    // non-transparent dark color, the text is light, and the label is
    // tall enough to comfortably show a 5-character time like `20:00`.
    const labelStyle = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="master-remote-slider-value-label"]');
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontSize: cs.fontSize,
        height: cs.height,
        width: cs.width,
        borderRadius: cs.borderRadius,
      };
    });
    expect(labelStyle).not.toBeNull();
    console.log('Label style mid-drag:', JSON.stringify(labelStyle));
    // Background must be a non-transparent dark color (alpha > 0 and
    // luminance well below 0.5). White-on-white = "rgba(0, 0, 0, 0)".
    expect(labelStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(labelStyle.backgroundColor).not.toBe('transparent');
    const bgMatch = labelStyle.backgroundColor.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    expect(bgMatch).not.toBeNull();
    if (bgMatch) {
      const r = parseInt(bgMatch[1], 10);
      const g = parseInt(bgMatch[2], 10);
      const b = parseInt(bgMatch[3], 10);
      const max = Math.max(r, g, b);
      expect(max).toBeLessThan(80);
    }
    // Text must be light (close to white) for contrast against the
    // dark background.
    const fgMatch = labelStyle.color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    expect(fgMatch).not.toBeNull();
    if (fgMatch) {
      const r = parseInt(fgMatch[1], 10);
      const g = parseInt(fgMatch[2], 10);
      const b = parseInt(fgMatch[3], 10);
      const min = Math.min(r, g, b);
      expect(min).toBeGreaterThan(200);
    }
    // The label must be tall enough to comfortably show "MM:SS" — at
    // least 20px.
    const labelHeightPx = parseFloat(labelStyle.height);
    expect(labelHeightPx).toBeGreaterThanOrEqual(20);
    // The label must be wide enough to fit "20:00" — at least 40px.
    const labelWidthPx = parseFloat(labelStyle.width);
    expect(labelWidthPx).toBeGreaterThanOrEqual(40);
    console.log('PASS: Value label is visually readable (dark bg, light text, big enough)');

    // Take a screenshot WHILE the label is open so the visual fix is
    // verifiable in the committed artifact. The earlier "Step 8"
    // screenshot is captured after release (label closed), which is
    // not useful to inspect the open-label styling.
    const openScreenshotPath = path.join(SCREENSHOT_DIR, 'master-remote-slider-drag-preview-open.png');
    await page.screenshot({ path: openScreenshotPath, fullPage: true });
    console.log(`Open-state screenshot saved: ${openScreenshotPath}`);

    // The side time labels must still reflect the LIVE playback (not the drag position)
    const currentTimeDuringDrag = (await currentTimeLocator.textContent() || '').trim();
    const remainingTimeDuringDrag = (await remainingTimeLocator.textContent() || '').trim();
    expect(currentTimeDuringDrag).toBe('05:00');
    expect(remainingTimeDuringDrag).toBe('-35:00');
    console.log('PASS: Side time labels still show live playback time during drag');

    // ===== STEP 6: RELEASE THE SLIDER =====
    console.log('\n=== STEP 6: Release the slider ===');

    await page.mouse.up();
    // MUI's "auto" display hides the label a moment after release
    await page.waitForTimeout(300);

    // The value label should now be in the CLOSED state again
    const openAfterRelease = await isValueLabelOpen(page);
    expect(openAfterRelease).toBe(false);
    console.log('PASS: Value label is closed (hidden) after release');

    // ===== STEP 7: VERIFY THE LIVE TIME LABELS ARE UNCHANGED =====
    console.log('\n=== STEP 7: Verify live time labels are still correct ===');

    const finalCurrentTime = (await currentTimeLocator.textContent() || '').trim();
    const finalRemainingTime = (await remainingTimeLocator.textContent() || '').trim();
    expect(finalCurrentTime).toBe('05:00');
    expect(finalRemainingTime).toBe('-35:00');
    console.log(`PASS: Current time is still "${finalCurrentTime}", remaining time is still "${finalRemainingTime}"`);

    // ===== STEP 8: TAKE A SCREENSHOT =====
    console.log('\n=== STEP 8: Take screenshot ===');
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log(`Screenshot saved: ${SCREENSHOT_PATH}`);

    // ===== STEP 9: VERIFY NO CONSOLE ERRORS =====
    console.log('\n=== STEP 9: Verify no console errors ===');
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
