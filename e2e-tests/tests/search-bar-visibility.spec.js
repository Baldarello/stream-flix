const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';

test.describe('Search Bar Visibility', () => {
  let context;
  let page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context?.close();
  });

  /**
   * Test: Search bar is visible and functional when search view is active
   * 
   * This test verifies:
   * 1. Clicking search icon shows the search bar
   * 2. Search input field is functional and can accept text
   * 3. Search results are displayed when typing a query
   * 4. Clicking the close button returns to the home view
   */
  test('search bar is visible and functional', async () => {
    // Step 1: Open the application
    console.log('=== Opening application ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Log console messages
    page.on('console', msg => {
      console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    // Wait for the header to be visible
    await page.waitForSelector('.MuiAppBar-root', { timeout: 10000 });
    console.log('Header is visible');

    // Step 2: Click the search icon to activate search
    console.log('=== Clicking search icon ===');
    const searchButton = page.locator('button').filter({ has: page.locator('svg[data-testid="SearchIcon"]') }).first();
    await searchButton.waitFor({ state: 'visible', timeout: 5000 });
    await searchButton.click();
    console.log('Clicked search icon');
    
    // Wait for search view to be active
    await page.waitForTimeout(500);

    // Step 3: Verify search prompt is visible
    console.log('=== Verifying search prompt ===');
    const searchPrompt = page.locator('#search-prompt');
    await expect(searchPrompt).toBeVisible({ timeout: 5000 });
    console.log('Search prompt is visible');

    // Step 4: Verify search input field is visible (within Header)
    console.log('=== Verifying search input field ===');
    const searchInput = page.locator('input[placeholder*="Cerca"], input[placeholder*="Cerca"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    console.log('Search input field is visible');

    // Step 5: Type in the search bar
    console.log('=== Typing in search bar ===');
    await searchInput.fill('One Piece');
    console.log('Typed "One Piece" in search bar');
    
    // Wait for search results to load (debounce is 300ms)
    await page.waitForTimeout(1000);

    // Step 6: Verify search results are displayed
    console.log('=== Verifying search results ===');
    const searchResults = page.locator('#search-results');
    await expect(searchResults).toBeVisible({ timeout: 10000 });
    console.log('Search results are visible');

    // Step 7: Click the close button to return to home view
    console.log('=== Clicking close button ===');
    const closeButton = page.locator('button').filter({ has: page.locator('svg[data-testid="CloseIcon"]') }).first();
    await closeButton.waitFor({ state: 'visible', timeout: 5000 });
    await closeButton.click();
    console.log('Clicked close button');
    
    // Wait for search view to close
    await page.waitForTimeout(500);

    // Step 8: Verify we're back to home view
    console.log('=== Verifying home view is visible ===');
    const homeHero = page.locator('#home-hero');
    await expect(homeHero).toBeVisible({ timeout: 5000 });
    console.log('Home view is visible - search closed successfully');

    // Take screenshot for verification
    await page.screenshot({ path: 'search-bar-test.png' });
    console.log('Screenshot saved: search-bar-test.png');
  });
});
