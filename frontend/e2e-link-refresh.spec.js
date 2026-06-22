const { test, expect, chromium } = require('@playwright/test');

test.describe('LinkEpisodesModal realtime refresh', () => {
  let browser;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('App loads', async () => {
    await page.goto('http://host.docker.internal:3002/');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    const title = await page.title();
    console.log('Page title:', title);
  });
});
