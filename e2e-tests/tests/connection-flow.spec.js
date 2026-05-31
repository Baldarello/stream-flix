const { test, expect, chromium } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const REMOTE_URL = `${BASE_URL}/remote`;
const TVPLAYER_URL = `${BASE_URL}/tvPlayer?slave=true`;

test.describe('Master-Slave Connection Flow', () => {
  let masterContext;
  let slaveContext;

  test.beforeEach(async ({ browser }) => {
    // Create master browser (normal mode)
    masterContext = await browser.newContext();
    
    // Create slave browser (incognito mode)
    slaveContext = await browser.newContext();
  });

  test.afterEach(async () => {
    await masterContext?.close();
    await slaveContext?.close();
  });

  test('complete master-slave connection flow', async ({ browser }) => {
    // Step 1: Open master page (/remote)
    const masterPage = await masterContext.newPage();
    console.log('=== MASTER: Opening /remote ===');
    await masterPage.goto(REMOTE_URL);
    await masterPage.waitForLoadState('networkidle');
    
    // Log all console messages from master
    masterPage.on('console', msg => {
      console.log(`[MASTER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    // Step 2: Open slave page (/tvPlayer) in incognito
    const slavePage = await slaveContext.newPage();
    console.log('=== SLAVE: Opening /tvPlayer ===');
    await slavePage.goto(TVPLAYER_URL);
    await slavePage.waitForLoadState('networkidle');
    
    // Log all console messages from slave
    slavePage.on('console', msg => {
      console.log(`[SLAVE CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Step 3: Wait for slave to initialize and receive shortCode
    console.log('=== WAITING FOR SLAVE INITIALIZATION ===');
    await slavePage.waitForSelector('#shortCodeContainer', { timeout: 10000 });
    
    // Wait a bit more for shortCode to be populated
    await slavePage.waitForTimeout(2000);
    
    // Get the shortCode from slave
    const shortCode = await slavePage.locator('#shortCodeContainer').textContent();
    console.log(`=== SLAVE shortCode: "${shortCode}" ===`);
    
    expect(shortCode).toBeTruthy();
    expect(shortCode.length).toBeGreaterThan(0);
    
    // Step 4: Copy shortCode to master and connect
    console.log('=== MASTER: Entering shortCode and connecting ===');
    const shortCodeInput = masterPage.locator('input[placeholder*="code" i], input[id*="code" i], input[id*="shortcode" i]').first();
    
    if (await shortCodeInput.isVisible()) {
      await shortCodeInput.fill(shortCode);
      console.log(`[MASTER] Filled shortCode: ${shortCode}`);
    } else {
      // Try finding by label or any input
      const anyInput = masterPage.locator('input[type="text"], input:not([type="hidden"])').first();
      if (await anyInput.isVisible()) {
        await anyInput.fill(shortCode);
        console.log(`[MASTER] Filled shortCode in generic input: ${shortCode}`);
      }
    }
    
    // Find and click connect button
    const connectButton = masterPage.locator('button:has-text("Connettiti"), button:has-text("Connect"), button[id*="connect" i]').first();
    
    if (await connectButton.isVisible()) {
      console.log('[MASTER] Clicking connect button');
      await connectButton.click();
    }
    
    // Wait for connection to establish
    await masterPage.waitForTimeout(3000);
    
    // Step 5: Analyze logs for connection success/failure
    console.log('=== ANALYZING CONNECTION RESULTS ===');
    
    // Check for error messages in master console
    const masterErrors = [];
    masterPage.on('console', msg => {
      if (msg.type() === 'error') {
        masterErrors.push(msg.text());
      }
    });
    
    // Wait a bit more and capture any network errors
    await masterPage.waitForTimeout(2000);
    
    // Take screenshots for debugging
    await masterPage.screenshot({ path: 'master-final-state.png' });
    await slavePage.screenshot({ path: 'slave-final-state.png' });
    
    console.log('=== TEST COMPLETE ===');
    console.log('Screenshots saved: master-final-state.png, slave-final-state.png');
    
    // Output network requests for analysis
    console.log('\n=== MASTER NETWORK REQUESTS ===');
    masterPage.on('request', request => {
      console.log(`[MASTER REQUEST] ${request.method()} ${request.url()}`);
    });
    
    console.log('\n=== SLAVE NETWORK REQUESTS ===');
    slavePage.on('request', request => {
      console.log(`[SLAVE REQUEST] ${request.method()} ${request.url()}`);
    });
  });

  test('verify slave initialization with shortCode', async ({ browser }) => {
    const slavePage = await slaveContext.newPage();
    
    console.log('=== SLAVE: Opening /tvPlayer for initialization test ===');
    await slavePage.goto(TVPLAYER_URL);
    await slavePage.waitForLoadState('networkidle');
    
    // Log all console messages
    slavePage.on('console', msg => {
      console.log(`[SLAVE INIT ${msg.type()}]: ${msg.text()}`);
    });
    
    // Log network requests
    slavePage.on('request', request => {
      console.log(`[SLAVE REQUEST]: ${request.method()} ${request.url()}`);
    });
    
    slavePage.on('response', response => {
      console.log(`[SLAVE RESPONSE]: ${response.status()} ${response.url()}`);
    });
    
    // Wait for shortCode container
    console.log('Waiting for #shortCodeContainer...');
    const shortCodeElement = slavePage.locator('#shortCodeContainer');
    await shortCodeElement.waitFor({ timeout: 10000 });
    
    // Wait for shortCode to be populated
    await slavePage.waitForTimeout(3000);
    
    const shortCode = await shortCodeElement.textContent();
    console.log(`=== SLAVE shortCodeContainer content: "${shortCode}" ===`);
    
    // Verify shortCode is not empty
    expect(shortCode).toBeTruthy();
    expect(shortCode.trim().length).toBeGreaterThan(0);
    
    // Take screenshot
    await slavePage.screenshot({ path: 'slave-init-state.png' });
  });
});
