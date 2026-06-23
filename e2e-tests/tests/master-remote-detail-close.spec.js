const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const KAIJU_SHOW_NAME = 'Kaiju No. 8';

/**
 * Regression test for: closing the show detail view on the remote master
 * requires multiple clicks of the X button.
 *
 * Root cause: `mediaStore.closeDetail()` only cleared the local `selectedItem`
 * field. On the master the detail view is driven by `_masterUiSelectedItem`,
 * and the master never pushes `history.pushState({detailViewOpen: ...})` for
 * the detail view, so the `history.back()` path was never triggered and the
 * master's UI state was never cleared.
 *
 * The fix routes `closeDetail()` to a master-specific branch that clears
 * `_masterUiSelectedItem` and tells the slave to do the same.
 */
test.describe('Master Remote Detail Close', () => {
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

  // Allow up to 2 minutes for the full master-slave connection setup,
  // which is slow in this environment.
  test.setTimeout(180000);

  test('detail view closes on the first click of the X button', async ({ browser }) => {
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

    // ===== STEP 1: MASTER OPENS QR SCANNER =====
    console.log('\n=== STEP 1: Master Opens QR Scanner ===');

    const masterBtn = masterPage.locator('#master-button');
    await masterBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Bypass the Header's overlapping transparent MUI element by dispatching
    // a real click event directly to the DOM node.
    await masterBtn.evaluate((el) => el.click());

    await masterPage.waitForTimeout(1500);

    const codeInput = masterPage.locator('#master-slave-code-input');
    await expect(codeInput).toBeVisible({ timeout: 10000 });

    // ===== STEP 2: SLAVE ENABLES SMART TV MODE =====
    console.log('\n=== STEP 2: Slave Enables SmartTV Mode ===');

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

    // ===== STEP 3: MANUAL CONNECTION =====
    console.log('\n=== STEP 3: Manual Connection ===');

    await codeInput.fill(slaveCode);

    const connectBtn = masterPage.locator('#connect-master-slave');
    await connectBtn.waitFor({ state: 'visible', timeout: 10000 });
    await connectBtn.evaluate((el) => el.click());

    await masterPage.waitForTimeout(3000);
    console.log('Connection attempt completed');

    // After connecting, a MediaSyncModal opens. Dismiss it so we can interact
    // with the rest of the app.
    const mediaSyncCloseBtn = masterPage.getByRole('button', { name: /close/i }).first();
    if (await mediaSyncCloseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mediaSyncCloseBtn.evaluate((el) => el.click());
      await masterPage.waitForTimeout(500);
      console.log('MediaSyncModal dismissed');
    }

    // ===== STEP 4: MASTER OPENS THE SHOW DETAIL VIEW =====
    console.log('\n=== STEP 4: Master Opens Show Detail ===');

    const kaijuCard = masterPage.locator(`img[alt="${KAIJU_SHOW_NAME}"]`).first();
    await kaijuCard.waitFor({ state: 'visible', timeout: 10000 });
    await kaijuCard.evaluate((el) => el.click());
    await masterPage.waitForTimeout(2500);

    // ===== STEP 5: WAIT FOR THE X BUTTON =====
    console.log('\n=== STEP 5: Wait for Detail View X Button ===');

    const closeButton = masterPage.locator('#master-remote-detail-close-button');
    await closeButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Detail view is visible (X button present)');

    // Sanity check: confirm we are indeed on the detail view (X button visible).
    await expect(closeButton).toBeVisible();

    // ===== STEP 6: CLICK X BUTTON ONCE =====
    console.log('\n=== STEP 6: Click X button ONCE ===');

    // Use evaluate(el => el.click()) to dispatch a real DOM click event,
    // bypassing any overlay that may be intercepting pointer events.
    await closeButton.evaluate((el) => el.click());
    console.log('X button clicked once');

    // Give the view a short settle period.
    await masterPage.waitForTimeout(1500);

    // ===== STEP 7: VERIFY THE DETAIL VIEW IS GONE =====
    console.log('\n=== STEP 7: Verify Detail View Closed ===');

    const closeButtonStillVisible = await closeButton.isVisible().catch(() => false);
    // The detail view's root container is rendered with zIndex 1200 and uses
    // `position: fixed; inset: 0;`. The X button's parent Box lives inside it.
    // We don't have a stable id on the root itself, so we re-query the X
    // button (id-based) to assert it's gone.
    const seriesGridVisible = await masterPage.locator('#grid-view-series').isVisible().catch(() => false);

    console.log(`After 1st click - X button visible: ${closeButtonStillVisible}`);
    console.log(`After 1st click - grid-view-series visible: ${seriesGridVisible}`);

    // The detail view should be gone after a single click.
    expect(closeButtonStillVisible).toBe(false);

    // Take a screenshot for debugging.
    await masterPage.screenshot({ path: 'master-after-detail-close.png', fullPage: true });

    console.log('\n=== TEST PASSED: detail view closes on the first click ===');
  });
});
